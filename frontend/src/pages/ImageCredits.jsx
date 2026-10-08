import { useComponents } from '../hooks/useComponents.js';
import { verifiedComponentImage } from '../utils/componentImage.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

export function ImageCredit({ component }) {
  const media = verifiedComponentImage(component);
  if (!media) return null;
  return <section id={component.id} className="image-credit">
    <h2>{component.name}</h2>
    <p><a href={media.imageSource} target="_blank" rel="noopener noreferrer">{media.author ? `Foto: ${media.author}` : 'Origem da fotografia'}</a>
      {media.license && <> · {media.licenseUrl ? <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer">{media.license}</a> : media.license}</>}</p>
    {media.modifications && <p>Alterações: {media.modifications}</p>}
    <a href={media.manufacturerProductUrl} target="_blank" rel="noopener noreferrer">Modelo no fabricante</a>
  </section>;
}

export default function ImageCredits() {
  const { allComponents: components, loading, error, reload } = useComponents();
  return <div className="page-stack">
    <section className="page-hero compact-hero"><h1>Créditos das imagens</h1>
      <p>As fotografias pertencem aos respectivos titulares. Licenças conhecidas estão indicadas abaixo.</p>
      <a href="/images/components/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Registro completo de fontes e direitos</a>
    </section>
    {loading ? <p role="status">Carregando créditos…</p> : error ? <Card><p role="alert">{error}</p><Button onClick={reload}>Tentar novamente</Button></Card>
      : <Card>{components.map(component => <ImageCredit key={component.id} component={component} />)}</Card>}
  </div>;
}
