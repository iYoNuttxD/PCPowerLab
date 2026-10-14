import { formatCurrency } from '../../utils/formatCurrency.js';
import { datedReference, referenceLabel } from '../../utils/referencePricing.js';
const hosts = ['www.pichau.com.br', 'www.terabyteshop.com.br', 'www.kabum.com.br', 'www.amazon.com.br', 'www.mercadolivre.com.br', 'produto.mercadolivre.com.br'];
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export default function ReferencePriceNote({ component, compact = false }) {
  const reference = datedReference(component);
  const url = safeUrl(reference?.productUrl);
  const variant = ['family', 'benchmark'].includes(reference?.referenceScope) ? reference.sourceVariantName || reference.model : null;
  return <p className={`reference-price-note${compact ? ' reference-price-note--compact' : ''}`}>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer">{referenceLabel(component)}</a> : referenceLabel(component)}
    {!compact && reference && <span className="reference-price-variant">Vendedor: {reference.seller || reference.store} · {reference.paymentCondition || 'PIX à vista'}{Number.isFinite(reference.cardTotal) && ` · Total no cartão: ${formatCurrency(reference.cardTotal)}`}</span>}
    {!compact && reference && <span className="reference-price-variant">{reference.observedAvailability === 'available' ? 'Disponível na consulta; confirme na loja.' : 'Estoque não confirmado nesta referência.'} Frete não incluído.{reference.conditionCaveat ? ' Condição novo/usado não informada.' : ''}</span>}
    {variant && <span className="reference-price-variant">{reference.referenceScope === 'family' ? 'Variante' : 'Exemplo de preço'}: {variant}</span>}
  </p>;
}
