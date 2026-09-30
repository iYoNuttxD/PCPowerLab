import { api } from './api.js';
import { buildToApiPayload } from '../utils/buildHelpers.js';

export const compatibilityFixService = {
  suggest: (selectedComponents) => api.post('/compatibility/fix-suggestions', buildToApiPayload(selectedComponents))
};
