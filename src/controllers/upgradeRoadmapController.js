import { generateUpgradeRoadmap } from '../services/upgradeRoadmapService.js';
import { ok } from '../utils/api-response.js';

export function createUpgradeRoadmap(req, res, next) {
  try {
    const roadmap = generateUpgradeRoadmap(req.body);

    return ok(res, roadmap, 'Plano de upgrades gerado com sucesso.');
  } catch (error) {
    return next(error);
  }
}
