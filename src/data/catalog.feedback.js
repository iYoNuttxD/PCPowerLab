import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
export const feedbackCatalog = JSON.parse(readFileSync(new URL('./catalog.feedback.json', import.meta.url), 'utf8'));
