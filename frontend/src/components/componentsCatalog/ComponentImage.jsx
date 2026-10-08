import { useState } from 'react';
import { CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Monitor, Zap } from 'lucide-react';

const icons = { cpu: Cpu, gpu: Monitor, motherboard: CircuitBoard, ram: MemoryStick, storage: HardDrive, psu: Zap, case: Fan };
const secureUrl = value => typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value);

export default function ComponentImage({ component }) {
  const media = component?.image;
  const [failedUrl, setFailedUrl] = useState(null);
  const Icon = icons[component?.category] || Cpu;
  const licensed = media?.author && media?.license && secureUrl(media.sourceUrl) && secureUrl(media.licenseUrl);
  const safeSource = typeof media?.url === 'string' && (/^\/images\/components\/[\w.-]+$/.test(media.url) || secureUrl(media.url));
  const showImage = licensed && safeSource && failedUrl !== media.url;

  return (
    <figure className="component-media">
      <div className={`component-image ${showImage ? 'has-photo' : ''}`}>
        {showImage ? <img src={media.url} alt={media.alt || component.name} loading="lazy" decoding="async"
          onError={() => setFailedUrl(media.url)} /> : <div className="component-image-fallback">
          <Icon size={46} aria-hidden="true" />
          <span>Fotografia não disponível</span>
        </div>}
      </div>
      <figcaption>
        {showImage ? <><a href={media.sourceUrl} target="_blank" rel="noopener noreferrer">Foto: {media.author}</a> · <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer">{media.license}</a></> : 'Ícone ilustrativo da categoria'}
      </figcaption>
    </figure>
  );
}
