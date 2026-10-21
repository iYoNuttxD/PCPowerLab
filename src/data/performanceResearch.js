// Reviews are reading references, never coefficients or build FPS predictions.
const references = {
  'cpu-ryzen-7-7800x3d-box': { source: 'GamersNexus, comparação de CPUs (2024)', url: 'https://gamersnexus.net/cpus/rip-intel-amd-ryzen-7-9800x3d-cpu-review-benchmarks-vs-7800x3d-285k-14900k-more', scope: 'Inclui o 7800X3D em testes de CPU. O restante da bancada e o jogo mudam o resultado; não mede sua montagem.' },
  'cpu-ryzen-9-9900x-box': { source: 'GamersNexus, Ryzen 9 9900X (2024)', url: 'https://gamersnexus.net/cpus/amd-ryzen-9-9900x-cpu-review-benchmarks-vs-14700k-7900x-9950x-more', scope: 'Testes separados de renderização, compilação, jogos e energia. Cada carga tem resultado próprio; não vira uma nota universal.' },
  'cpu-ryzen-5-4500-box': { source: 'Tom’s Hardware, Ryzen 5 4500 (2022)', url: 'https://www.tomshardware.com/reviews/amd-ryzen-4-4500-ryzen-3-4100-cpu-review/3', scope: 'Testes de CPU com RTX 3090 para reduzir a limitação da GPU. Não representam FPS com uma placa de entrada.' },
  'gpu-msi-rtx-5060-ti-ventus-2x-oc-plus-16g': { source: 'TweakTown, MSI VENTUS 2X OC PLUS 16G (2026)', url: 'https://www.tweaktown.com/reviews/11444/msi-geforce-rtx-5060-ti-16g-ventus-2x-oc-plus/index.html', scope: 'Modelo exato em bancada com Ryzen 7 9800X3D e 32 GB DDR5. Resultados nativos e com DLSS são distintos. Não são previsão para sua CPU.' }
};
export function performanceResearchFor(component) {
  return component?.performanceModelStatus === 'unavailable' ? references[component.id] ?? null : null;
}
