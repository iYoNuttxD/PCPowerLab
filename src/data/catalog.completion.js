import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
export const completionCatalog = JSON.parse(readFileSync(new URL('./catalog.completion.json', import.meta.url), 'utf8'));
