import { Router } from 'express';
import {
  getUsageProfile,
  getUsageProfiles,
  postUsageProfile,
  putUsageProfile,
  removeUsageProfile
} from '../controllers/usageProfilesController.js';

export const usageProfilesRoutes = Router();

usageProfilesRoutes.get('/', getUsageProfiles);
usageProfilesRoutes.get('/:id', getUsageProfile);
usageProfilesRoutes.post('/', postUsageProfile);
usageProfilesRoutes.put('/:id', putUsageProfile);
usageProfilesRoutes.delete('/:id', removeUsageProfile);
