import { readDb } from '../lib/db.js';
import { sendJson } from '../lib/http.js';

const fixedAdmissionFee = 25;

export const getOptions = async (req, res) => {
  const db = await readDb();
  sendJson(res, 200, {
    faculties: db.programs.map((program) => ({
      id: program.id,
      title: program.title,
      admissionFee: fixedAdmissionFee,
      campus: program.campus,
      departments: program.departments
    })),
    campuses: [...new Set(db.programs.map((program) => program.campus).filter(Boolean))],
    statuses: ['Pending', 'Approved', 'Rejected', 'Waitlisted', 'Cancelled'],
    paymentMethods: ['EVC Plus', 'Card', 'eDahab', 'Zaad', 'Sahal'],
    contactTypes: ['Admission', 'Payment', 'Technical Support', 'General']
  });
};
