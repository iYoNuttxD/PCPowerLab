import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

// Manufacturer facts only. Price observations and performance models are independent.
export const catalogV3 = JSON.parse(readFileSync(new URL('./catalog.v3.json', import.meta.url), 'utf8'));
