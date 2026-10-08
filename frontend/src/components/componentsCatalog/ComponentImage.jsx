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
  const imageAlt = media?.alt || `Fotografia de ${name}`;
  const Icon = icons[component?.category || category] || Cpu;
  const showImage = Boolean(media) && state !== 'error';
  const pending = catalogLoading || (showImage && state === 'loading');
  return (
    <figure className={`component-media${compact ? ' component-media--compact' : ''}`}
      data-component-id={component?.id || component?.fanId || (typeof component === 'string' ? component : '')}
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
            <span aria-hidden="true">Fotografia não disponível</span>
          </div>}
      </div>
      {showImage && state === 'loaded' ? <figcaption>
        <a href={media.imageSource} target="_blank" rel="noopener noreferrer">{media.author ? `Foto: ${media.author}` : 'Origem da fotografia'}</a>
        {media.license && <> · <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer">{media.license}</a></>}
        <span className="component-image-product-link"><a href={media.manufacturerProductUrl} target="_blank" rel="noopener noreferrer">Modelo no fabricante</a></span>
        {media.modifications && <details className="component-image-modifications"><summary>Imagem modificada: detalhes</summary><p>{media.modifications}</p></details>}
      </figcaption> : !compact && <figcaption>{pending ? 'Aguardando a fotografia verificada' : 'Ícone ilustrativo da categoria'}</figcaption>}
    </figure>
  );
}
