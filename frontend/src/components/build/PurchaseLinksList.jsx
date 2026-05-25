import { ExternalLink } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { translateValue } from '../../utils/translations.js';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';

export default function PurchaseLinksList({
  linksBySlot,
  links,
  selectedComponents,
  variant = 'grouped'
}) {
  const groups = groupPurchaseLinksByComponent({ linksBySlot, links, selectedComponents });
  const flatLinks = normalizeLinks({ linksBySlot, links });
  const hasAnyLink = groups.some((group) => group.links.length > 0);

  const renderEstimatedPrice = (link) => (
    Number.isFinite(Number(link.price))
      ? `Preço estimado: ${formatCurrency(link.price, link.currency)}`
      : 'Preço estimado não informado'
  );

  return (
    <Card>
      <h3>Links de compra</h3>
      <p className="hint-text">
        {variant === 'single'
          ? 'Os links direcionam para buscas em lojas externas. Confirme preço e disponibilidade na loja.'
          : 'Os links direcionam para buscas em lojas externas. Preços e disponibilidade devem ser confirmados diretamente na loja.'}
      </p>
      {variant === 'single' ? (
        <SingleLinksGrid links={flatLinks} renderEstimatedPrice={renderEstimatedPrice} />
      ) : !hasAnyLink ? (
        <p>Nenhum link de compra disponível para esta configuração.</p>
      ) : (
        <div className="purchase-links-section">
          {groups.map((group) => (
            <section key={group.componentId || group.category} className="purchase-component-group">
              <div className="purchase-component-header">
                <div className="purchase-component-title">
                  <span className="purchase-component-category">{group.categoryLabel}</span>
                  <strong className="purchase-component-name">{group.componentName}</strong>
                </div>
                {Number.isFinite(Number(group.componentPrice)) && (
                  <span className="price">{formatCurrency(group.componentPrice)}</span>
                )}
              </div>

              {group.links.length === 0 ? (
                <p className="hint-text">Nenhum link cadastrado para este componente.</p>
              ) : (
                <div className="purchase-store-grid">
                  {group.links.map((link, index) => (
                    <ShopLinkCard
                      key={`${link.componentId}-${link.storeName}-${index}`}
                      link={link}
                      renderEstimatedPrice={renderEstimatedPrice}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

function SingleLinksGrid({ links, renderEstimatedPrice }) {
  if (!Array.isArray(links) || links.length === 0) {
    return <p>Nenhum link cadastrado para este componente.</p>;
  }

  return (
    <div className="purchase-store-grid">
      {links.map((link, index) => (
        <ShopLinkCard
          key={`${link.componentId}-${link.storeName}-${index}`}
          link={link}
          renderEstimatedPrice={renderEstimatedPrice}
        />
      ))}
    </div>
  );
}

function ShopLinkCard({ link, renderEstimatedPrice }) {
  return (
    <article className="shop-link">
      <strong>{link.storeName}</strong>
      <span>{renderEstimatedPrice(link)}</span>
      <small>Status: {translateValue(link.availabilityStatus, 'Consultar na loja')}</small>
      <small>{link.isAffiliate ? 'Link afiliado' : 'Sem link afiliado'}</small>
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
  );
}

function groupPurchaseLinksByComponent({ linksBySlot, links, selectedComponents }) {
  const flatLinks = normalizeLinks({ linksBySlot, links });
  const selectedEntries = componentTypes
    .map((category) => {
      const component = selectedComponents?.[category];

      return component ? {
        componentId: component.id,
        category,
        categoryLabel: componentLabels[category],
        componentName: component.name,
        componentPrice: component.price,
        links: []
      } : null;
    })
    .filter(Boolean);

  const groupsById = new Map(selectedEntries.map((group) => [group.componentId, group]));

  for (const link of flatLinks) {
    const group = groupsById.get(link.componentId);

    if (group) {
      group.links.push(link);
    }
  }

  if (selectedEntries.length > 0) {
    return selectedEntries;
  }

  const fallbackGroups = new Map();

  for (const link of flatLinks) {
    const key = link.componentId || link.slot || 'links';

    if (!fallbackGroups.has(key)) {
      const category = link.slot || 'links';

      fallbackGroups.set(key, {
        componentId: key,
        category,
        categoryLabel: componentLabels[category] || 'Componente',
        componentName: link.componentName || link.componentId || 'Componente selecionado',
        componentPrice: link.price,
        links: []
      });
    }

    fallbackGroups.get(key).links.push(link);
  }

  return Array.from(fallbackGroups.values());
}

function normalizeLinks({ linksBySlot, links }) {
  if (Array.isArray(links)) {
    return links;
  }

  return Object.entries(linksBySlot || {}).flatMap(([slot, slotLinks]) => (
    Array.isArray(slotLinks) ? slotLinks.map((link) => ({ ...link, slot })) : []
  ));
}
