import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const styles = new URL('../../src/styles/', import.meta.url);
const sources = Object.fromEntries(await Promise.all(['theme', 'global', 'journey'].map(async name => [name, postcss.parse(await readFile(new URL(`${name}.css`, styles), 'utf8'))])));
const tokens = {};
sources.theme.walkDecls(declaration => { if (declaration.prop.startsWith('--')) tokens[declaration.prop] = declaration.value; });
export function declaration(sheet, selector, property) {
  let result;
  sources[sheet].walkRules(rule => {
    if (rule.selector === selector) rule.walkDecls(property, value => { result = value.value; });
  });
  if (!result) throw new Error(`Missing audited declaration: ${sheet} ${selector} ${property}`);
  return result;
}
export function color(value) {
  const resolved = value.replace(/var\((--[\w-]+)\)/g, (_match, name) => {
    if (!tokens[name]) throw new Error(`Missing color token: ${name}`);
    return tokens[name];
  });
  if (/^#[\da-f]{6}$/i.test(resolved)) return [...resolved.slice(1).match(/../g).map(channel => parseInt(channel, 16)), 1];
  const rgba = resolved.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) { const values = rgba[1].split(',').map(Number); return [...values.slice(0, 3), values[3] ?? 1]; }
  throw new Error(`Unsupported audited color: ${value} -> ${resolved}`);
}
export function composite(foreground, background) {
  const [red, green, blue, alpha = 1] = foreground;
  return [red, green, blue].map((channel, index) => channel * alpha + background[index] * (1 - alpha)).concat(1);
}
function luminance(value) {
  return value.slice(0, 3).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
}
export function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
const surfaces = ['--bg', '--bg-elevated', '--panel', '--panel-strong'];
const scope = ':is(.journey-wizard, .catalog-page, .summary-page, .recommendation-card, .modal-panel)';
export function contrastAudit() {
  const checks = [];
  const check = (name, foreground, background, minimum, criterion, source) => {
    const foregroundColor = typeof foreground === 'string' ? color(foreground) : foreground;
    const backgroundColor = typeof background === 'string' ? color(background) : background;
    checks.push({ name, ratio: contrast(foregroundColor, backgroundColor), minimum, criterion, source });
  };
  for (const surface of surfaces) {
    for (const text of ['--text', '--muted', '--cyan', '--green', '--yellow', '--red']) {
      check(`${text} text on ${surface}`, `var(${text})`, `var(${surface})`, 4.5, '1.4.3 normal text', 'theme.css tokens used by global.css and journey.css');
    }
    check(`focus ring beside ${surface}`, 'var(--focus)', `var(${surface})`, 3, '1.4.11 / 2.4.7 focus indicator', 'journey.css :focus-visible (3px outline, 3px offset)');
    check(`control border on ${surface}`, 'var(--border-strong)', `var(${surface})`, 3, '1.4.11 control boundary', 'global.css .field controls / .btn-secondary / .btn-ghost');
  }
  check('input placeholder', declaration('global', 'input::placeholder, textarea::placeholder', 'color'), 'var(--bg)', 4.5, '1.4.3 normal text', 'global.css placeholder / field background');
  for (const variant of ['primary', 'secondary', 'success', 'danger']) {
    const selector = `.btn-${variant}`;
    const foreground = declaration('global', selector, 'color');
    const background = declaration('global', selector, 'background');
    check(`${variant} button text`, foreground, background, 4.5, '1.4.3 normal text', `global.css ${selector}`);
    check(`${variant} button visible boundary`, declaration('global', selector, 'border-color'), 'var(--panel-strong)', 3, '1.4.11 control boundary', `global.css ${selector}`);
    // Disabled controls are exempt under WCAG, but retain legible text here.
    const opacity = Number(declaration('global', '.btn:disabled', 'opacity'));
    const disabledBackground = composite([...color(background).slice(0, 3), opacity], color('var(--panel-strong)'));
    const disabledText = composite([...color(foreground).slice(0, 3), opacity], color('var(--panel-strong)'));
    check(`${variant} disabled text (non-normative)`, disabledText, disabledBackground, 4.5, 'extra legibility target; disabled exempt', `global.css ${selector} + .btn:disabled opacity`);
  }
  for (const type of ['info', 'success', 'warning', 'error']) {
    const selector = `${scope} .alert-${type}`;
    const fill = declaration('journey', selector, 'background');
    const layers = [...fill.matchAll(/var\((--[\w-]+)\)/g)].map(match => match[1]);
    if (layers.length !== 3 || layers[0] !== layers[1] || layers[2] !== '--panel') throw new Error(`Update compositing model for ${selector}: ${fill}`);
    const background = composite(color(`var(${layers[0]})`), color(`var(${layers[2]})`));
    check(`${type} alert title`, declaration('journey', selector, 'color'), background, 4.5, '1.4.3 normal text', `journey.css ${selector}; alpha composited over --panel`);
    check(`${type} alert body`, declaration('journey', `${scope} .alert :is(p, li)`, 'color'), background, 4.5, '1.4.3 normal text', 'journey.css alert body on composited fill');
    check(`${type} alert boundary/icon`, declaration('journey', selector, 'border-color'), background, 3, '1.4.11 non-text indicator', 'journey.css status border/icon on composited fill');
    check(`${type} alert focus`, 'var(--focus)', background, 3, '1.4.11 / 2.4.7 focus indicator', 'journey.css focus ring on composited fill');
  }
  check('large summary metric', 'var(--text)', 'var(--bg-elevated)', 3, '1.4.3 large bold text', 'journey.css .summary-page .metric-grid strong (1.375rem bold)');
  check('active filter text', declaration('global', '.active-filter-list button', 'color'), declaration('global', '.active-filter-list button', 'background'), 4.5, '1.4.3 normal text', 'global.css active filters');
  check('active filter boundary', declaration('global', '.active-filter-list button', 'border').split(' ').at(-1), 'var(--panel-strong)', 3, '1.4.11 control boundary', 'global.css active filters');
  return checks;
}
