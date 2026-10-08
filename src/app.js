import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { healthRoutes } from './routes/health.routes.js';
import { componentRoutes } from './routes/component.routes.js';
import { adminComponentRoutes } from './routes/admin-component.routes.js';
import { buildRoutes } from './routes/build.routes.js';
import { savedBuildsRoutes } from './routes/savedBuilds.routes.js';
import { compatibilityRoutes } from './routes/compatibility.routes.js';
import { compatibilityFixRoutes } from './routes/compatibilityFix.routes.js';
import { compatibilityRuleRoutes } from './routes/compatibility-rule.routes.js';
import { bottleneckRoutes } from './routes/bottleneck.routes.js';
import { performanceParametersRoutes } from './routes/performanceParameters.routes.js';
import { recommendationRoutes } from './routes/recommendation.routes.js';
import { budgetRoutes } from './routes/budget.routes.js';
import { explanationRoutes } from './routes/explanation.routes.js';
import { gamePerformanceRoutes } from './routes/gamePerformance.routes.js';
import { professionalSoftwareRoutes } from './routes/professionalSoftware.routes.js';
import { buildSummaryRoutes } from './routes/buildSummary.routes.js';
import { shareBuildRoutes } from './routes/shareBuild.routes.js';
import { purchaseLinksRoutes } from './routes/purchaseLinks.routes.js';
import { buildComparisonRoutes } from './routes/buildComparison.routes.js';
import { upgradeSuggestionRoutes } from './routes/upgradeSuggestion.routes.js';
import { upgradeRoadmapRoutes } from './routes/upgradeRoadmap.routes.js';
import { buildScoreRoutes } from './routes/buildScore.routes.js';
import { analysisHistoryRoutes } from './routes/analysisHistory.routes.js';
import { readyBuildsRoutes } from './routes/readyBuilds.routes.js';
import { usageProfilesRoutes } from './routes/usageProfiles.routes.js';
import { buildReportRoutes } from './routes/buildReport.routes.js';
import { buildExportRoutes } from './routes/buildExport.routes.js';
import { recommendationFeedbackRoutes } from './routes/recommendationFeedback.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { adminSession, logoutAdmin, requireAdmin, unlockAdmin } from './middlewares/admin-auth.middleware.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(`${env.apiPrefix}/health`, healthRoutes);
app.use(`${env.apiPrefix}/components`, componentRoutes);
app.get(`${env.apiPrefix}/admin/session`, adminSession);
app.post(`${env.apiPrefix}/admin/unlock`, unlockAdmin);
app.post(`${env.apiPrefix}/admin/logout`, requireAdmin, logoutAdmin);
app.use(`${env.apiPrefix}/admin/components`, requireAdmin, adminComponentRoutes);
app.use(`${env.apiPrefix}/builds`, buildRoutes);
app.use(`${env.apiPrefix}/saved-builds`, savedBuildsRoutes);
app.use(`${env.apiPrefix}/compatibility`, compatibilityRoutes);
app.use(`${env.apiPrefix}/compatibility`, compatibilityFixRoutes);
app.use(`${env.apiPrefix}/compatibility-rules`, requireAdmin, compatibilityRuleRoutes);
app.use(`${env.apiPrefix}/bottlenecks`, bottleneckRoutes);
app.use(`${env.apiPrefix}/performance-parameters`, requireAdmin, performanceParametersRoutes);
app.use(`${env.apiPrefix}/performance`, gamePerformanceRoutes);
app.use(`${env.apiPrefix}/professional-software`, professionalSoftwareRoutes);
app.use(`${env.apiPrefix}/recommendations`, recommendationRoutes);
app.use(`${env.apiPrefix}/budget`, budgetRoutes);
app.use(`${env.apiPrefix}/explanations`, explanationRoutes);
app.use(`${env.apiPrefix}/build-summary`, buildSummaryRoutes);
app.use(`${env.apiPrefix}/build-comparison`, buildComparisonRoutes);
app.use(`${env.apiPrefix}/build-score`, buildScoreRoutes);
app.use(`${env.apiPrefix}/share`, shareBuildRoutes);
app.use(`${env.apiPrefix}/purchase-links`, purchaseLinksRoutes);
app.use(`${env.apiPrefix}/upgrades`, upgradeSuggestionRoutes);
app.use(`${env.apiPrefix}/upgrades`, upgradeRoadmapRoutes);
app.use(`${env.apiPrefix}/analysis-history`, analysisHistoryRoutes);
app.use(`${env.apiPrefix}/ready-builds`, readyBuildsRoutes);
app.use(`${env.apiPrefix}/usage-profiles`, usageProfilesRoutes);
app.use(`${env.apiPrefix}/build-report`, buildReportRoutes);
app.use(`${env.apiPrefix}/build-export`, buildExportRoutes);
app.use(`${env.apiPrefix}/recommendation-feedback`, recommendationFeedbackRoutes);
app.use(`${env.apiPrefix}/notifications`, notificationsRoutes);

if (env.nodeEnv === 'production') {
  const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
  const serveFrontend = express.static(frontendDist);
  const isApiPath = (requestPath) => ['/api', env.apiPrefix.replace(/\/$/, '')]
    .some(prefix => requestPath === prefix || requestPath.startsWith(`${prefix}/`));
  app.use((req, res, next) => {
    if (isApiPath(req.path)) return next();
    return serveFrontend(req, res, next);
  });
  app.get('*', (req, res, next) => {
    if (isApiPath(req.path)) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
