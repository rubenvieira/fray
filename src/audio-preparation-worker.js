import { prepareTearSource } from "./tear-source.js";

self.onmessage = ({ data }) => {
  self.onmessage = null;
  try {
    const source = prepareTearSource(data.channels, data.sampleRate);
    self.postMessage({ source }, [source.pcm.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message || `Tear recording preparation failed` });
  } finally {
    self.close();
  }
};
