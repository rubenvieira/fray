const SEGMENTS = [
  [0.58, 1.13],
  [2.4, 2.75],
  [3.87, 5.02],
];
const GRAIN_SECONDS = 0.1;
const LEVEL_SECONDS = 0.06;

// Preserve the recorded tear's filter, channel averaging, and local RMS gain.
// This sample-sized work runs in audio-preparation-worker, never in an input turn.
export function prepareTearSource(channels, sampleRate) {
  if (!channels.length || !Number.isFinite(sampleRate) || sampleRate <= 0) throw Error(`Invalid tear recording`);
  const length = channels[0].length;
  if (channels.some((channel) => channel.length !== length)) throw Error(`Mismatched audio channels`);
  const mixed = new Float32Array(length);
  for (const channel of channels) {
    for (let index = 0; index < length; index++) mixed[index] += channel[index] / channels.length;
  }

  const frequency = (2 * Math.PI * 70) / sampleRate;
  const alpha = Math.sin(frequency) / (2 * Math.SQRT1_2);
  const cosine = Math.cos(frequency);
  const scale = 1 + alpha;
  const feed = (1 + cosine) / 2 / scale;
  const middle = -(1 + cosine) / scale;
  const feedback = (-2 * cosine) / scale;
  const decay = (1 - alpha) / scale;
  const filtered = new Float32Array(length);
  let previous = 0,
    older = 0;
  for (let index = 0; index < length; index++) {
    const input = mixed[index];
    const output = feed * input + previous;
    previous = middle * input - feedback * output + older;
    older = feed * input - decay * output;
    filtered[index] = output;
  }

  const radius = Math.round((LEVEL_SECONDS * sampleRate) / 2);
  const energy = new Float64Array(length + 1);
  for (let index = 0; index < length; index++) energy[index + 1] = energy[index] + filtered[index] * filtered[index];
  const grain = Math.round(GRAIN_SECONDS * sampleRate);
  const starts = [];
  let totalEnergy = 0,
    samples = 0;
  for (const [start, end] of SEGMENTS) {
    const first = Math.min(length, Math.round(start * sampleRate));
    const last = Math.min(length, Math.round(end * sampleRate));
    if (last - first > grain) starts.push([first, last - grain]);
    totalEnergy += energy[last] - energy[first];
    samples += Math.max(0, last - first);
  }
  const level = Math.sqrt(totalEnergy / Math.max(1, samples));
  const pcm = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const first = Math.max(0, index - radius);
    const last = Math.min(length, index + radius);
    const localLevel = Math.sqrt((energy[last] - energy[first]) / Math.max(1, last - first));
    const denominator = Math.max(localLevel, 0.1 * level);
    pcm[index] = denominator > 0 ? filtered[index] / denominator : 0;
  }
  return { pcm, starts, level };
}
