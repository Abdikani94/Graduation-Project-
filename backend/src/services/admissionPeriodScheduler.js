import { updateDb } from '../lib/db.js';
import { syncAdmissionPeriods } from './admissionPeriodService.js';

export const runAdmissionPeriodScheduler = () => updateDb((db) => syncAdmissionPeriods(db));

export const startAdmissionPeriodScheduler = (intervalMs = 60_000) => {
  runAdmissionPeriodScheduler().catch((error) => console.error('Admission-period scheduler failed:', error.message));
  const timer = setInterval(() => runAdmissionPeriodScheduler().catch((error) => console.error('Admission-period scheduler failed:', error.message)), intervalMs);
  timer.unref?.();
  return timer;
};
