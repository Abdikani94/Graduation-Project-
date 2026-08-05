import { readDb } from '../lib/db.js';
import { admissionFee } from '../config/admissionFee.js';
import { sendCsv, sendJson } from '../lib/http.js';
import { countBy, toCsv, topCounts } from '../lib/query.js';

const colors = ['#f97316', '#22c55e', '#9b51e0', '#3b82f6', '#fb923c', '#ef4444'];
const fixedAdmissionFee = admissionFee;

const filterByDate = (items, query) => {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  return items.filter((item) => {
    const created = new Date(item.createdAt);
    if (query.year && query.year !== 'All Status' && created.getFullYear() !== Number(query.year)) return false;
    if (from && created < from) return false;
    if (to && created > to) return false;
    return true;
  });
};

const withPercent = (counts, total) =>
  Object.entries(counts).map(([name, value], index) => ({
    name,
    value,
    percent: total ? Math.round((value / total) * 100) : 0,
    color: colors[index % colors.length]
  }));

const ageRange = (dob) => {
  if (!dob) return 'Unknown';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) return 'under 18';
  if (age <= 20) return '18-20';
  if (age <= 25) return '21-25';
  if (age <= 30) return '26-30';
  return 'over 30';
};

const monthlyTrend = (applications, payments) => {
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(new Date().getFullYear(), index, 1);
    return {
      month: date.toLocaleString('en', { month: 'short' }),
      submitted: 0,
      paid: 0,
      target: 55
    };
  });

  for (const application of applications) {
    months[new Date(application.createdAt).getMonth()].submitted += 1;
  }
  for (const payment of payments.filter((item) => item.status === 'Paid')) {
    months[new Date(payment.createdAt).getMonth()].paid += 1;
  }
  return months;
};

export const getReportSummary = async (req, res) => {
  const db = await readDb();
  const applications = filterByDate(db.applications, req.query);
  const applicationIds = new Set(applications.map((item) => item.id));
  const payments = db.payments.filter((item) => applicationIds.has(item.applicationId));
  const paidPayments = payments.filter((item) => item.status === 'Paid');
  const total = applications.length;
  const approved = applications.filter((item) => item.status === 'Approved').length;
  const rejected = applications.filter((item) => item.status === 'Rejected').length;

  const facultyDemand = withPercent(countBy(applications, (item) => item.faculty), total);
  const revenueByProgram = db.programs.map((program) => {
    const programApps = applications.filter((item) => item.faculty === program.title);
    return {
      faculty: program.title,
      fee: fixedAdmissionFee,
      applicants: programApps.length,
      estimated: programApps.length * fixedAdmissionFee
    };
  });

  sendJson(res, 200, {
    stats: {
      totalApplications: total,
      acceptanceRate: total ? Math.round((approved / total) * 100) : 0,
      rejectionRate: total ? Math.round((rejected / total) * 100) : 0,
      totalRevenue: paidPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    },
    trend: monthlyTrend(applications, payments),
    demographics: {
      sex: withPercent(countBy(applications, (item) => item.sex), total),
      nationality: withPercent(countBy(applications, (item) => item.nationality === 'Somali' ? 'Local Somali' : 'International'), total),
      age: withPercent(countBy(applications, (item) => ageRange(item.dateOfBirth)), total),
      studyMode: withPercent(countBy(applications, (item) => item.modeOfStudy), total),
      paymentPlan: withPercent(countBy(applications, (item) => item.paymentPlan), total)
    },
    geography: {
      topDistricts: topCounts(applications, (item) => item.district, 5),
      topRegions: topCounts(applications, (item) => item.placeOfBirth, 5)
    },
    schools: {
      topFeeders: topCounts(applications, (item) => item.schoolName, 5)
    },
    programs: {
      facultyDemand,
      topDepartments: topCounts(applications, (item) => item.department, 5),
      revenueByProgram
    },
    marketing: {
      sourceOfInformation: withPercent(countBy(applications, (item) => item.heardFrom), total),
      topSources: topCounts(applications, (item) => item.heardFrom, 5)
    }
  });
};

export const exportReportCsv = async (req, res) => {
  const db = await readDb();
  const applications = filterByDate(db.applications, req.query);
  const csv = toCsv(applications, [
    { key: 'reference', header: 'Reference' },
    { key: 'fullName', header: 'Full Name' },
    { key: 'faculty', header: 'Faculty' },
    { key: 'department', header: 'Department' },
    { key: 'district', header: 'District' },
    { key: 'schoolName', header: 'School' },
    { key: 'heardFrom', header: 'Source' },
    { key: 'status', header: 'Status' },
    { key: 'paymentStatus', header: 'Payment Status' },
    { key: 'createdAt', header: 'Submitted At' }
  ]);
  sendCsv(res, 'admission-report.csv', csv);
};
