import { api } from './api.js';
import { buildQueryParams } from '../utils/queryParams.js';

export const buildExportService = {
  exportJson: (payload) => api.post('/build-export/json', payload),
  exportSavedBuildJson: (buildId, options = {}) => (
    api.get(`/saved-builds/${encodeURIComponent(buildId)}/export/json${buildQueryParams(options)}`)
  )
};
