import { Router } from 'express';
import { getComponents, getComponentById } from '../controllers/component.controller.js';

export const componentRoutes = Router();

componentRoutes.get('/', getComponents);
componentRoutes.get('/:id', getComponentById);
