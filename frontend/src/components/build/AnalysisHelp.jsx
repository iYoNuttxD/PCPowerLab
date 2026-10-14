const concepts = {
  fps: ['FPS', 'Quadros por segundo: indica quantas imagens o jogo pode exibir a cada segundo. Valores maiores costumam sugerir mais fluidez. Aqui o FPS é estimado a partir dos dados cadastrados, não medido no seu computador.'],
  bottleneck: ['Gargalo', 'Uma peça pode limitar o aproveitamento das outras em determinada tarefa. Isso não significa que ela esteja com defeito. O efeito depende do jogo, dos programas e das configurações de uso.'],
  score: ['Pontuação de desempenho', 'Pontuação simulada pelo modelo para comparar as peças; não é um benchmark medido. Nos componentes, a escala é de 0 a 100: maior indica maior capacidade segundo o cadastro. Pontos não equivalem a FPS nem a uma porcentagem de velocidade.'],
  energy: ['Consumo energético', 'O gráfico usa watts (W), unidade de potência. O consumo da configuração é uma estimativa; a potência da fonte é sua capacidade nominal, não o que ela consome o tempo todo. Energia ao longo do tempo é expressa em kWh e depende do uso; este gráfico não calcula a conta de luz.'],
  compatibility: ['Compatibilidade', 'Verifica se as peças podem funcionar juntas conforme as especificações e regras cadastradas, como encaixe do processador, memória, espaço no gabinete e fonte. Um resultado compatível não garante desempenho nem substitui a conferência das especificações do fabricante.'],
  costBenefit: ['Custo-benefício', 'Relaciona desempenho e preço de referência. No ranking, a melhor relação de cada categoria recebe 100 pontos entre as peças cadastradas e as demais são proporcionais. Compare principalmente peças da mesma categoria: uma nota igual para CPU e GPU não significa que entreguem o mesmo desempenho.'],
  buildScore: ['Nota geral da configuração', 'Combina compatibilidade, desempenho, equilíbrio, orçamento e custo-benefício numa escala de 0 a 100. Barras maiores indicam avaliações melhores no critério. A nota é calculada pelo modelo, não é uma medição de velocidade; confira também os alertas e os dados ausentes.']
};

export default function AnalysisHelp({ topics, title = 'Como interpretar estes resultados' }) {
  return (
    <details className="analysis-help">
      <summary>{title}</summary>
      <dl>
        {topics.map(topic => concepts[topic] && (
          <div key={topic}><dt>{concepts[topic][0]}</dt><dd>{concepts[topic][1]}</dd></div>
        ))}
      </dl>
    </details>
  );
}

export function EstimateNotice() {
  return <p className="analysis-note"><strong>Estimativa, não medição real.</strong> O modelo usa pontuações simuladas, sem benchmark medido. O FPS real pode variar com a cena do jogo, drivers, temperatura e processos em segundo plano; não é garantido. A simulação não substitui a verificação de compatibilidade das peças no assistente.</p>;
}
