const preferredDepartmentCodes = new Map([
  ['Computer Application', 'CA'],
  ['Computer Network & Security', 'CNS'],
  ['Computer Networking & Security', 'CNS'],
  ['Computer Multi-Media', 'CM'],
  ['Computer Multimedia', 'CM'],
  ['BSc in Artificial Intelligence and Data Science', 'AIDS'],
  ['Medicine & General Surgery', 'MGS'],
  ['Nursing', 'NUR'],
  ['Midwifery', 'MID'],
  ['Public Health', 'PH'],
  ['Medical Laboratory Science', 'MLS'],
  ['BSc in Medical Radiography and Imaging Technology', 'MRI'],
  ['Business Administration', 'BA'],
  ['Public Administration', 'PA'],
  ['Banking & Finance', 'BF'],
  ['Accounting', 'ACC'],
  ['Economics', 'ECO'],
  ['BSc in Business Analytics', 'BBA'],
  ['BSc in Social Work', 'SW'],
  ['Civil Engineering', 'CE'],
  ['Electrical Engineering (Majoring in Power and Energy)', 'EEPE'],
  ['Electrical Engineering (Majoring in Telecommunications and Networking)', 'EETN'],
  ['Agricultural', 'AGR'],
  ['Veterinary', 'VET']
]);

export const normalizeDepartmentCode = (value) => String(value || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, 8);

const acronymFor = (name) => {
  const words = String(name || '')
    .replace(/\b(BSc|in|and|of|the|Majoring)\b/gi, ' ')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const acronym = words.map((word) => word[0]).join('').toUpperCase();
  return normalizeDepartmentCode(acronym || String(name || '').slice(0, 3)) || 'DEP';
};

export const ensureDepartmentCodes = (programs = []) => {
  const used = new Set();
  for (const program of programs) {
    for (const department of program.departments || []) {
      const requested = normalizeDepartmentCode(department.code)
        || preferredDepartmentCodes.get(String(department.name || '').trim())
        || acronymFor(department.name);
      let code = requested;
      let suffix = 2;
      while (used.has(code)) code = `${requested}${suffix++}`;
      department.code = code;
      used.add(code);
    }
  }
  return programs;
};

