import { fail } from '../utils/api-response.js';

export function notFoundHandler(req, res) {
  return fail(res, 404, `Rota não encontrada: ${req.method} ${req.originalUrl}`);
}
