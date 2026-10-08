import ReferencePriceNote from './ReferencePriceNote.jsx';
import ComponentIdentity from '../componentsCatalog/ComponentIdentity.jsx';
import { ExternalLink } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { translateValue } from '../../utils/translations.js';
import { componentLabels, componentTypes } from '../../utils/componentLabels.js';
import { fanPackPrice } from '../../utils/buildHelpers.js';

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
    link.price !== null && link.price !== undefined && link.price !== '' && Number.isFinite(Number(link.price))
      ? `Preço estimado: ${formatCurrency(link.price, link.currency)}`
      : 'Preço estimado não informado'
  );

  return (
    <Card>
      <h3>Preços e pesquisa em lojas</h3>
      <p className="hint-text">Confirme preço e estoque na loja.</p>
      <details className="reference-price-note">
        <summary>Sobre os preços e links</summary>
        <div className="reference-price-details">
          <p>{flatLinks.find(link => link.marketMessage)?.marketMessage || 'Comparação automática indisponível: nenhuma fonte de preços autorizada está conectada.'}</p>
          <p>Referências datadas e estimativas do catálogo não são ofertas ao vivo. As buscas nas lojas não são cotações de cada loja. Ofertas atuais só aparecem quando recebidas de uma fonte comercial autorizada, com data e validade.</p>
        </div>
      </details>
      {variant === 'single' && flatLinks[0]?.referencePricing && <ReferencePriceNote component={{ price: flatLinks[0].price, pricing: flatLinks[0].referencePricing }} compact />}
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
                  <ComponentIdentity component={{ id: group.componentId, name: group.componentName }} category={group.category} />
                  {group.category === 'fan' && (
                    <small>{group.quantity} pack(s) · links mostram valores por pack</small>
                  )}
                </div>
                {Number.isFinite(Number(group.componentPrice)) && (
                  <span className="price">{group.category === 'fan' ? 'Total estimado dos packs' : 'Referência estimada'}: {formatCurrency(group.componentPrice)}</span>
                )}
              </div>

              <ReferencePriceNote component={{ price: group.category === 'fan' ? group.links[0]?.price : group.componentPrice, pricing: group.links[0]?.referencePricing }} compact />
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
      <span>{link.kind === 'offer' ? `Cotação: ${formatCurrency(link.price, link.currency)}` : 'Pesquisa externa, sem cotação desta loja'}</span>
      {link.kind === 'offer' ? <>
        <small>Consultado em: {link.queriedAt}</small>
        <small>Válido até: {link.validUntil}</small>
        <small>Fonte: {link.source?.name}</small>
      </> : <small>{renderEstimatedPrice(link)} (catálogo)</small>}
      <small>Status: {translateValue(link.availabilityStatus, 'Consultar na loja')}</small>
      <small>{link.isAffiliate ? 'Link afiliado' : 'Sem link afiliado'}</small>
      <a
        className="btn btn-ghost btn-md"
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={16} aria-hidden="true" />
        {link.kind === 'offer' ? 'Ver produto na loja' : 'Pesquisar na loja'}
      </a>
    </article>
  );
}

function groupPurchaseLinksByComponent({ linksBySlot, links, selectedComponents }) {
  const flatLinks = normalizeLinks({ linksBySlot, links });
  const selectedEntries = [...componentTypes, 'cooler']
    .map((category) => {
      const component = selectedComponents?.[category];

      return component ? {
        componentId: component.id,
        category,
        categoryLabel: componentLabels[category],
        componentName: component.name,
        componentPrice: component.price ?? component.estimatedPrice,
        links: []
      } : null;
    })
    .filter(Boolean);
  for (const fan of (Array.isArray(selectedComponents?.fans) ? selectedComponents.fans : [])) {
    const quantity = Number(fan.quantity ?? 1);
    selectedEntries.push({
      componentId: fan.id || fan.fanId,
      category: 'fan',
      categoryLabel: componentLabels.fan,
      componentName: fan.name || fan.id || fan.fanId,
      componentPrice: fanPackPrice(fan),
      quantity,
      links: []
    });
  }

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
      const category = link.slot === 'fans' ? 'fan' : link.slot || 'links';
      const quantity = category === 'fan' ? Number(link.quantity ?? 1) : 1;

      fallbackGroups.set(key, {
        componentId: key,
        category,
        categoryLabel: componentLabels[category] || 'Componente',
        componentName: link.componentName || link.componentId || 'Componente selecionado',
        componentPrice: fanPackPrice({ price: link.price, quantity }),
        quantity,
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
