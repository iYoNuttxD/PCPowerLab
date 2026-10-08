export function formatCurrency(value, currency = 'BRL') {
  const number = Number(value);

  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) {
    return 'Preço indisponível';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(number);
}
