export function numericValue(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatPerformanceNumber(value) {
  const number = numericValue(value);
  return number === null ? 'Não disponível' : number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function formatRequirement(value) {
  return value === true ? 'Sim' : value === false ? 'Não' : 'Não informado';
}

export function getPerformanceErrorMessage(error, fallback = 'Não foi possível concluir a simulação. Tente novamente.') {
  if (error?.status === 0) return 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.';
  if (error?.status === 400 && /parametros|parâmetros/i.test(error.message || '')) {
    return 'Faltam dados de desempenho de uma ou mais peças para simular. Suas escolhas foram mantidas. Tente novamente após a atualização desses dados ou revise as peças da montagem.';
  }
  return error?.message || fallback;
}
