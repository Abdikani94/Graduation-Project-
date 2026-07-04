import { readDb, updateDb } from '../lib/db.js';
import { sendJson } from '../lib/http.js';
import { addActivity } from '../services/audit.js';

const allowedSettingsFields = ['universityName', 'supportEmail', 'admissionsSemester', 'currency', 'maintenanceMode', 'requireTwoFactor'];
const allowedNotificationFields = ['newAdmissions', 'paymentSuccess', 'weeklyReports'];

export const getSettings = async (req, res) => {
  const db = await readDb();
  sendJson(res, 200, { settings: db.settings });
};

export const updateSettings = async (req, res) => {
  const settings = await updateDb((db) => {
    for (const key of allowedSettingsFields) {
      if (req.body?.[key] !== undefined) db.settings[key] = req.body[key];
    }
    if (req.body?.notifications && typeof req.body.notifications === 'object') {
      for (const key of allowedNotificationFields) {
        if (req.body.notifications[key] !== undefined) db.settings.notifications[key] = req.body.notifications[key];
      }
    }
    db.settings.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Updated Settings',
      module: 'Settings'
    });
    return db.settings;
  });
  sendJson(res, 200, { settings });
};
