// Student ID generation.
//
// Format: <DEPARTMENT CODE><2-digit year><4-digit sequence>
//   e.g. Computer Application enrolled in 2026 -> C1 + 26 + 0001 = "C1260001"
//
// The sequence resets per department per year and is collision-safe: it is
// derived from the highest existing number for that prefix (never from the
// array length), so deleting a student can never cause a duplicate ID.
//
// To change a department's code, edit the map below — nothing else needs to change.
const DEPARTMENT_CODES = {
  // Computer & IT
  'Computer Application': 'C1',
  'Software Engineering': 'C2',
  'Computer Multimedia': 'C5',
  'Computer Networking & Security': 'C6',
  'Computer Network & Security': 'C6',
  'Computer Multi-Media': 'C5',
  'BSc in Artificial Intelligence and Data Science': 'C7',
  // Medicine & Health Science
  'MBBS': 'M1',
  'Medicine & General Surgery': 'M1',
  'BSc in Medical Radiography and Imaging Technology': 'M6',
  'Nursing': 'M2',
  'Midwifery': 'M3',
  'Public Health': 'M4',
  'Medical Laboratory Science': 'M5',
  // Economics & Management
  'Business Administration': 'E1',
  'Public Administration': 'E2',
  'Banking & Finance': 'E3',
  'Accounting': 'E4',
  'Economics': 'E5',
  // Engineering
  'Civil Engineering': 'G1',
  'Electrical Engineering': 'G2',
  'Biomedical Engineering': 'G3',
  'Electrical Engineering (Majoring in Power and Energy)': 'G2',
  'Electrical Engineering (Majoring in Telecommunications and Networking)': 'G4',
  'BSc in Business Analytics': 'B6',
  'BSc in Social Work': 'B7',
  // Agro-Veterinary
  'Agricultural': 'A1',
  'Veterinary': 'A2'
};

// Used when a student's department has no mapped code (should not normally happen).
const FALLBACK_CODE = 'ST';

export const departmentCode = (department) =>
  DEPARTMENT_CODES[String(department ?? '').trim()] || FALLBACK_CODE;

export const generateStudentNumber = (db, department, date = new Date()) => {
  const code = departmentCode(department);
  const yearTwoDigits = String(date.getFullYear()).slice(-2);
  const prefix = `${code}${yearTwoDigits}`;

  let highestSequence = 0;
  for (const student of db.students || []) {
    const number = student.studentNumber || '';
    if (!number.startsWith(prefix)) continue;
    const sequence = parseInt(number.slice(prefix.length), 10);
    if (Number.isInteger(sequence) && sequence > highestSequence) {
      highestSequence = sequence;
    }
  }

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
};
