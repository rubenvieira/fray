// Only native channel copies run on the page. Mixing, filtering, and normalization
// happen in a short-lived worker while the trusted audio session is already live.
export function prepareRecordedTearSource(
  audio,
  {
    timeoutMs = 15000,
    createWorker = () => new Worker(new URL(`./audio-preparation-worker.js`, import.meta.url), { type: `module` }),
  } = {},
) {
  return new Promise((resolve, reject) => {
    let worker,
      timer,
      settled = false;
    function finish(error, source) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      error ? reject(error) : resolve(source);
    }
    try {
      worker = createWorker();
      worker.onmessage = ({ data }) => {
        const source = data?.source;
        if (data?.error) finish(Error(data.error));
        else if (
          !(source?.pcm instanceof Float32Array) ||
          !Array.isArray(source.starts) ||
          !Number.isFinite(source.level)
        )
          finish(Error(`Invalid prepared tear recording`));
        else finish(null, source);
      };
      worker.onerror = (event) => {
        event.preventDefault?.();
        finish(Error(event.message || `Tear recording worker failed`));
      };
      worker.onmessageerror = () => finish(Error(`Tear recording could not be transferred`));
      timer = setTimeout(() => finish(Error(`Tear recording preparation timed out`)), timeoutMs);
      const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => {
        const copy = new Float32Array(audio.length);
        audio.copyFromChannel(copy, index);
        return copy;
      });
      worker.postMessage(
        { channels, sampleRate: audio.sampleRate },
        channels.map((channel) => channel.buffer),
      );
    } catch (error) {
      finish(error);
    }
  });
}
