// Only audited, exact-model local photography can reach an <img> element.
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
    || media.imageType !== 'photo' || typeof media.rightsBasis !== 'string' || !media.rightsBasis.trim()
    || !isSecureImageLink(media.imageSource) || !isSecureImageLink(media.manufacturerProductUrl)
    || !validVerificationDate(media.lastVerifiedAt)
    || typeof media.imagePath !== 'string'
    || !/^\/images\/components\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:avif|webp|png|jpe?g)$/i.test(media.imagePath)) return null;
  // Every currently supported approval basis requires complete, safe attribution.
  if (typeof media.author !== 'string' || !media.author.trim()
    || typeof media.license !== 'string' || !media.license.trim() || !isSecureImageLink(media.licenseUrl)) return null;
  return media;
}
