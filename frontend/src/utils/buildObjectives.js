// Describe the user's goal, not a guarantee that a model runs a named workload.
export const buildObjectiveDescriptions = {
  gaming: 'Quero jogar. Compare a resolução e a qualidade desejadas nas análises; uma pontuação de catálogo não garante FPS.',
  work: 'Quero trabalhar com aplicativos e várias tarefas. A recomendação considera o perfil; confira os programas que você realmente utiliza.',
  'video-editing': 'Quero editar vídeos. Confira memória, armazenamento e requisitos do seu editor; quantidade de núcleos não comprova tempo de renderização.',
  programming: 'Quero programar. Considere projetos, ferramentas, máquinas virtuais e memória; a recomendação não garante tempo de compilação.',
  design: 'Quero criar e trabalhar com imagens ou projetos gráficos. Confira os requisitos do aplicativo e a memória de vídeo necessária.',
  general: 'Quero navegar e usar aplicativos do dia a dia. O menor custo continua sujeito às mesmas verificações técnicas e às limitações das peças.',
  study: 'Quero estudar, assistir aulas e usar ferramentas educacionais. Confira os requisitos dos aplicativos antes de comprar.',
  streaming: 'Quero transmitir conteúdo. Confira captura, codificação e os programas usados; o modelo não mede qualidade ou estabilidade da transmissão.',
  upgrade: 'Quero melhorar meu PC atual. Preserve as peças que já possui e compare uma troca por vez, incluindo orçamento e compatibilidade.',
  'cost-benefit': 'Quero equilibrar custo e recursos. Os índices são estimativas do modelo, não medições ou garantia de melhor compra.',
  'high-performance': 'Quero priorizar desempenho dentro do limite de gasto. Confira a cobertura e a origem de cada estimativa.'
};
export function describeBuildObjective(usageType) {
  return buildObjectiveDescriptions[usageType] || 'Escolha o uso principal deste PC. As análises dependem dos dados disponíveis e não substituem os requisitos dos seus programas.';
}
