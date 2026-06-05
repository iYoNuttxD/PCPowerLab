import { Router } from 'express';
import {
  getProfessionalSoftware,
  getProfessionalSoftwareById
} from '../controllers/professionalSoftwareController.js';

export const professionalSoftwareRoutes = Router();

professionalSoftwareRoutes.get('/', getProfessionalSoftware);
professionalSoftwareRoutes.get('/:id', getProfessionalSoftwareById);
