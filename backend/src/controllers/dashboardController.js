import { readDb } from '../lib/db.js';
import { sendJson } from '../lib/http.js';
import { countBy, sortNewest, topCounts } from '../lib/query.js';

const colors = ['#f97316', '#22c55e', '#a855f7', '#3b82f6', '#ec4899', '#8b5cf6'];

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

const lastNDays = (days) => {
  const result = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    result.push(date.toISOString().slice(0, 10));
  }
  return result;
};

export const getDashboard = async (req, res) => {
  const db = await readDb();
  const applications = db.applications;
  const approved = applications.filter((item) => item.status === 'Approved');
  const pending = applications.filter((item) => item.status === 'Pending');
  const rejected = applications.filter((item) => item.status === 'Rejected');

  const days = lastNDays(7);
  const weeklyAdmissions = days.map((day) => ({
    name: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
    applications: applications.filter((item) => dateKey(item.createdAt) === day).length,
    approved: approved.filter((item) => dateKey(item.updatedAt) === day).length
  }));

  const facultyCounts = countBy(applications, (item) => item.faculty);
  const facultyDemand = Object.entries(facultyCounts).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length]
  }));

  const thirtyDays = lastNDays(30);
  const trend30 = thirtyDays.filter((_, index) => index % 5 === 0 || index === thirtyDays.length - 1).map((day) => ({
    name: new Date(day).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    submitted: applications.filter((item) => dateKey(item.createdAt) <= day).length,
    accepted: approved.filter((item) => dateKey(item.updatedAt) <= day).length,
    rejected: rejected.filter((item) => dateKey(item.updatedAt) <= day).length
  }));

  const recentAdmissions = sortNewest(applications).slice(0, 5).map((item) => ({
    id: item.id,
    name: item.fullName,
    program: item.department,
    reference: item.reference,
    status: item.status,
    createdAt: item.createdAt
  }));

  sendJson(res, 200, {
    stats: {
      totalApplications: applications.length,
      approvedApplications: approved.length,
      pendingApplications: pending.length,
      rejectedApplications: rejected.length,
      students: db.students.length,
      paymentsCollected: db.payments
        .filter((item) => item.status === 'Paid')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    },
    weeklyAdmissions,
    facultyDemand,
    trend30,
    recentAdmissions,
    topDepartments: topCounts(applications, (item) => item.department, 5)
  });
};
