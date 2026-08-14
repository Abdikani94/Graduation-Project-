import { requireAuth } from '../middleware/auth.js';
import { sendJson } from '../lib/http.js';
import { login, me } from '../controllers/authController.js';
import {
  createApplication,
  deleteApplication,
  exportApplicationsCsv,
  getApplication,
  listApplications,
  updateApplication,
  updateApplicationStatus,
  submitPaidApplication
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
import { listClasses } from '../controllers/classesController.js';
import { createPayment, deletePayment, exportPaymentsCsv, listPayments, updatePayment, updatePaymentStatus } from '../controllers/paymentsController.js';
import { createContactMessage, deleteContactMessage, listContactMessages, updateContactStatus } from '../controllers/contactController.js';
import { exportReportCsv, getReportSummary } from '../controllers/reportsController.js';
import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from '../controllers/adminUsersController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { exportActivityCsv, listActivity } from '../controllers/activityController.js';
import { initiate, preview, receipt, status } from '../controllers/paymentController.js';
import { requirePaymentAuth } from '../middleware/paymentAuth.js';
import { requireAdmissionPeriodPermission } from '../middleware/admissionPeriodAuth.js';
import { archivePeriod, createPeriod, deleteDraftPeriod, duplicatePeriod, extendPeriod, getPeriod, getRegistrationStatus, listPeriodActivity, listPeriods, transitionPeriod, updatePeriod } from '../controllers/admissionPeriodsController.js';
import {
  archiveFile, deleteFile, downloadFile, getFile, getFileStats, listFileActivities, listFileOptions,
  listFiles, listFileNotifications, markFileNotificationRead, previewFile, replaceFile, reviewFile, shareFile, updateFile, uploadFile
} from '../controllers/filesController.js';
import { cancelSmsNotification, getSmsNotification, listSmsNotifications, resendSmsNotification } from '../controllers/smsNotificationsController.js';
import { requireScheduledMessagePermission } from '../middleware/scheduledMessageAuth.js';
import { requireStudentSearchPermission } from '../middleware/studentSearchAuth.js';
import { searchStudents } from '../controllers/studentSearchController.js';
import { listSecondarySchools, listSomaliaDistricts } from '../controllers/secondarySchoolsController.js';
import {
  archiveCampaign, archiveTemplate, cancelCampaign, createCampaign, createTemplate, duplicateCampaign,
  getCampaignDetails, getScheduledMessageOptions, listCampaigns, listTemplates, previewCampaign,
  retryFailedRecipients, scheduleCampaign, sendCampaignNow, updateCampaign, updateTemplate
} from '../controllers/scheduledMessagesController.js';

export const registerRoutes = (router) => {
  router.get('/health', (req, res) => {
    sendJson(res, 200, { status: 'ok', service: 'jamhuriya-admission-backend' });
  });

  router.post('/api/auth/login', login);
  router.get('/api/auth/me', requireAuth(me));
  router.get('/api/admission-registration/status', getRegistrationStatus);
  router.get('/api/secondary-schools', listSecondarySchools);
  router.get('/api/districts', listSomaliaDistricts);

  const periodPermission = (permission, handler) => requireAuth(requireAdmissionPeriodPermission(permission)(handler), ['Admin']);
  router.get('/api/admission-periods', periodPermission('admission_period.view', listPeriods));
  router.post('/api/admission-periods', periodPermission('admission_period.create', createPeriod));
  router.get('/api/admission-periods/:id', periodPermission('admission_period.view', getPeriod));
  router.patch('/api/admission-periods/:id', periodPermission('admission_period.update', updatePeriod));
  router.post('/api/admission-periods/:id/extend', periodPermission('admission_period.extend', extendPeriod));
  router.post('/api/admission-periods/:id/duplicate', periodPermission('admission_period.create', duplicatePeriod));
  router.patch('/api/admission-periods/:id/archive', periodPermission('admission_period.archive', archivePeriod));
  router.get('/api/admission-periods/:id/activity', periodPermission('admission_period.view_audit_log', listPeriodActivity));
  router.delete('/api/admission-periods/:id', periodPermission('admission_period.archive', deleteDraftPeriod));
  for (const [action, permission] of Object.entries({ open: 'open', close: 'close', pause: 'pause', resume: 'resume', reopen: 'reopen', cancel: 'cancel' })) {
    router.post(`/api/admission-periods/:id/${action}`, periodPermission(`admission_period.${permission}`, (req, res) => {
      req.params.action = action;
      return transitionPeriod(req, res);
    }));
  }

  router.get('/api/options', getOptions);
  router.get('/api/programs', listPrograms);
  router.post('/api/programs', requireAuth(createProgram, ['Admin']));
  router.patch('/api/programs/:id', requireAuth(updateProgram, ['Admin']));
  router.delete('/api/programs/:id', requireAuth(deleteProgram, ['Admin']));
  router.post('/api/programs/:id/departments', requireAuth(createDepartment, ['Admin', 'Officer']));
  router.patch('/api/programs/:programId/departments/:departmentId', requireAuth(updateDepartment, ['Admin', 'Officer']));
  router.delete('/api/programs/:programId/departments/:departmentId', requireAuth(deleteDepartment, ['Admin']));

  router.post('/api/applications', createApplication);
  router.post('/api/applications/:id/submit', requirePaymentAuth(submitPaidApplication));
  router.get('/api/applications', requireAuth(listApplications, ['Admin', 'Officer']));
  router.get('/api/applications/export/csv', requireAuth(exportApplicationsCsv, ['Admin', 'Officer']));
  router.get('/api/applications/:id', requireAuth(getApplication, ['Admin', 'Officer']));
  router.patch('/api/applications/:id', requireAuth(updateApplication, ['Admin', 'Officer']));
  router.patch('/api/applications/:id/status', requireAuth(updateApplicationStatus, ['Admin', 'Officer']));
  router.delete('/api/applications/:id', requireAuth(deleteApplication, ['Admin']));

  router.get('/api/sms-notifications', requireAuth(listSmsNotifications, ['Admin']));
  router.get('/api/sms-notifications/:id', requireAuth(getSmsNotification, ['Admin']));
  router.post('/api/sms-notifications/:id/resend', requireAuth(resendSmsNotification, ['Admin']));
  router.patch('/api/sms-notifications/:id/cancel', requireAuth(cancelSmsNotification, ['Admin']));

  const messagePermission = (permission, handler) => requireAuth(requireScheduledMessagePermission(permission)(handler), ['Admin']);
  router.get('/api/scheduled-messages/options', messagePermission('scheduled_message.view', getScheduledMessageOptions));
  router.post('/api/scheduled-messages/preview', messagePermission('scheduled_message.create', previewCampaign));
  router.get('/api/scheduled-messages', messagePermission('scheduled_message.view', listCampaigns));
  router.post('/api/scheduled-messages', messagePermission('scheduled_message.create', createCampaign));
  router.get('/api/scheduled-messages/:id', messagePermission('scheduled_message.view_results', getCampaignDetails));
  router.patch('/api/scheduled-messages/:id', messagePermission('scheduled_message.update', updateCampaign));
  router.post('/api/scheduled-messages/:id/schedule', messagePermission('scheduled_message.schedule', scheduleCampaign));
  router.post('/api/scheduled-messages/:id/send-now', messagePermission('scheduled_message.send_now', sendCampaignNow));
  router.post('/api/scheduled-messages/:id/cancel', messagePermission('scheduled_message.cancel', cancelCampaign));
  router.post('/api/scheduled-messages/:id/duplicate', messagePermission('scheduled_message.create', duplicateCampaign));
  router.post('/api/scheduled-messages/:id/retry', messagePermission('scheduled_message.retry', retryFailedRecipients));
  router.patch('/api/scheduled-messages/:id/archive', messagePermission('scheduled_message.update', archiveCampaign));
  router.get('/api/sms-templates', messagePermission('scheduled_message.manage_templates', listTemplates));
  router.post('/api/sms-templates', messagePermission('scheduled_message.manage_templates', createTemplate));
  router.patch('/api/sms-templates/:id', messagePermission('scheduled_message.manage_templates', updateTemplate));
  router.patch('/api/sms-templates/:id/archive', messagePermission('scheduled_message.manage_templates', archiveTemplate));

  router.get('/api/students', requireAuth(listStudents, ['Admin', 'Officer']));
  router.get('/api/student-search', requireAuth(requireStudentSearchPermission('student_search.view')(searchStudents), ['Admin', 'Officer']));
  router.post('/api/students', requireAuth(createStudent, ['Admin', 'Officer']));
  router.get('/api/students/:id', requireAuth(getStudent, ['Admin', 'Officer']));
  router.patch('/api/students/:id', requireAuth(updateStudent, ['Admin', 'Officer']));
  router.patch('/api/students/:id/whatsapp-sent', requireAuth(markWhatsAppSent, ['Admin', 'Officer']));
  router.delete('/api/students/:id', requireAuth(deleteStudent, ['Admin']));

  router.get('/api/classes', requireAuth(listClasses, ['Admin', 'Officer']));

  router.get('/api/payments', requireAuth(listPayments, ['Admin', 'Officer']));
  router.post('/api/payments/preview', requirePaymentAuth(preview));
  router.post('/api/payments/initiate', requirePaymentAuth(initiate));
  router.get('/api/payments/:referenceId/status', requirePaymentAuth(status));
  router.get('/api/payments/:referenceId/receipt', requirePaymentAuth(receipt));
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

  router.get('/api/files/stats', requireAuth(getFileStats, ['Admin', 'Officer']));
  router.get('/api/files/options', requireAuth(listFileOptions, ['Admin', 'Officer']));
  router.get('/api/files', requireAuth(listFiles, ['Admin', 'Officer']));
  router.post('/api/files', requireAuth(uploadFile, ['Admin', 'Officer']));
  router.get('/api/files/:id', requireAuth(getFile, ['Admin', 'Officer']));
  router.get('/api/files/:id/preview', requireAuth(previewFile, ['Admin', 'Officer']));
  router.get('/api/files/:id/download', requireAuth(downloadFile, ['Admin', 'Officer']));
  router.get('/api/files/:id/activities', requireAuth(listFileActivities, ['Admin', 'Officer']));
  router.patch('/api/files/:id', requireAuth(updateFile, ['Admin', 'Officer']));
  router.post('/api/files/:id/replace', requireAuth(replaceFile, ['Admin', 'Officer']));
  router.patch('/api/files/:id/archive', requireAuth(archiveFile, ['Admin', 'Officer']));
  router.post('/api/files/:id/share', requireAuth(shareFile, ['Admin', 'Officer']));
  router.patch('/api/files/:id/review', requireAuth(reviewFile, ['Admin']));
  router.delete('/api/files/:id', requireAuth(deleteFile, ['Admin', 'Officer']));
  router.get('/api/file-notifications', requireAuth(listFileNotifications, ['Admin', 'Officer']));
  router.patch('/api/file-notifications/:id/read', requireAuth(markFileNotificationRead, ['Admin', 'Officer']));
};
