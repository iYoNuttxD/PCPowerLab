import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, '127.0.0.1', () => {
  console.log(`PCPowerLab API running on port ${env.port}`);
  console.log(`Base URL: http://localhost:${env.port}${env.apiPrefix}`);
});
