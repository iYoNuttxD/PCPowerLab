import { api } from './api.js';

export const performanceService = {
  listParameters: () => api.get('/performance-parameters'),
  getParameter: (componentId) => api.get(`/performance-parameters/${encodeURIComponent(componentId)}`),
  createParameter: (payload) => api.post('/performance-parameters', payload),
  updateParameter: (componentId, payload) => api.put(`/performance-parameters/${encodeURIComponent(componentId)}`, payload),
  deleteParameter: (componentId) => api.delete(`/performance-parameters/${encodeURIComponent(componentId)}`),
  analyzeBottlenecks: (build) => api.post('/bottlenecks/analyze', build),
  listGames: () => api.get('/performance/games'),
  simulateGame: (payload) => api.post('/performance/simulate-game', payload),
  compareGames: (payload) => api.post('/performance/compare-games', payload),
  simulateSoftware: (payload) => api.post('/performance/simulate-software', payload)
};
