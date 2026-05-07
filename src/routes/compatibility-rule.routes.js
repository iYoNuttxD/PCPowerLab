import { Router } from 'express';
import {
  getCompatibilityRules,
  postCompatibilityRule
} from '../controllers/compatibility-rule.controller.js';

export const compatibilityRuleRoutes = Router();

compatibilityRuleRoutes.get('/', getCompatibilityRules);
compatibilityRuleRoutes.post('/', postCompatibilityRule);
