import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { healthRoutes } from './routes/health.routes.js';
import { componentRoutes } from './routes/component.routes.js';
import { buildRoutes } from './routes/build.routes.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(`${env.apiPrefix}/health`, healthRoutes);
app.use(`${env.apiPrefix}/components`, componentRoutes);
app.use(`${env.apiPrefix}/builds`, buildRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
