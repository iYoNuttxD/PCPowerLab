import { api } from './api.js';

export const savedBuildVersionsService = {
  list: (buildId) => api.get(`/saved-builds/${encodeURIComponent(buildId)}/versions`),
  getById: (buildId, versionId) => (
    api.get(`/saved-builds/${encodeURIComponent(buildId)}/versions/${encodeURIComponent(versionId)}`)
  ),
  create: (buildId, payload) => api.post(`/saved-builds/${encodeURIComponent(buildId)}/versions`, payload),
  remove: (buildId, versionId) => (
    api.delete(`/saved-builds/${encodeURIComponent(buildId)}/versions/${encodeURIComponent(versionId)}`)
  )
};
