import { ExternalLink } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { translateValue } from '../../utils/translations.js';

export default function PurchaseLinksList({ linksBySlot, links }) {
  const flatLinks = Array.isArray(links)
    ? links
    : Object.entries(linksBySlot || {}).flatMap(([slot, slotLinks]) => (
      Array.isArray(slotLinks) ? slotLinks.map((link) => ({ ...link, slot })) : []
    ));

  const renderEstimatedPrice = (link) => (
    Number.isFinite(Number(link.price))
      ? `Preço estimado: ${formatCurrency(link.price, link.currency)}`
      : 'Preço estimado não informado'
  );

  return (
    <Card>
      <h3>Links de compra</h3>
      <p className="hint-text">
        Os links direcionam para buscas em lojas externas. Preços e disponibilidade devem ser confirmados diretamente na loja.
      </p>
      {flatLinks.length === 0 ? (
        <p>Nenhum link cadastrado para os componentes selecionados.</p>
      ) : (
        <div className="links-grid">
          {flatLinks.map((link, index) => (
            <article key={`${link.componentId}-${link.storeName}-${index}`} className="shop-link">
              <strong>{link.storeName}</strong>
              <span>{renderEstimatedPrice(link)}</span>
              <small>
                {translateValue(link.availabilityStatus, 'Consultar na loja')} • consulte o valor atualizado na loja
                {link.isAffiliate ? ' • afiliado' : ' • sem link afiliado'}
              </small>
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
