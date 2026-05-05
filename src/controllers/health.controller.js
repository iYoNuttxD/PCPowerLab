import { ok } from '../utils/api-response.js';

export function getHealth(_req, res) {
  return ok(res, {
    status: 'online',
    service: 'PCPowerLab API'
  });
}
