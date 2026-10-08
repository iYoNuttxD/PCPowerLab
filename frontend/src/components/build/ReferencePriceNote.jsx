import { datedReference, referenceLabel } from '../../utils/referencePricing.js';
import { formatCurrency } from '../../utils/formatCurrency.js';
const hosts = ['www.pichau.com.br', 'www.terabyteshop.com.br', 'www.kabum.com.br', 'www.amazon.com.br', 'www.mercadolivre.com.br', 'produto.mercadolivre.com.br'];
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
const crawlAge = value => value === 'today' ? 'no dia da consulta' : value === 'yesterday' ? '1 dia antes da consulta'
  : value === 'last week' ? 'semana anterior à consulta' : typeof value === 'string' ? value.replace(/days? ago/, 'dias antes da consulta').replace(/weeks? ago/, 'semanas antes da consulta').replace(/months? ago/, 'meses antes da consulta') : 'não informada';
const description = value => typeof value === 'string' ? value : value?.status || 'Não verificado';
export default function ReferencePriceNote({ component, compact = false }) {
  const reference = datedReference(component);
  if (!reference) return <p className="hint-text">{referenceLabel(component)}. Condição de pagamento e estoque não verificados.</p>;
  const url = safeUrl(reference.productUrl);
  return <div className="hint-text">
    {!compact && <p>{referenceLabel(component)} · {reference.store}. Sem atualização em tempo real.</p>}
    <details open={compact ? undefined : true}>
      <summary>Fonte e condições do preço · {reference.store} · {reference.queriedAt}</summary>
      <p>Modelo observado: {reference.model} · Vendedor: {reference.seller || reference.store}</p>
      <p>Pagamento usado no total: {reference.paymentCondition?.replace('discount', 'de desconto')}. Cartão: {formatCurrency(reference.cardTotal)}{reference.installments && ` (${reference.installments})`}</p>
      <p>Consulta: {reference.queriedAt} · Idade do conteúdo retornado: {crawlAge(reference.retrievalCrawlLabel)}. A consulta pode retornar conteúdo indexado; não comprova o preço atual.</p>
      <p>Estoque na observação: {reference.observedAvailability === 'available' ? 'a fonte informava disponível; confirme novamente' : 'não confirmado'}. Condição: {reference.condition === 'new' ? 'novo na fonte' : 'não informada'}.</p>
      <p>Frete: {description(reference.shipping)}. Tributos: {description(reference.taxes)}.</p>
      {url && <a href={url} target="_blank" rel="noopener noreferrer">Ver página exata da referência</a>}
    </details>
  </div>;
}
