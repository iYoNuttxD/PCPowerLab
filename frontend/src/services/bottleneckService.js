import { api } from './api.js';
import { buildToApiPayload } from '../utils/buildHelpers.js';

export const bottleneckService = {
  analyze: (selectedComponents) => api.post('/bottlenecks/analyze', buildToApiPayload(selectedComponents))
};
