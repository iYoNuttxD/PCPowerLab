import {
  createAnalysisHistoryRecord,
  deleteAnalysisHistoryRecord,
  getAnalysisHistoryById,
  listAnalysisHistory
} from '../services/analysisHistoryService.js';
import { created, ok } from '../utils/api-response.js';

export function getAnalysisHistory(req, res, next) {
  try {
    const records = listAnalysisHistory(req.query);

    return ok(res, records, 'Historico de analises encontrado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function getAnalysisHistoryRecord(req, res, next) {
  try {
    const record = getAnalysisHistoryById(req.params.id);

    return ok(res, record, 'Historico de analise encontrado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function createAnalysisHistory(req, res, next) {
  try {
    const record = createAnalysisHistoryRecord(req.body);

    return created(res, record, 'Historico de analise registrado com sucesso.');
  } catch (error) {
    return next(error);
  }
}

export function removeAnalysisHistory(req, res, next) {
  try {
    const removedRecord = deleteAnalysisHistoryRecord(req.params.id);

    return ok(res, removedRecord, 'Historico de analise removido com sucesso.');
  } catch (error) {
    return next(error);
  }
}