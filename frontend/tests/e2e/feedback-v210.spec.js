import { currentBuild, currentBuildIds, activePart } from './helpers/catalog.js';
// Collectable browser regressions. Execution must be reported separately from
// the source/SSR contracts; these tests are not evidence until a browser runs.
import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { generateBuildSummary } from '../../../src/services/buildSummaryService.js';
import { games } from '../../../src/data/games.js';
const catalog = listComponents();
const ids = currentBuildIds;
const selection = currentBuild(catalog);
selection.fans=[];
async function setup(page, extra={}) {
 await page.addInitScript(state=>localStorage.setItem('pcpowerlab-build-state',JSON.stringify(state)),{selectedComponents:selection,budget:{amount:6000,currency:'BRL',priority:'cost-benefit'},game:{gameId:games[0].id,targetResolution:'1080p',qualityPreset:'high'},...extra});
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1','');
  const data=path==='/components'?catalog:path==='/performance/games'?games:path==='/build-summary'?generateBuildSummary(route.request().postDataJSON()):path==='/purchase-links/build'?{}:[];
  return route.fulfill({json:{success:true,data}});
 });
}
test('known socket mismatch is contextual, blocks next, and preserves all other choices when resolved',async({page})=>{
 const incompatible=activePart(catalog, 'mb-gigabyte-b650m-d3hp');
 await setup(page,{wizardStep:'motherboard',selectedComponents:{...selection,motherboard:incompatible}});
 await page.goto('/build');
 await expect(page.getByRole('alert').filter({hasText:'Conflito entre as peças escolhidas'})).toContainText('AM4');
 await expect(page.getByRole('button',{name:'Avançar',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:`Selecionar: ${selection.motherboard.name}`,exact:true}).click();
 await expect(page.getByRole('button',{name:'Avançar',exact:true})).toBeEnabled();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('pcpowerlab-build-state')));
 for(const [slot,id]of Object.entries(ids))expect(stored.selectedComponents[slot].id).toBe(id);
});
test('summary success hint and horizontal energy labels stay coherent at narrow widths',async({page})=>{
 await setup(page);await page.goto('/summary');
 await page.getByRole('button',{name:'Simular desempenho',exact:true}).click();
 await expect(page.locator('#summary-simulation-hint')).toContainText('Estimativa atualizada');
 await expect(page.locator('#summary-simulation-hint')).not.toContainText('Execute a simulação');
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:800});
  const chart=page.getByRole('group',{name:'Gráfico de consumo energético da build',exact:true});
  await chart.scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const labels=[];
  for(const label of ['Consumo','Referência','Fonte']){
   const tick=chart.getByText(label,{exact:true});
   await expect(tick).toBeVisible();
   labels.push(await tick.evaluate(node=>{const box=node.getBoundingClientRect();return {top:box.top,bottom:box.bottom};}));
  }
  expect(labels).toHaveLength(3);
  for(let index=1;index<labels.length;index++)expect(labels[index].top).toBeGreaterThanOrEqual(labels[index-1].bottom);
 }
});
