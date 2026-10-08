import { useId, useState } from 'react';
import { CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Monitor, Zap } from 'lucide-react';
import { useCatalogComponent } from '../../hooks/useComponents.js';
import { approvedComponentImageCrop, imageCropViewBox, verifiedComponentImage } from '../../utils/componentImage.js';

const icons = { cpu: Cpu, gpu: Monitor, motherboard: CircuitBoard, ram: MemoryStick, storage: HardDrive, psu: Zap, case: Fan, cooler: Fan, fan: Fan };

export default function ComponentImage({ component, category, compact = false }) {
  const { component: current, loading } = useCatalogComponent(component);
  const media = verifiedComponentImage(current);
  const name = current?.name || component?.name || (typeof component === 'string' ? component : component?.id || component?.fanId) || 'componente';
  // Remount image state when identity/source changes; a failed URL never poisons a different model.
  const imageKey = `${current?.id || ''}:${media?.imagePath || ''}:${media?.lastVerifiedAt || ''}:${JSON.stringify(media?.crop || null)}`;
  return <ComponentImageFrame key={imageKey} component={current || component} category={category}
    name={name} media={media} catalogLoading={loading} compact={compact} />;
}

function ComponentImageFrame({ component, category, name, media, catalogLoading, compact }) {
  const [state, setState] = useState('loading');
  const clipId = useId();
  const crop = approvedComponentImageCrop(media, component?.id);
  const illustrative = media?.identityLevel === 'representative-product';
  const baseAlt = media?.alt || `Fotografia de ${name}`;
  const imageAlt = illustrative && !/^imagem ilustrativa/i.test(baseAlt) ? `Imagem ilustrativa: ${baseAlt}` : baseAlt;
  const Icon = icons[component?.category || category] || Cpu;
  const showImage = Boolean(media) && state !== 'error';
  const pending = catalogLoading || (showImage && state === 'loading');
  return (
    <figure className={`component-media${compact ? ' component-media--compact' : ''}`}
      data-component-id={component?.id || component?.fanId || (typeof component === 'string' ? component : '')}
      data-image-identity={media?.identityLevel}
      data-image-state={pending ? 'loading' : showImage ? 'verified' : 'unavailable'}>
      <div className={`component-image${showImage ? ' has-photo' : ''}`} aria-busy={pending}>
        {showImage && (crop ? <svg viewBox={imageCropViewBox(crop).join(' ')} preserveAspectRatio="xMidYMid meet"
          role="img" aria-label={imageAlt} data-image-crop="reviewed"
          style={{ display: 'block', width: '100%', height: '100%', padding: compact ? 4 : 8, visibility: state === 'loaded' ? 'visible' : 'hidden' }}>
          <defs><clipPath id={clipId}><polygon points={crop.points.map(point => point.join(',')).join(' ')} /></clipPath></defs>
          <image href={media.imagePath} width={crop.sourceWidth} height={crop.sourceHeight} clipPath={`url(#${clipId})`}
            onLoad={() => setState('loaded')} onError={() => setState('error')} />
        </svg> : <img src={media.imagePath} alt={imageAlt} loading="lazy" decoding="async"
          width="320" height="240" onLoad={() => setState('loaded')} onError={() => setState('error')}
          className={state === 'loaded' ? 'is-loaded' : 'is-loading'} />)}
        {pending ? <div className="component-image-loading" role="status"><span>Carregando fotografia…</span></div>
          : !showImage && <div className="component-image-fallback" role="img" aria-label={`Fotografia não disponível: ${name}`}>
            <Icon size={compact ? 24 : 46} aria-hidden="true" />
            {!compact && <span aria-hidden="true">Sem imagem</span>}
          </div>}
      </div>
      {showImage && state === 'loaded' && <ComponentImageCredits media={media} name={name} compact={compact} />}
    </figure>
  );
}

export function ComponentImageCredits({ media, name, compact = false }) {
  const illustrative = media.identityLevel === 'representative-product';
  return <figcaption><details className="component-image-credits">
    <summary aria-label={`${illustrative ? 'Imagem ilustrativa' : 'Fonte da imagem'} de ${name}`}>{illustrative ? 'Imagem ilustrativa' : compact ? 'Fonte' : 'Fonte da imagem'}</summary>
    {media.identityNotes && <p>{media.identityNotes}</p>}
    <a href={media.imageSource} target="_blank" rel="noopener noreferrer">{media.author ? `Foto: ${media.author}` : 'Origem da fotografia'}</a>
    {media.license && <> · {media.licenseUrl ? <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer">{media.license}</a> : media.license}</>}
    <span className="component-image-product-link"><a href={media.manufacturerProductUrl} target="_blank" rel="noopener noreferrer">Modelo no fabricante</a></span>
    {media.modifications && <p>Alterações: {media.modifications}</p>}
  </details></figcaption>;
}
