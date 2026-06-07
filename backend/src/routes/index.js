import { requireAuth } from '../middleware/auth.js';
import { login, me } from '../controllers/authController.js';
import {
  createApplication,
  deleteApplication,
  exportApplicationsCsv,
  getApplication,
  listApplications,
  updateApplication,
  updateApplicationStatus
} from '../controllers/applicationsController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { getOptions } from '../controllers/optionsController.js';
import {
  createProgram,
  createDepartment,
  deleteDepartment,
  deleteProgram,
  listPrograms,
  updateDepartment,
  updateProgram
} from '../controllers/programsController.js';
import { createStudent, deleteStudent, getStudent, listStudents, markWhatsAppSent, updateStudent } from '../controllers/studentsController.js';
import { createPayment, deletePayment, exportPaymentsCsv, listPayments, updatePayment, updatePaymentStatus } from '../controllers/paymentsController.js';
import { createContactMessage, deleteContactMessage, listContactMessages, updateContactStatus } from '../controllers/contactController.js';
import { exportReportCsv, getReportSummary } from '../controllers/reportsController.js';
import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from '../controllers/adminUsersController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { exportActivityCsv, listActivity } from '../controllers/activityController.js';

export const registerRoutes = (router) => {
  router.get('/health', (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'ok', service: 'jamhuriya-admission-backend' }));
  });

  router.post('/api/auth/login', login);
  router.get('/api/auth/me', requireAuth(me));

  router.get('/api/options', getOptions);
  router.get('/api/programs', listPrograms);
  router.post('/api/programs', requireAuth(createProgram, ['Admin']));
  router.patch('/api/programs/:id', requireAuth(updateProgram, ['Admin']));
  router.delete('/api/programs/:id', requireAuth(deleteProgram, ['Admin']));
  router.post('/api/programs/:id/departments', requireAuth(createDepartment, ['Admin', 'Officer']));
  router.patch('/api/programs/:programId/departments/:departmentId', requireAuth(updateDepartment, ['Admin', 'Officer']));
  router.delete('/api/programs/:programId/departments/:departmentId', requireAuth(deleteDepartment, ['Admin']));

  router.post('/api/applications', createApplication);
  router.get('/api/applications', requireAuth(listApplications, ['Admin', 'Officer']));
  router.get('/api/applications/export/csv', requireAuth(exportApplicationsCsv, ['Admin', 'Officer']));
  router.get('/api/applications/:id', requireAuth(getApplication, ['Admin', 'Officer']));
  router.patch('/api/applications/:id', requireAuth(updateApplication, ['Admin', 'Officer']));
  router.patch('/api/applications/:id/status', requireAuth(updateApplicationStatus, ['Admin', 'Officer']));
  router.delete('/api/applications/:id', requireAuth(deleteApplication, ['Admin']));

  router.get('/api/students', requireAuth(listStudents, ['Admin', 'Officer']));
  router.post('/api/students', requireAuth(createStudent, ['Admin', 'Officer']));
  router.get('/api/students/:id', requireAuth(getStudent, ['Admin', 'Officer']));
  router.patch('/api/students/:id', requireAuth(updateStudent, ['Admin', 'Officer']));
  router.patch('/api/students/:id/whatsapp-sent', requireAuth(markWhatsAppSent, ['Admin', 'Officer']));
  router.delete('/api/students/:id', requireAuth(deleteStudent, ['Admin']));

  router.get('/api/payments', requireAuth(listPayments, ['Admin', 'Officer']));
  router.post('/api/payments', requireAuth(createPayment, ['Admin', 'Officer']));
  router.get('/api/payments/export/csv', requireAuth(exportPaymentsCsv, ['Admin', 'Officer']));
  router.patch('/api/payments/:id', requireAuth(updatePayment, ['Admin', 'Officer']));
  router.patch('/api/payments/:id/status', requireAuth(updatePaymentStatus, ['Admin', 'Officer']));
  router.delete('/api/payments/:id', requireAuth(deletePayment, ['Admin']));

  router.post('/api/contact-messages', createContactMessage);
  router.get('/api/contact-messages', requireAuth(listContactMessages, ['Admin', 'Officer']));
  router.patch('/api/contact-messages/:id/status', requireAuth(updateContactStatus, ['Admin', 'Officer']));
  router.delete('/api/contact-messages/:id', requireAuth(deleteContactMessage, ['Admin']));

  router.get('/api/dashboard', requireAuth(getDashboard, ['Admin', 'Officer']));
  router.get('/api/reports/summary', requireAuth(getReportSummary, ['Admin', 'Officer']));
  router.get('/api/reports/export/csv', requireAuth(exportReportCsv, ['Admin', 'Officer']));

  router.get('/api/admin-users', requireAuth(listAdminUsers, ['Admin']));
  router.post('/api/admin-users', requireAuth(createAdminUser, ['Admin']));
  router.patch('/api/admin-users/:id', requireAuth(updateAdminUser, ['Admin']));
  router.delete('/api/admin-users/:id', requireAuth(deleteAdminUser, ['Admin']));

  router.get('/api/settings', requireAuth(getSettings, ['Admin']));
  router.patch('/api/settings', requireAuth(updateSettings, ['Admin']));

  router.get('/api/activity-log', requireAuth(listActivity, ['Admin', 'Officer']));
  router.get('/api/activity-log/export/csv', requireAuth(exportActivityCsv, ['Admin', 'Officer']));
};
