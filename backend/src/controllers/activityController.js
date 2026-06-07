import { readDb } from '../lib/db.js';
import { sendCsv, sendJson } from '../lib/http.js';
import { matchesText, paginate, sortNewest, toCsv } from '../lib/query.js';

export const listActivity = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.activities);
  const { search, module } = req.query;
  if (module && module !== 'All Modules') items = items.filter((item) => item.module === module);
  items = items.filter((item) => matchesText(item, ['action', 'adminName', 'adminEmail', 'applicantPerson', 'applicationReference'], search));
  sendJson(res, 200, paginate(items, req.query));
};

export const exportActivityCsv = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.activities);
  const { search, module } = req.query;
  if (module && module !== 'All Modules') items = items.filter((item) => item.module === module);
  items = items.filter((item) => matchesText(item, ['action', 'adminName', 'adminEmail', 'applicantPerson', 'applicationReference'], search));

  const csv = toCsv(items, [
    { key: 'action', header: 'Action' },
    { key: 'beforeAction', header: 'Before' },
    { key: 'afterAction', header: 'After' },
    { key: 'adminName', header: 'Admin' },
    { key: 'adminEmail', header: 'Admin Email' },
    { key: 'applicantPerson', header: 'Applicant' },
    { key: 'applicationReference', header: 'Application Reference' },
    { key: 'module', header: 'Module' },
    { key: 'createdAt', header: 'Created At' }
  ]);
  sendCsv(res, 'activity-log.csv', csv);
};
