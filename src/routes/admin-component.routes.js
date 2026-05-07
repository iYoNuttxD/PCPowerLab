import { Router } from 'express';
import {
  deleteAdminComponent,
  getAdminComponentById,
  getAdminComponents,
  postAdminComponent,
  putAdminComponent
} from '../controllers/admin-component.controller.js';

export const adminComponentRoutes = Router();

adminComponentRoutes.get('/', getAdminComponents);
adminComponentRoutes.get('/:id', getAdminComponentById);
adminComponentRoutes.post('/', postAdminComponent);
adminComponentRoutes.put('/:id', putAdminComponent);
adminComponentRoutes.delete('/:id', deleteAdminComponent);
