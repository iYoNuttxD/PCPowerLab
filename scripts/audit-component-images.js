import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { listComponentRecords } from '../src/data/component.repository.js';
import { approvedComponentImageCrop, validImageCrop, imageCropViewBox, imageCropsOverlap, reviewedCompositeOriginal } from '../frontend/src/utils/componentImage.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaPrefix = '/images/components/';
const extensions = new Map([['.jpg', 'JPEG'], ['.jpeg', 'JPEG'], ['.png', 'PNG'], ['.webp', 'WEBP'], ['.avif', 'AVIF']]);
const metadataFields = ['componentId', 'imagePath', 'imageSource', 'manufacturerProductUrl', 'rightsBasis', 'imageType', 'lastVerifiedAt', 'status', 'author'];
export const defaultImageLimits = Object.freeze({ maxBytes: 2 * 1024 * 1024, maxDimension: 4096, maxPixels: 16 * 1024 * 1024, minDimension: 64 });
// One approved original exceeds the normal 2 MiB limit; its bytes remain unchanged.
const reviewedOriginalMaxBytes = 3 * 1024 * 1024;
const textPresent = (value) => typeof value === 'string' && value.trim().length > 0;
const validSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const inside = (root, target) => { const relative = path.relative(root, target); return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };

function httpsUrl(value) {
  if (!textPresent(value) || !/^https:\/\//i.test(value) || /\s/.test(value) || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

function validDate(value, now) {
  if (!textPresent(value) || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const time = value.length > 10 ? value.slice(11, 19).split(':').map(Number) : [0, 0, 0];
  if (time[0] > 23 || time[1] > 59 || time[2] > 59) return false;
  const date = new Date(value);
  const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && Number.isFinite(calendarDate.getTime()) && calendarDate.toISOString().slice(0, 10) === value.slice(0, 10) && date.getTime() <= now.getTime();
}

function localPath(imagePath, root) {
  if (!textPresent(imagePath) || !imagePath.startsWith(mediaPrefix) || /[\\%?#\0]/.test(imagePath)) return null;
  const relative = imagePath.slice(mediaPrefix.length);
  if (!relative || relative.split('/').some((segment) => !segment || segment === '.' || segment === '..')) return null;
  const resolved = path.resolve(root, relative);
  return inside(root, resolved) ? resolved : null;
}

function scanMedia(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (!/\.(?:md|txt|json)$/i.test(entry.name) && entry.name !== '.gitkeep') files.push(fullPath);
    }
  }
  walk(root);
  return files.sort();
}

function decodeFiles(files, limits, pythonExecutable) {
  if (files.length === 0) return new Map();
  const result = spawnSync(pythonExecutable, [path.join(projectRoot, 'scripts/inspect-component-images.py')], {
    input: JSON.stringify({ files, maxBytes: limits.maxBytes, maxPixels: limits.maxPixels, maxDimension: limits.maxDimension }), encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Image decoder unavailable; verification cannot be skipped. ${result.error?.message || result.stdout?.trim() || result.stderr?.trim() || `Exit ${result.status}`}`);
  }
  const decoded = JSON.parse(result.stdout);
  if (!Array.isArray(decoded.results) || decoded.results.length !== files.length) throw new Error('Image decoder returned an incomplete result.');
  return new Map(decoded.results.map((result) => [result.path, result]));
}

/**
 * Audits the complete, current active catalog, never a fixed list of IDs.
 * mediaRoot is the directory exposed at /images/components/, not public/.
 * A passing result validates bytes and recorded evidence, not human product
 * identity, current source availability, or legal permission to reuse a photo.
 */
export function auditComponentImages({ components = listComponentRecords({ includeInactive: true }), mediaRoot = path.join(projectRoot, 'frontend/public/images/components'), now = new Date(), limits: overrides = {}, pythonExecutable = process.env.PYTHON || 'python3', catalogSource = 'repository:listComponentRecords({ includeInactive: true })' } = {}) {
  if (!Array.isArray(components) || components.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new TypeError('The catalog must be an array of component objects.');
  now = new Date(now);
  if (!Number.isFinite(now.getTime())) throw new TypeError('now must be a valid date.');
  const limits = { ...defaultImageLimits, ...overrides };
  for (const [key, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`Invalid image limit: ${key}`);
  const root = path.resolve(mediaRoot);
  const realRoot = fs.existsSync(root) ? fs.realpathSync(root) : root;
  const active = components.filter((component) => component.active !== false);
  const issues = [];
  const reportRows = [];
  const fileInfo = new Map();
  const references = new Set();
  const idCounts = new Map();
  for (const component of active) idCounts.set(component.id, (idCounts.get(component.id) || 0) + 1);
  // Retained inactive assets are not orphans, but never count as active coverage.
  for (const component of components) {
    const filename = localPath(component.image?.imagePath, root);
    if (filename) references.add(filename);
  }
  for (const component of active) {
    const metadata = component.image && typeof component.image === 'object' && !Array.isArray(component.image) ? component.image : null;
    const row = {
      id: component.id ?? null, name: component.name ?? null, brand: component.brand ?? null, category: component.category ?? null,
      partNumber: component.partNumber ?? null, specs: component.specs ?? {}, image: metadata ? { ...metadata } : null,
      declaredStatus: metadata?.status ?? null, status: 'blocked', fallback: true, blocker: null,
      missingMetadata: metadataFields.filter((field) => !textPresent(metadata?.[field])), issues: [], file: null
    };
    const add = (code, message, field) => { const issue = { code, componentId: row.id, message, ...(field ? { field } : {}) }; row.issues.push(issue); issues.push(issue); };
    if (!textPresent(component.id)) add('invalid_component_id', 'O componente não tem ID válido.');
    if (idCounts.get(component.id) > 1) add('duplicate_component_id', 'O ID aparece mais de uma vez no catálogo ativo.');
    if (!metadata) add('missing_image_metadata', 'Sem metadados de imagem; exibe fallback de categoria.');
    if (row.missingMetadata.length) add('missing_metadata', `Metadados ausentes: ${row.missingMetadata.join(', ')}.`);
    if (metadata?.componentId !== component.id) add('component_id_mismatch', 'A imagem não está vinculada ao ID exato deste componente.', 'componentId');
    if (metadata?.status !== 'verified') add('unverified_status', 'A imagem não tem status verified.', 'status');
    if (metadata?.status === 'blocked' && !textPresent(metadata.blocker)) add('missing_blocker', 'Um registro blocked precisa de motivo explícito.', 'blocker');
    if (metadata?.status === 'verified' && textPresent(metadata.blocker)) add('conflicting_blocker', 'Um registro verified ainda declara um bloqueio.', 'blocker');
    if (metadata?.identityLevel != null && !['exact-model', 'model-family', 'representative-product'].includes(metadata.identityLevel)) add('invalid_identity_level', 'identityLevel deve declarar exact-model, model-family ou representative-product.');
    if (['model-family', 'representative-product'].includes(metadata?.identityLevel) && !textPresent(metadata.identityNotes)) add('missing_identity_notes', 'Uma fotografia de família precisa explicar a correspondência visual e os limites da variante.');
    if (metadata?.identityLevel === 'representative-product' && !textPresent(metadata.depictedProduct)) add('missing_depicted_product', 'A ilustração deve nomear o produto real fotografado sem alterar o registro genérico.');
    if (metadata?.license && metadata.license !== 'Permission not established' && !httpsUrl(metadata.licenseUrl)) add('missing_license_url', 'Uma licença declarada precisa de fonte HTTPS.');
    if (metadata?.imageType !== 'photo') add('not_product_photo', 'Somente imageType photo conta como fotografia; ícones e placeholders são fallback.', 'imageType');
    for (const field of ['imageSource', 'manufacturerProductUrl', 'licenseUrl']) {
      if (textPresent(metadata?.[field]) && !httpsUrl(metadata[field])) add('unsafe_metadata_url', `${field} deve ser uma URL HTTPS sem credenciais.`, field);
    }
    if (metadata && Object.hasOwn(metadata, 'sha256') && !validSha256(metadata.sha256)) add('invalid_reviewed_sha256', 'sha256 revisado deve conter exatamente 64 caracteres hexadecimais minúsculos.', 'sha256');
    if (textPresent(metadata?.lastVerifiedAt) && !validDate(metadata.lastVerifiedAt, now)) add('invalid_verification_date', 'lastVerifiedAt deve conter data ISO válida, não futura.', 'lastVerifiedAt');
    if (metadata && Object.hasOwn(metadata, 'crop')) {
      if (!validImageCrop(metadata.crop)) add('invalid_image_crop', 'A janela da fotografia deve conter quatro cantos convexos inteiros dentro da imagem original.', 'crop');
      if (!approvedComponentImageCrop(metadata, component.id)) add('unapproved_image_crop', 'O enquadramento não corresponde à revisão do ID, SHA-256 e janela exata autorizados.', 'crop');
    }
    const filename = localPath(metadata?.imagePath, root);
    if (!filename) {
      add(textPresent(metadata?.imagePath) ? 'unsafe_image_path' : 'missing_image_path', 'A foto deve usar um caminho local seguro sob /images/components/.', 'imagePath');
    } else {
      const extension = path.extname(filename).toLowerCase();
      if (!extensions.has(extension)) add('unsupported_format', 'Formato permitido: WebP, PNG, JPEG ou AVIF.', 'imagePath');
      try {
        const realFile = fs.realpathSync(filename);
        if (!inside(realRoot, realFile)) add('path_escape', 'O arquivo ou symlink sai do diretório de mídia permitido.', 'imagePath');
        else {
          const stats = fs.statSync(realFile);
          if (!stats.isFile()) add('not_a_file', 'O caminho de imagem não aponta para um arquivo.', 'imagePath');
          else {
            row.file = { path: metadata.imagePath, bytes: stats.size, sha256: null, width: null, height: null, format: null, decoded: false };
            const allowedBytes = !Object.hasOwn(overrides, 'maxBytes') && approvedComponentImageCrop(metadata, component.id)
              ? reviewedOriginalMaxBytes : limits.maxBytes;
            if (!stats.size) add('empty_file', 'O arquivo está vazio.');
            else if (stats.size > allowedBytes) add('file_too_large', `Arquivo excede ${allowedBytes} bytes.`);
            else {
              const sha256 = createHash('sha256').update(fs.readFileSync(realFile)).digest('hex');
              row.file.sha256 = sha256;
              fileInfo.set(filename, { realFile, sha256, allowedBytes });
            }
          }
        }
      } catch (error) {
        add(error.code === 'ENOENT' ? 'missing_file' : 'unreadable_file', error.code === 'ENOENT' ? 'O arquivo de imagem não existe.' : `Não foi possível ler a imagem: ${error.code || error.message}.`, 'imagePath');
      }
    }
    reportRows.push(row);
  }
  const decodeLimits = { ...limits, maxBytes: Math.max(limits.maxBytes, ...[...fileInfo.values()].map(info => info.allowedBytes)) };
  const decoded = decodeFiles([...new Set([...fileInfo.values()].map(({ realFile }) => realFile))], decodeLimits, pythonExecutable);
  for (const row of reportRows) {
    if (!row.file?.sha256) continue;
    const info = fileInfo.get(localPath(row.image.imagePath, root));
    const result = decoded.get(info.realFile);
    const add = (code, message) => { const issue = { code, componentId: row.id, message }; row.issues.push(issue); issues.push(issue); };
    if (!result?.valid) add('invalid_image_bytes', `Falha na decodificação completa: ${result?.error || 'sem resultado'}.`);
    else {
      if (result.sha256 !== row.file.sha256) add('file_changed_during_audit', 'Os bytes mudaram entre leitura e decodificação; repetir a auditoria com os ativos estáveis.');
      Object.assign(row.file, { decoded: true, width: result.width, height: result.height, format: result.format, sha256: result.sha256 });
      if (validSha256(row.image.sha256) && row.image.sha256 !== result.sha256) add('reviewed_sha256_mismatch', 'Os bytes locais não correspondem ao SHA-256 da fotografia revisada; revalidar o arquivo e seus direitos.');
      if (result.format !== extensions.get(path.extname(row.image.imagePath).toLowerCase())) add('format_mismatch', 'A extensão não corresponde ao formato real do arquivo.');
      if (row.image.crop && (row.image.crop.sourceWidth !== result.width || row.image.crop.sourceHeight !== result.height)) add('crop_source_dimensions_mismatch', 'As dimensões declaradas da janela não correspondem aos bytes decodificados.');
      const cropBox = imageCropViewBox(row.image.crop);
      if (cropBox && Math.min(cropBox[2], cropBox[3]) < limits.minDimension) add('crop_too_small', `A janela deve ter pelo menos ${limits.minDimension}px em ambas as dimensões.`);
      if (Math.min(result.width, result.height) < limits.minDimension) add('image_too_small', `Ambas as dimensões devem ser de pelo menos ${limits.minDimension}px.`);
    }
  }
  const hashes = new Map();
  for (const row of reportRows) {
    if (row.file?.sha256) {
      const matching = hashes.get(row.file.sha256) || [];
      matching.push(row);
      hashes.set(row.file.sha256, matching);
    }
  }
  const duplicateFiles = [];
  const reviewedSharedOriginals = [];
  const reviewedSharedFamilies = [];
  for (const [sha256, rows] of hashes) {
    const componentIds = [...new Set(rows.map((row) => row.id))];
    if (componentIds.length < 2) continue;
    // The exception is pinned to this original and two reviewed model windows.
    // A new hash, ID, overlapping window, invalid row or inconsistent credits still fails.
    const sourceFields = ['imagePath', 'imageSource', 'originalAssetUrl', 'originalVideoUrl', 'author'];
    const approvedWindows = sha256 === reviewedCompositeOriginal.sha256
      && rows.every(row => row.issues.length === 0 && row.file.decoded && approvedComponentImageCrop(row.image, row.id)
        && sourceFields.every(field => row.image[field] === rows[0].image[field]))
      && rows.every((row, index) => rows.slice(index + 1).every(other => !imageCropsOverlap(row.image.crop, other.image.crop)));
    if (approvedWindows) {
      reviewedSharedOriginals.push({ sha256, componentIds, imagePath: rows[0].image.imagePath, crops: rows.map(row => ({ componentId: row.id, ...row.image.crop })) });
      continue;
    }
    const approvedFamily = rows.every(row => row.issues.length === 0 && row.file.decoded
      && row.image.identityLevel === 'model-family' && textPresent(row.image.identityNotes)
      && textPresent(row.image.sharedAssetGroup) && row.image.sharedAssetGroup === rows[0].image.sharedAssetGroup
      && row.image.imageSource === rows[0].image.imageSource
      && Array.isArray(row.image.sharedAssetComponentIds)
      && componentIds.every(id => row.image.sharedAssetComponentIds.includes(id))
      && row.image.sha256 === sha256);
    if (approvedFamily) {
      reviewedSharedFamilies.push({ sha256, componentIds, group: rows[0].image.sharedAssetGroup, imageSource: rows[0].image.imageSource });
      continue;
    }
    duplicateFiles.push({ sha256, componentIds, paths: [...new Set(rows.map((row) => row.image.imagePath))] });
    for (const row of rows) {
      const issue = { code: 'suspect_duplicate_image', componentId: row.id, message: `Mesmos bytes usados por IDs distintos: ${componentIds.join(', ')}. Exige revisão de modelo/variante.` };
      row.issues.push(issue);
      issues.push(issue);
    }
  }
  const orphanFiles = scanMedia(root).filter((filename) => !references.has(filename)).map((filename) => `${mediaPrefix}${path.relative(root, filename).split(path.sep).join('/')}`);
  for (const imagePath of orphanFiles) issues.push({ code: 'orphan_file', componentId: null, imagePath, message: 'Arquivo sem referência no catálogo fornecido (incluindo inativos).' });
  if (!active.length) issues.push({ code: 'empty_catalog', componentId: null, message: 'O catálogo ativo está vazio; não é possível afirmar cobertura.' });
  for (const row of reportRows) {
    row.status = row.issues.length === 0 ? 'verified' : 'blocked';
    row.fallback = row.status !== 'verified';
    row.blocker = row.status === 'verified' ? null : [textPresent(row.image?.blocker) ? row.image.blocker : null, ...row.issues.map(({ message }) => message)].filter(Boolean).join(' ');
  }
  const verified = reportRows.filter((row) => row.status === 'verified').length;
  const identityLevels = { 'exact-model': 0, 'model-family': 0, 'representative-product': 0, unclassified: 0 };
  for (const row of reportRows.filter(row => row.status === 'verified')) identityLevels[row.image.identityLevel || 'unclassified']++;
  const categories = Object.create(null);
  for (const row of reportRows) {
    const key = row.category || 'unknown';
    categories[key] ||= { active: 0, verified: 0, blocked: 0 };
    categories[key].active++;
    categories[key][row.status]++;
  }
  return {
    schemaVersion: 1, generatedAt: now.toISOString(), catalogSource,
    result: issues.length === 0 ? 'complete' : 'partial', passed: issues.length === 0,
    summary: { active: active.length, inactiveExcluded: components.length - active.length, verified, blocked: active.length - verified,
      actualPhotos: verified, identityLevels, reviewedSharedFamilyGroups: reviewedSharedFamilies.length,
      fallbackCount: active.length - verified, coveragePercent: active.length ? Number((100 * verified / active.length).toFixed(2)) : 0,
      orphanFiles: orphanFiles.length, suspectDuplicateGroups: duplicateFiles.length, issueCount: issues.length, categories },
    validationLimits: { ...limits, reviewedOriginalException: { sha256: reviewedCompositeOriginal.sha256, maxBytes: Object.hasOwn(overrides, 'maxBytes') ? limits.maxBytes : reviewedOriginalMaxBytes }, allowedFormats: [...new Set(extensions.values())], decoder: 'Pillow (verify + full load)' },
    verificationScope: 'Validação estrutural e decodificação local. status verified é uma declaração de revisão humana registrada, não uma prova produzida por este script. O script não confirma identidade visual/modelo/variante, titularidade, permissão jurídica, disponibilidade remota ou o conteúdo atual das fontes. As imagens públicas de referência acadêmica podem ter permissão de reutilização não estabelecida; esse estado deve ser registrado sem inventar licença. Fotografias de família visual são contabilizadas separadamente e não atestam SKU exato.',
    components: reportRows, issues, orphanFiles, duplicateFiles, reviewedSharedOriginals, reviewedSharedFamilies
  };
}

const cell = (value) => String(value ?? '—').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '\\|').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('\n', ' ').replaceAll('\r', ' ');
export function renderImageAuditMarkdown(report) {
  const { summary } = report;
  const lines = [
    '# RA2 — Cobertura de imagens do catálogo', '', `Gerado em: ${report.generatedAt}`, '', `Origem: ${report.catalogSource}`, '',
    `Resultado: **${report.result === 'complete' ? 'cobertura estrutural completa' : 'PARCIAL / BLOQUEADO'}**`, '',
    `- Componentes ativos: ${summary.active}`, `- Fotografias com metadados verified e validação estrutural: ${summary.verified}`,
    `- Identidade visual: ${summary.identityLevels['exact-model']} modelo exato; ${summary.identityLevels['model-family']} família; ${summary.identityLevels['representative-product']} ilustrativas; ${summary.identityLevels.unclassified} sem classificação`, `- Bloqueados / fallback: ${summary.blocked}`, `- Cobertura: ${summary.coveragePercent}%`, `- Inativos excluídos: ${summary.inactiveExcluded}`,
    `- Arquivos órfãos: ${summary.orphanFiles}`, `- Grupos duplicados suspeitos (SHA-256): ${summary.suspectDuplicateGroups}`, '',
    '## Limites e revisão de evidências', '', report.verificationScope, '',
    `Decodificador: ${report.validationLimits.decoder}. Formatos: ${report.validationLimits.allowedFormats.join(', ')}. Máximo: ${report.validationLimits.maxBytes} bytes, ${report.validationLimits.maxDimension}px por dimensão, ${report.validationLimits.maxPixels} pixels; mínimo: ${report.validationLimits.minDimension}px por dimensão.`, '',
    'A auditoria usa todos os registros ativos recebidos. Novos IDs administrativos precisam entrar no snapshot de GET /api/v1/components usado com --catalog. A leitura padrão do repositório não enxerga alterações em memória de outro processo. Não há contagem fixa nem aprovação de placeholder como fotografia.', '',
    '## Cobertura por categoria', '', '| Categoria | Ativos | Verificados | Bloqueados |', '| --- | ---: | ---: | ---: |'
  ];
  for (const [category, counts] of Object.entries(summary.categories).sort(([a], [b]) => a.localeCompare(b))) lines.push(`| ${cell(category)} | ${counts.active} | ${counts.verified} | ${counts.blocked} |`);
  lines.push('', '## Inventário por ID e variante', '', '| ID | Nome | Marca | Categoria | Part number | Specs / variante | Estado | Imagem local | Bloqueio |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of report.components) lines.push(`| ${[row.id, row.name, row.brand, row.category, row.partNumber, JSON.stringify(row.specs), row.status, row.image?.imagePath, row.blocker].map(cell).join(' | ')} |`);
  lines.push('', '## Evidências registradas por ID', '', '| ID | Origem da foto | Produto do fabricante | Base de direitos | Autor | Licença | URL da licença | Última verificação |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of report.components) lines.push(`| ${[row.id, row.image?.imageSource, row.image?.manufacturerProductUrl, row.image?.rightsBasis, row.image?.author, row.image?.license, row.image?.licenseUrl, row.image?.lastVerifiedAt].map(cell).join(' | ')} |`);
  lines.push('', '## Arquivos órfãos', '', ...(report.orphanFiles.length ? report.orphanFiles.map((file) => `- ${cell(file)}`) : ['Nenhum.']), '', '## Duplicações suspeitas', '', ...(report.duplicateFiles.length ? report.duplicateFiles.map((group) => `- ${group.componentIds.map(cell).join(', ')}: SHA-256 ${group.sha256}`) : ['Nenhuma.']), '', '## Reprodução', '', 'Executar: npm run audit:images -- --report', '', 'Catálogo em execução: salvar a resposta completa de GET /api/v1/components em JSON e executar npm run audit:images -- --catalog caminho/catalogo.json --report. Não usar resposta filtrada por categoria.', '', 'A saída é estrita: código 0 apenas sem pendências; 1 para cobertura parcial ou falhas; 2 para erro operacional. O JSON correspondente preserva todos os metadados, campos ausentes e erros por componente.', '');
  return lines.join('\n');
}

export function readCatalogSnapshot(filename) {
  const snapshot = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (snapshot?.success === false) throw new TypeError('The API snapshot is an error response.');
  const records = Array.isArray(snapshot) ? snapshot : Array.isArray(snapshot?.data) ? snapshot.data : snapshot?.components;
  if (!Array.isArray(records)) throw new TypeError('Snapshot must be a component array, { data: [...] } API response, or { components: [...] } inventory.');
  return records;
}

export function runImageAuditCli(args = process.argv.slice(2)) {
  const options = {};
  let reportPrefix = null;
  let json = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/audit-component-images.js [--catalog snapshot.json] [--media-root directory] [--report [output-prefix]] [--json] [--strict]\nRequires Python 3 + Pillow for full byte decoding. Default media root: frontend/public/images/components.\n--report writes Markdown and JSON (default docs/RA2-COBERTURA-IMAGENS).\nExit: 0 complete; 1 partial/blocked; 2 operational error. Strict is always enabled.');
      return 0;
    }
    if (arg === '--catalog' || arg === '--media-root') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new TypeError(`Missing value for ${arg}`);
      if (arg === '--catalog') { options.components = readCatalogSnapshot(value); options.catalogSource = `snapshot:${path.resolve(value)}`; }
      else options.mediaRoot = path.resolve(value);
    } else if (arg === '--report') {
      reportPrefix = args[index + 1] && !args[index + 1].startsWith('--') ? args[++index] : path.join(projectRoot, 'docs/RA2-COBERTURA-IMAGENS');
    } else if (arg === '--json') json = true;
    else if (arg !== '--strict') throw new TypeError(`Unknown argument: ${arg}`);
  }
  const report = auditComponentImages(options);
  if (reportPrefix) {
    const prefix = path.resolve(reportPrefix).replace(/\.(?:md|json)$/i, '');
    fs.mkdirSync(path.dirname(prefix), { recursive: true });
    fs.writeFileSync(`${prefix}.json`, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(`${prefix}.md`, renderImageAuditMarkdown(report));
  }
  console.log(json ? JSON.stringify(report, null, 2) : `${report.result.toUpperCase()}: ${report.summary.verified}/${report.summary.active} active components verified (${report.summary.coveragePercent}%). ${report.summary.blocked} blocked/fallback; ${report.summary.orphanFiles} orphan files; ${report.summary.suspectDuplicateGroups} suspect duplicate groups.${reportPrefix ? ` Reports: ${path.resolve(reportPrefix).replace(/\.(?:md|json)$/i, '')}.{md,json}` : ''}`);
  return report.passed ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = runImageAuditCli(); }
  catch (error) { console.error(`Image audit failed: ${error.message}`); process.exitCode = 2; }
}
