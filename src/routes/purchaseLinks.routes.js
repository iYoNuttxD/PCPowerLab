import { Router } from 'express';
import {
  getBuildPurchaseLinks,
  getComponentPurchaseLinks
} from '../controllers/purchaseLinksController.js';

export const purchaseLinksRoutes = Router();

purchaseLinksRoutes.post('/by-build', getBuildPurchaseLinks);
purchaseLinksRoutes.get('/:componentId', getComponentPurchaseLinks);