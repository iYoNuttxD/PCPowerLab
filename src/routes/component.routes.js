import { Router } from 'express';
import { getComponents, getComponentById, getCatalogCompatibility } from '../controllers/component.controller.js';
import { getComponentsCostBenefit } from '../controllers/costBenefitController.js';

export const componentRoutes = Router();

componentRoutes.get('/', getComponents);
componentRoutes.post('/compatibility', getCatalogCompatibility);
componentRoutes.get('/cost-benefit', getComponentsCostBenefit);
componentRoutes.get('/:id', getComponentById);
