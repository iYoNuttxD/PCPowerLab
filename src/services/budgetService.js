const supportedPriorities = [
  'lowest-price',
  'cost-benefit',
  'performance',
  'balanced',
  'upgrade-ready'
];

const defaultCurrency = 'BRL';
const defaultPriority = 'balanced';
const minimumRecommendedBudget = 1500;
const maximumAcceptedBudget = 100000;

export function createBudget(budgetInput) {
  validateBudgetPayload(budgetInput);

  const amount = normalizeAmount(budgetInput.amount);
  validateBudgetRange(amount);

  const currency = normalizeCurrency(budgetInput.currency);
  const priority = normalizePriority(budgetInput.priority);
  const warnings = buildBudgetWarnings(amount, currency);

  return {
    amount,
    currency,
    priority,
    warnings
  };
}

function validateBudgetPayload(budgetInput) {
  if (!budgetInput || typeof budgetInput !== 'object' || Array.isArray(budgetInput)) {
    const error = new Error('Informe o orcamento disponivel.');
    error.statusCode = 400;
    throw error;
  }
}

function normalizeAmount(amountInput) {
  if (amountInput === undefined || amountInput === null) {
    const error = new Error('Valor de orcamento obrigatorio.');
    error.statusCode = 400;
    error.errors = ['amount deve ser informado.'];
    throw error;
  }

  if (typeof amountInput !== 'number' || !Number.isFinite(amountInput)) {
    const error = new Error('Valor de orcamento invalido.');
    error.statusCode = 400;
    error.errors = ['amount deve ser um numero.'];
    throw error;
  }

  if (amountInput <= 0) {
    const error = new Error('Valor de orcamento invalido.');
    error.statusCode = 400;
    error.errors = ['amount deve ser maior que zero.'];
    throw error;
  }

  return Number(amountInput.toFixed(2));
}

function validateBudgetRange(amount) {
  if (amount > maximumAcceptedBudget) {
    const error = new Error('Valor de orcamento fora da faixa aceitavel.');
    error.statusCode = 400;
    error.errors = [`amount deve ser menor ou igual a ${maximumAcceptedBudget}.`];
    throw error;
  }
}

function normalizeCurrency(currencyInput) {
  const currency = normalizeText(currencyInput);

  if (!currency) {
    return defaultCurrency;
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    const error = new Error('Moeda invalida.');
    error.statusCode = 400;
    error.errors = ['currency deve seguir o padrao ISO 4217 com 3 letras.'];
    throw error;
  }

  return currency;
}

function normalizePriority(priorityInput) {
  const priority = normalizeText(priorityInput)?.toLowerCase() || defaultPriority;

  if (supportedPriorities.includes(priority)) {
    return priority;
  }

  const error = new Error('Prioridade invalida.');
  error.statusCode = 400;
  error.errors = [`Prioridades aceitas: ${supportedPriorities.join(', ')}.`];
  throw error;
}

function buildBudgetWarnings(amount, currency) {
  const warnings = [];

  if (currency === defaultCurrency && amount < minimumRecommendedBudget) {
    warnings.push('Orcamento abaixo da faixa recomendada para uma configuracao completa.');
  }

  return warnings;
}

function normalizeText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim().toUpperCase();
}