import { compatibilityService } from './compatibilityService.js';
import { componentsService } from './componentsService.js';
import { performanceService } from './performanceService.js';
import { api } from './api.js';

export const adminService = {
  session: () => api.get('/admin/session'),
  unlock: (password) => api.post('/admin/unlock', { password }),
  logout: () => api.post('/admin/logout'),
  listComponents: componentsService.adminList,
  createComponent: componentsService.adminCreate,
  updateComponent: componentsService.adminUpdate,
  deleteComponent: componentsService.adminDelete,
  listRules: compatibilityService.listRules,
  createRule: compatibilityService.createRule,
  updateRule: compatibilityService.updateRule,
  deleteRule: compatibilityService.deleteRule,
  listParameters: performanceService.listParameters,
  createParameter: performanceService.createParameter,
  updateParameter: performanceService.updateParameter,
  deleteParameter: performanceService.deleteParameter
};
