export const CAPTURE_FORMATS = {
  screen: { name: "Screen", width: 0, height: 0 },
  wide: { name: "Landscape · 16:9", width: 1280, height: 720 },
  square: { name: "Square · 1:1", width: 1080, height: 1080 },
  portrait: { name: "Portrait · 9:16", width: 720, height: 1280 },
};

export function captureSize(format, width, height) {
  const f = CAPTURE_FORMATS[format] || CAPTURE_FORMATS.screen;
  return {
    width: f.width || Math.max(2, Math.floor(width / 2) * 2),
    height: f.height || Math.max(2, Math.floor(height / 2) * 2),
  };
}

// Centre-cover without stretching yarns or reading outside the canvas. Used
// by both the visible composition guide and the actual encoded video/frame.
export function captureCrop(width, height, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / width, targetHeight / height);
  const w = Math.min(width, targetWidth / scale),
    h = Math.min(height, targetHeight / scale);
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
