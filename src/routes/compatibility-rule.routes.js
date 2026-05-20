import { Router } from 'express';
import {
  getCompatibilityRules,
  postCompatibilityRule,
  putCompatibilityRule,
  removeCompatibilityRule
} from '../controllers/compatibility-rule.controller.js';

export const compatibilityRuleRoutes = Router();

compatibilityRuleRoutes.get('/', getCompatibilityRules);
compatibilityRuleRoutes.post('/', postCompatibilityRule);
compatibilityRuleRoutes.put('/:id', putCompatibilityRule);
compatibilityRuleRoutes.delete('/:id', removeCompatibilityRule);
