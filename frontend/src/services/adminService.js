import { compatibilityService } from './compatibilityService.js';
import { componentsService } from './componentsService.js';
import { performanceService } from './performanceService.js';

export const adminService = {
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
