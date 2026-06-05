import { readDb, updateDb } from '../lib/db.js';
import { sendJson } from '../lib/http.js';
import { addActivity } from '../services/audit.js';

export const getSettings = async (req, res) => {
  const db = await readDb();
  sendJson(res, 200, { settings: db.settings });
};

export const updateSettings = async (req, res) => {
  const settings = await updateDb((db) => {
    db.settings = {
      ...db.settings,
      ...req.body,
      notifications: {
        ...db.settings.notifications,
        ...(req.body.notifications || {})
      },
      updatedAt: new Date().toISOString()
    };
    addActivity(db, req, {
      action: 'Updated Settings',
      module: 'Settings'
    });
    return db.settings;
  });
  sendJson(res, 200, { settings });
};
