import { fail } from '../lib/http.js';

export const admissionPeriodPermissions = [
  'admission_period.view', 'admission_period.create', 'admission_period.update', 'admission_period.open',
  'admission_period.close', 'admission_period.pause', 'admission_period.resume', 'admission_period.extend',
  'admission_period.reopen', 'admission_period.cancel', 'admission_period.archive', 'admission_period.view_audit_log'
];

export const periodStatuses = new Set(['Draft', 'Scheduled', 'Open', 'Paused', 'Closed', 'Expired', 'Cancelled']);
export const admissionTypes = new Set(['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate', 'Short Course', 'General Admission']);

export const syncAdmissionPeriods = (db, now = new Date(), actor = 'System Scheduler') => {
  const timestamp = now.toISOString();
  for (const period of db.admissionPeriods) {
    let nextStatus;
    let action;
    if (period.status === 'Scheduled' && period.automaticOpen && timestamp >= period.openingDatetime && timestamp < period.closingDatetime) {
      nextStatus = 'Open'; action = 'Registration opened automatically';
    } else if (period.status === 'Open' && period.automaticClose && timestamp >= period.closingDatetime) {
      nextStatus = 'Expired'; action = 'Registration closed automatically';
    }
    if (!nextStatus) continue;
    const previous = { status: period.status };
    period.status = nextStatus; period.version += 1; period.updatedAt = timestamp;
    if (nextStatus === 'Open') period.openedAt = timestamp;
    if (nextStatus === 'Expired') period.closedAt = timestamp;
    db.admissionPeriodActivities.unshift({ id: `apa_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`, admissionPeriodId: period.id,
      adminUserId: null, adminName: actor, action, previousValues: previous, newValues: { status: nextStatus }, reason: '',
      ipAddress: '', userAgent: '', createdAt: timestamp });
  }
};

const specificity = (period) => period.programId ? 3 : period.facultyId ? 2 : period.intakeName ? 1 : 0;
export const findApplicablePeriod = (db, { faculty = '', program = '', intake = '', admissionType = '' } = {}, now = new Date()) => {
  syncAdmissionPeriods(db, now);
  return db.admissionPeriods.filter((period) => !period.archived && period.status !== 'Cancelled'
    && (!period.facultyId || period.facultyId === faculty)
    && (!period.programId || period.programId === program)
    && (intake ? (!period.intakeName || period.intakeName === intake) : (!period.intakeName || period.intakeName === 'General Intake'))
    && (!period.admissionType || period.admissionType === 'General Admission' || !admissionType || period.admissionType === admissionType))
    .sort((a, b) => specificity(b) - specificity(a) || b.createdAt.localeCompare(a.createdAt))[0] || null;
};

export const assertAdmissionOpen = (db, criteria, now = new Date()) => {
  const period = findApplicablePeriod(db, criteria, now);
  const timestamp = now.toISOString();
  if (!period || period.status !== 'Open' || timestamp < period.openingDatetime || timestamp >= period.closingDatetime) {
    const error = new Error(period?.status === 'Paused' ? 'Admission registration is temporarily paused.'
      : period?.status === 'Expired' ? 'The admission registration deadline has passed.' : 'Admission registration is currently closed.');
    error.status = 409; error.code = 'ADMISSION_REGISTRATION_CLOSED';
    error.details = { opening_date: period?.openingDatetime || null, closing_date: period?.closingDatetime || null, status: period?.status || 'Closed' };
    throw error;
  }
  const count = db.applications.filter((application) => application.admissionPeriodId === period.id && application.status !== 'DRAFT').length;
  if (period.maximumApplications && count >= period.maximumApplications) fail(409, 'The maximum number of applications for this admission period has been reached.');
  return period;
};
