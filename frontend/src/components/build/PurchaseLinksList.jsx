import { ExternalLink } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function PurchaseLinksList({ linksBySlot, links }) {
  const flatLinks = Array.isArray(links)
    ? links
    : Object.entries(linksBySlot || {}).flatMap(([slot, slotLinks]) => (
      Array.isArray(slotLinks) ? slotLinks.map((link) => ({ ...link, slot })) : []
    ));

  return (
    <Card>
      <h3>Links de compra</h3>
      {flatLinks.length === 0 ? (
        <p>Nenhum link cadastrado para os componentes selecionados.</p>
      ) : (
        <div className="links-grid">
          {flatLinks.map((link, index) => (
            <article key={`${link.componentId}-${link.storeName}-${index}`} className="shop-link">
              <strong>{link.storeName}</strong>
              <span>{formatCurrency(link.price, link.currency)}</span>
              <small>{link.availabilityStatus || 'unknown'} {link.isAffiliate ? '• afiliado' : '• não afiliado'}</small>
              <a
                className="btn btn-ghost btn-md"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} aria-hidden="true" />
                Ver na loja
              </a>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
