import { generateBuildReport } from '../services/buildReportService.js';
import { ok } from '../utils/api-response.js';

export function createBuildReport(req, res, next) {
  try {
    const report = generateBuildReport(req.body);

    return ok(res, report, 'Relatório técnico da configuração gerado com sucesso.');
  } catch (error) {
    return next(error);
  }
}
