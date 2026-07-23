import http from 'node:http';

import { env } from './config/env.js';
import { createApp } from './app.js';
import { ensureDb } from './lib/db.js';
import { startAdmissionPeriodScheduler } from './services/admissionPeriodScheduler.js';
import { startSmsScheduler } from './services/smsService.js';
import { startScheduledMessageScheduler } from './services/scheduledMessageService.js';

await ensureDb();
startAdmissionPeriodScheduler(env.admissionPeriodSchedulerMs);
startSmsScheduler(env.smsSchedulerMs);
startScheduledMessageScheduler(env.smsSchedulerMs);

const server = http.createServer(createApp());

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} is already in use. Stop the running backend or change PORT in backend/.env.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error.message);
  process.exit(1);
});

server.listen(env.port, env.host, () => {
  console.log(`Server is running on port ${env.port}`);
  console.log(`API URL: http://${env.host}:${env.port}`);
});
