import { fail } from '../utils/api-response.js';

export function errorHandler(error, _req, res, _next) {
  if (!error.statusCode || error.statusCode >= 500) {
    console.error(error);
  }

  return fail(
    res,
    error.statusCode || 500,
    error.message || 'Erro interno no servidor.',
    error.errors || []
  );
}
