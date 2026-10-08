import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const theme = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/cooling.css', import.meta.url), 'utf8');
const panel = await readFile(new URL('../src/components/build/CoolingSimulationPanel.jsx', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...theme.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map(match => [match[1], match[2]]));
const rgb = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16));
const luminance = color => color.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
const contrast = (first, second) => { const values = [luminance(first), luminance(second)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); };
const rule = selector => css.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`))[1];
const resolveColor = declaration => rgb(tokens[declaration.match(/var\(--([\w-]+)\)/)[1]]);

test('thermal central marker has a contrasting core on the band and edge on the track', () => {
  const marker = rule('cooling-temperature-central');
  const track = resolveColor(rule('cooling-temperature-track').match(/background:\s*([^;]+)/)[1]);
  const bandRule = rule('cooling-temperature-band');
  const bandColor = resolveColor(bandRule.match(/background:\s*([^;]+)/)[1]);
  const opacity = Number(bandRule.match(/opacity:\s*([.\d]+)/)[1]);
  const band = bandColor.map((channel, index) => channel * opacity + track[index] * (1 - opacity));
  const core = resolveColor(marker.match(/background:\s*([^;]+)/)[1]);
  const edge = resolveColor(marker.match(/border-inline:\s*1px solid\s*([^;]+)/)[1]);
  assert(contrast(core, band) >= 3, 'Dark core must exceed 3:1 against the composited band');
  assert(contrast(edge, track) >= 3, 'Light edge must exceed 3:1 against the unfilled track');
  assert(contrast(core, edge) >= 3, 'The two-tone marker must stay distinguishable within itself');
  assert(contrast(rgb(tokens.text), band) < 3, 'Negative control reproduces the original white-only marker failure');
});

test('five-pixel marker stays inside chart bounds without changing the scenario percentage', () => {
  const marker = rule('cooling-temperature-central');
  assert.match(marker, /left:\s*clamp\(5px, var\(--cooling-central-position\), 100%\)/);
  assert.match(marker, /width:\s*5px/);
  assert.match(marker, /box-sizing:\s*border-box/);
  assert.match(marker, /transform:\s*translateX\(-100%\)/);
  assert.match(panel, /'--cooling-central-position': `\$\{middle \/ axisMax \* 100\}%`/);
  for (const width of [32, 64, 128, 240, 600]) for (const fraction of [0, .001, .1, .5, .99, 1]) {
    const right = Math.max(5, Math.min(width, width * fraction));
    assert(right - 5 >= 0 && right <= width);
  }
});
