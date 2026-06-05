import {
  findProfessionalSoftwareById,
  listProfessionalSoftware,
  simulateProfessionalSoftwarePerformance
} from '../services/professionalSoftwareService.js';
import { fail, ok } from '../utils/api-response.js';

export function getProfessionalSoftware(req, res, next) {
  try {
    const software = listProfessionalSoftware(req.query);

    return ok(res, software, buildListMessage(software));
  } catch (error) {
    return next(error);
  }
}

export function getProfessionalSoftwareById(req, res) {
  const software = findProfessionalSoftwareById(req.params.id);

  if (!software) {
    return fail(res, 404, 'Software profissional nao encontrado.');
  }

  return ok(res, software, 'Software profissional encontrado com sucesso.');
}

export function simulateProfessionalSoftware(req, res, next) {
  try {
    const simulation = simulateProfessionalSoftwarePerformance(req.body);

    return ok(res, simulation, 'Simulação de desempenho em software profissional concluída com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListMessage(software) {
  if (software.length > 0) {
    return 'Softwares profissionais encontrados com sucesso.';
  }

  return 'Nenhum software profissional cadastrado para os filtros informados.';
}
