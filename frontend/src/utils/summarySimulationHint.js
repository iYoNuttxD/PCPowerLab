export function summarySimulationHint({ complete, gamesLoading, gamesError, gameAvailable, loading, error, result }) {
  if (!complete) return 'Complete a montagem antes de simular.';
  if (gamesLoading) return 'Aguarde o carregamento dos jogos.';
  if (gamesError) return 'Recarregue o catálogo para simular um jogo.';
  if (!gameAvailable) return 'Selecione um jogo disponível para simular.';
  if (loading) return 'Calculando a estimativa para estas escolhas…';
  if (error) return 'Não foi possível atualizar a estimativa. Confira o aviso e tente novamente.';
  if (result?.status === 'unavailable' || result?.available === false) return 'Simulação indisponível para esta configuração. Confira o motivo abaixo.';
  if (result && typeof result.estimatedFps === 'number' && Number.isFinite(result.estimatedFps)) return 'Estimativa atualizada para estas escolhas. Confira o resultado abaixo; você pode alterar o jogo, a resolução ou a qualidade e simular novamente.';
  return 'Execute a simulação para ver uma estimativa para o jogo, a resolução e a qualidade selecionados.';
}
