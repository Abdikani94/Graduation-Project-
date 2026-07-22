import { createId } from '../lib/db.js';

export const addActivity = (db, req, activity) => {
  const user = req.user || {
    id: 'system',
    name: 'Public applicant',
    email: 'public@applicant.local'
  };
  const entry = {
    id: createId('act'),
    action: activity.action,
    beforeAction: activity.beforeAction || '',
    afterAction: activity.afterAction || '',
    adminId: user.id,
    adminName: user.name,
    adminEmail: user.email,
    applicantPerson: activity.applicantPerson || '',
    applicationReference: activity.applicationReference || '',
    module: activity.module,
    metadata: activity.metadata || {},
    createdAt: new Date().toISOString()
  };
  db.activities.unshift(entry);
  return entry;
};
