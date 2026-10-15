const DATABASE = `fray-collection`;
const STORE = `captures`;
const LIMIT = 12;

// A capture is persisted only through keep(). Opening the collection never saves a frame.
export function createCollection({ openDialog, closeDialog, toast, onSelect }) {
  const toggle = document.querySelector(`.collection-toggle`);
  const count = toggle.querySelector(`.collection-count`);
  const sheet = document.querySelector(`.collection-sheet`);
  const close = sheet.querySelector(`.collection-close`);
  const grid = sheet.querySelector(`.collection-grid`);
  const empty = sheet.querySelector(`.collection-empty`);
  const status = sheet.querySelector(`.collection-status`);
  const urls = new Set();
  let databasePromise;
  let writeQueue = Promise.resolve();
  let renderVersion = 0;
  let disposed = false;
  let pendingRemoval = null;
  let channel;

  function database() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      const timer = setTimeout(() => fail(new Error(`Storage did not respond`)), 6000);
      try {
        if (!globalThis.indexedDB) throw new Error(`Browser storage is unavailable`);
        const request = indexedDB.open(DATABASE, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE))
            request.result.createObjectStore(STORE, { keyPath: `id` });
        };
        request.onerror = () => fail(request.error);
        request.onblocked = () => fail(new Error(`Storage is open in another tab`));
        request.onsuccess = () => {
          const db = request.result;
          if (settled || disposed) {
            db.close();
            fail(new Error(`Collection closed`));
            return;
          }
          settled = true;
          clearTimeout(timer);
          db.onversionchange = () => {
            db.close();
            databasePromise = undefined;
          };
          resolve(db);
        };
      } catch (error) {
        fail(error);
      }
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
    return databasePromise;
  }

  async function transact(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      let result;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error || new Error(`Storage operation was cancelled`));
      transaction.onerror = () => {}; // The abort event reports the final transaction error.
      try {
        operation(transaction.objectStore(STORE), (value) => {
          result = value;
        });
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }

  function write(operation) {
    const pending = writeQueue.then(operation);
    writeQueue = pending.catch(() => {});
    return pending;
  }

  function clearThumbnails() {
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
    grid.replaceChildren();
    pendingRemoval = null;
  }

  function updateCount(total) {
    count.textContent = String(total);
    count.hidden = total === 0;
    toggle.setAttribute(`aria-label`, `Open collection, ${total} saved ${total === 1 ? `piece` : `pieces`}`);
  }

  function number(value) {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  function label(record) {
    return typeof record.fabric === `string` && record.fabric.trim() ? record.fabric : `Fabric`;
  }

  function date(record) {
    const value = new Date(record.createdAt);
    return Number.isFinite(value.getTime())
      ? value.toLocaleDateString(undefined, { month: `short`, day: `numeric`, year: `numeric` })
      : `Saved piece`;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function resetRemoval() {
    if (!pendingRemoval) return;
    const { button, cancel, card, name } = pendingRemoval;
    button.textContent = `Remove`;
    button.setAttribute(`aria-label`, `Remove ${name} from collection`);
    cancel.hidden = true;
    delete card.dataset.confirming;
    pendingRemoval = null;
  }

  async function remove(record, button) {
    button.disabled = true;
    button.textContent = `Removing…`;
    pendingRemoval.cancel.disabled = true;
    try {
      await write(() =>
        transact(`readwrite`, (store) => {
          store.delete(record.id);
        }),
      );
      broadcast();
      await refresh();
      if (!sheet.hidden) (grid.querySelector(`.collection-open`) || close).focus();
      toast(`Removed from your collection.`);
    } catch (error) {
      button.disabled = false;
      if (pendingRemoval) pendingRemoval.cancel.disabled = false;
      resetRemoval();
      status.textContent = `This piece could not be removed. Please try again.`;
      toast(`Could not remove this piece. Your saved collection has not changed.`);
    }
  }

  function render(records) {
    clearThumbnails();
    const fragment = document.createDocumentFragment();
    for (const record of records) {
      const name = label(record);
      const savedDate = date(record);
      const threads = `${number(record.score).toLocaleString()} threads`;
      const card = element(`article`, `collection-item`);
      const open = element(`button`, `collection-open`);
      open.type = `button`;
      open.setAttribute(`aria-label`, `Open ${name}, ${threads}, saved ${savedDate}`);
      const image = element(`img`, `collection-image`);
      image.alt = ``;
      image.loading = `lazy`;
      image.decoding = `async`;
      if (record.blob instanceof Blob) {
        image.src = URL.createObjectURL(record.blob);
        urls.add(image.src);
      }
      const meta = element(`span`, `collection-meta`);
      meta.append(
        element(`span`, `collection-title`, name),
        element(`span`, `collection-detail`, `${threads} · ${savedDate}`),
      );
      open.append(image, meta);
      open.addEventListener(`click`, () => onSelect(record, toggle));
      const actions = element(`div`, `collection-actions`);
      const button = element(`button`, `collection-delete`, `Remove`);
      button.type = `button`;
      button.setAttribute(`aria-label`, `Remove ${name} from collection`);
      const cancel = element(`button`, `collection-cancel`, `Cancel`);
      cancel.type = `button`;
      cancel.hidden = true;
      cancel.addEventListener(`click`, () => {
        resetRemoval();
        button.focus();
        status.textContent = `${records.length} of ${LIMIT} pieces saved on this browser.`;
      });
      button.addEventListener(`click`, () => {
        if (pendingRemoval?.button === button) {
          void remove(record, button);
          return;
        }
        resetRemoval();
        pendingRemoval = { button, cancel, card, name };
        button.textContent = `Remove?`;
        button.setAttribute(`aria-label`, `Confirm removal of ${name} from collection`);
        cancel.hidden = false;
        card.dataset.confirming = `true`;
        status.textContent = `Select Remove? again to remove ${name}, or Cancel to keep it.`;
      });
      actions.append(button, cancel);
      card.append(open, actions);
      fragment.append(card);
    }
    grid.append(fragment);
    empty.hidden = records.length > 0;
    grid.hidden = records.length === 0;
    status.textContent = records.length
      ? `${records.length} of ${LIMIT} pieces saved on this browser.`
      : `Keep a snapshot to begin your collection. Nothing is uploaded.`;
  }

  async function refresh() {
    const version = ++renderVersion;
    try {
      const records = await transact(`readonly`, (store, done) => {
        const request = store.getAll();
        request.onsuccess = () => done(request.result);
      });
      if (disposed || version !== renderVersion) return;
      records.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      updateCount(records.length);
      if (!sheet.hidden) render(records);
    } catch (error) {
      if (disposed || version !== renderVersion) return;
      // Do not substitute a misleading empty collection when storage cannot be read.
      count.hidden = true;
      toggle.setAttribute(`aria-label`, `Open collection`);
      if (!sheet.hidden) {
        clearThumbnails();
        grid.hidden = true;
        empty.hidden = true;
        status.textContent = `Your collection could not be opened in this browser. Try again, or use Save PNG to download a snapshot.`;
      }
    }
  }

  async function keep({ blob, fabric, fabricKey, mount, score, seconds, kind = `image` }) {
    if (disposed) return false;
    if (!(blob instanceof Blob) || !blob.size) {
      toast(`There is no snapshot to keep yet. Take a snapshot and try again.`);
      return false;
    }
    const record = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      blob,
      fabric: typeof fabric === `string` ? fabric : `Fabric`,
      ...(typeof fabricKey === `string` ? { fabricKey } : {}),
      ...([`frame`, `hanging`].includes(mount) ? { mount } : {}),
      score: number(score),
      seconds: Number.isFinite(seconds) ? Math.max(0, seconds) : 0,
      kind: kind === `frame` ? `frame` : `image`,
      createdAt: Date.now(),
    };
    try {
      const saved = await write(() =>
        transact(`readwrite`, (store, done) => {
          // Count and add share one transaction, so another tab cannot exceed the limit.
          const request = store.count();
          request.onsuccess = () => {
            if (request.result >= LIMIT) {
              done(false);
              return;
            }
            store.add(record);
            done(true);
          };
        }),
      );
      if (!saved) {
        await refresh();
        toast(`Your collection has ${LIMIT} pieces. Open Collection and remove one before keeping another.`, 6000);
        return false;
      }
      broadcast();
      await refresh();
      toast(`Kept in your collection. Saved only in this browser.`);
      return true;
    } catch (error) {
      const message =
        error?.name === `QuotaExceededError`
          ? `Your browser has no storage space for this piece. Use Save PNG, or remove a piece from Collection.`
          : `This browser could not keep the piece. Use Save PNG to download it instead.`;
      toast(message, 6000);
      return false;
    }
  }

  function open(opener = toggle) {
    if (disposed) return;
    empty.hidden = true;
    grid.hidden = true;
    status.textContent = `Opening your collection…`;
    openDialog(sheet, opener, close);
    void refresh();
  }

  function broadcast() {
    try {
      channel?.postMessage(`changed`);
    } catch {}
  }

  const onToggle = () => open(toggle);
  const onClose = () => closeDialog();
  const onBackdrop = (event) => {
    if (event.target === sheet) closeDialog();
  };
  const onFocus = () => void refresh();
  toggle.addEventListener(`click`, onToggle);
  close.addEventListener(`click`, onClose);
  sheet.addEventListener(`pointerdown`, onBackdrop);
  window.addEventListener(`focus`, onFocus);
  const observer = new MutationObserver(() => {
    if (sheet.hidden) {
      renderVersion++;
      clearThumbnails();
    }
  });
  observer.observe(sheet, { attributes: true, attributeFilter: [`hidden`] });
  try {
    channel = new BroadcastChannel(DATABASE);
    channel.onmessage = () => void refresh();
  } catch {}
  void refresh();

  return {
    keep,
    open,
    refresh,
    dispose() {
      disposed = true;
      renderVersion++;
      clearThumbnails();
      observer.disconnect();
      channel?.close();
      toggle.removeEventListener(`click`, onToggle);
      close.removeEventListener(`click`, onClose);
      sheet.removeEventListener(`pointerdown`, onBackdrop);
      window.removeEventListener(`focus`, onFocus);
      databasePromise?.then((db) => db.close()).catch(() => {});
    },
  };
}
