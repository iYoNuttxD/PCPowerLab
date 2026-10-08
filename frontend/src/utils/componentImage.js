// Display-only windows in one reviewed, byte-identical original. These are not generated assets.
export const reviewedCompositeOriginal = Object.freeze({
  imagePath: '/images/components/amd-ryzen-5500-5600-original.png',
  sha256: '5bb56eec1d860765ba6aada606e9257d6eba6279844c074f6cc5a5dbd9c99b28',
  sourceWidth: 2560,
  sourceHeight: 1440,
});
const reviewedCropPoints = {
  'cpu-ryzen-5-5500': [[1274, 672], [1722, 723], [1676, 1158], [1223, 1097]],
  'cpu-ryzen-5-5600': [[1326, 256], [1777, 290], [1724, 720], [1272, 669]],
};

export function validImageCrop(crop) {
  if (!crop || typeof crop !== 'object' || Array.isArray(crop)
    || !Number.isSafeInteger(crop.sourceWidth) || !Number.isSafeInteger(crop.sourceHeight)
    || crop.sourceWidth < 1 || crop.sourceHeight < 1 || crop.sourceWidth > 4096 || crop.sourceHeight > 4096
    || !Array.isArray(crop.points) || crop.points.length !== 4) return false;
  if (!crop.points.every(point => Array.isArray(point) && point.length === 2
    && point.every(Number.isSafeInteger) && point[0] >= 0 && point[0] <= crop.sourceWidth
    && point[1] >= 0 && point[1] <= crop.sourceHeight)) return false;
  const turns = crop.points.map(([x, y], index) => {
    const [nextX, nextY] = crop.points[(index + 1) % 4];
    const [afterX, afterY] = crop.points[(index + 2) % 4];
    return (nextX - x) * (afterY - nextY) - (nextY - y) * (afterX - nextX);
  });
  return turns.every(value => value > 0) || turns.every(value => value < 0);
}

export function imageCropViewBox(crop) {
  if (!validImageCrop(crop)) return null;
  const xs = crop.points.map(point => point[0]);
  const ys = crop.points.map(point => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}

export function approvedComponentImageCrop(media, componentId) {
  const expected = reviewedCropPoints[componentId];
  const crop = media?.crop;
  if (!Array.isArray(expected) || !validImageCrop(crop)
    || media.sha256 !== reviewedCompositeOriginal.sha256 || media.imagePath !== reviewedCompositeOriginal.imagePath
    || crop.sourceWidth !== reviewedCompositeOriginal.sourceWidth || crop.sourceHeight !== reviewedCompositeOriginal.sourceHeight
    || !crop.points.every((point, index) => point.every((value, axis) => value === expected[index][axis]))) return null;
  return crop;
}

// Separating-axis test for convex windows; invalid geometry always fails closed.
export function imageCropsOverlap(first, second) {
  if (!validImageCrop(first) || !validImageCrop(second)
    || first.sourceWidth !== second.sourceWidth || first.sourceHeight !== second.sourceHeight) return true;
  for (const crop of [first, second]) {
    for (let index = 0; index < crop.points.length; index++) {
      const [x, y] = crop.points[index];
      const [nextX, nextY] = crop.points[(index + 1) % crop.points.length];
      const project = points => points.map(([px, py]) => px * (y - nextY) + py * (nextX - x));
      const a = project(first.points);
      const b = project(second.points);
      if (Math.max(...a) <= Math.min(...b) || Math.max(...b) <= Math.min(...a)) return false;
    }
  }
  return true;
}

// Only audited, exact-model local photography can reach a raster element or reviewed display window.
export function isSecureImageLink(value) {
  if (typeof value !== 'string' || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

function validVerificationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return false;
  const day = value.slice(0, 10);
  const parsedDay = new Date(`${day}T00:00:00.000Z`);
  const timestamp = Date.parse(value);
  return Number.isFinite(parsedDay.getTime()) && parsedDay.toISOString().slice(0, 10) === day
    && Number.isFinite(timestamp) && timestamp <= Date.now();
}

export function verifiedComponentImage(component) {
  const media = component?.image;
  if (typeof component?.id !== 'string' || !component.id || !media || media.status !== 'verified' || media.componentId !== component.id
    || media.imageType !== 'photo'
    || !isSecureImageLink(media.imageSource) || !isSecureImageLink(media.manufacturerProductUrl)
    || !validVerificationDate(media.lastVerifiedAt)
    || typeof media.imagePath !== 'string'
    || !/^\/images\/components\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:avif|webp|png|jpe?g)$/i.test(media.imagePath)) return null;
  // A caller cannot invent a display window or move a reviewed window to another model.
  if (Object.hasOwn(media, 'crop') && !approvedComponentImageCrop(media, component.id)) return null;
  // Source photos need exact provenance, not an explicit reuse license. Keep any
  // recorded attribution safe to render without claiming that a source grants rights.
  if (['author', 'license', 'modifications', 'alt', 'identityNotes', 'identityLevel'].some(field => media[field] != null && typeof media[field] !== 'string')
    || media.licenseUrl != null && !isSecureImageLink(media.licenseUrl)) return null;
  return media;
}
