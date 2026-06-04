import { Router } from 'express';
import { getComponents, getComponentById } from '../controllers/component.controller.js';
import { getComponentsCostBenefit } from '../controllers/costBenefitController.js';

export const componentRoutes = Router();

componentRoutes.get('/', getComponents);
componentRoutes.get('/cost-benefit', getComponentsCostBenefit);
componentRoutes.get('/:id', getComponentById);
