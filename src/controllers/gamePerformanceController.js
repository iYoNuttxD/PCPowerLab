import {
  compareGamePerformance,
  findGameById,
  listGames,
  simulateGamePerformance
} from '../services/gamePerformanceService.js';
import { fail, ok } from '../utils/api-response.js';

export function getGames(req, res, next) {
  try {
    const games = listGames(req.query);

    return ok(res, games, buildListGamesMessage(games));
  } catch (error) {
    return next(error);
  }
}

export function getGameById(req, res) {
  const game = findGameById(req.params.id);

  if (!game) {
    return fail(res, 404, 'Jogo nao encontrado.');
  }

  return ok(res, game, 'Jogo encontrado com sucesso.');
}

export function simulateGame(req, res, next) {
  try {
    const simulation = simulateGamePerformance(req.body);

    return ok(res, simulation, 'Simulacao de desempenho concluida.');
  } catch (error) {
    return next(error);
  }
}

export function compareGames(req, res, next) {
  try {
    const comparison = compareGamePerformance(req.body);

    return ok(res, comparison, 'Comparacao de desempenho entre jogos concluida com sucesso.');
  } catch (error) {
    return next(error);
  }
}

function buildListGamesMessage(games) {
  if (games.length > 0) {
    return 'Jogos encontrados com sucesso.';
  }

  return 'Nenhum jogo cadastrado para os filtros informados.';
}
