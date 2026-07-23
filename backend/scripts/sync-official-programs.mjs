import fs from 'node:fs/promises';

const databaseFiles = [
  new URL('../data/database.json', import.meta.url),
  new URL('../data/database.json.bak', import.meta.url),
];

const officialPrograms = new Map([
  ['fac_medicine', {
    title: 'Medicine & Health Science',
    departments: [
      ['dep_mbbs', 'Medicine & General Surgery', 7],
      ['dep_nursing', 'Nursing', 5],
      ['dep_midwifery', 'Midwifery', 5],
      ['dep_public_health', 'Public Health', 5],
      ['dep_laboratory', 'Medical Laboratory Science', 5],
      ['dep_radiography', 'BSc in Medical Radiography and Imaging Technology', 5],
    ],
  }],
  ['fac_computing', {
    title: 'Computer & IT',
    departments: [
      ['dep_computer_application', 'Computer Application', 5],
      ['dep_networking', 'Computer Network & Security', 5],
      ['dep_multimedia', 'Computer Multi-Media', 5],
      ['dep_ai_data', 'BSc in Artificial Intelligence and Data Science', 5],
    ],
  }],
  ['fac_business', {
    title: 'Economics & Management',
    departments: [
      ['dep_business_admin', 'Business Administration', 5],
      ['dep_banking', 'Banking & Finance', 5],
      ['dep_accounting', 'Accounting', 5],
      ['dep_public_admin', 'Public Administration', 5],
      ['dep_economics', 'Economics', 5],
      ['dep_business_analytics', 'BSc in Business Analytics', 5],
      ['dep_social_work', 'BSc in Social Work', 5],
    ],
  }],
  ['fac_engineering', {
    title: 'Engineering',
    departments: [
      ['dep_civil', 'Civil Engineering', 5],
      ['dep_electrical_power', 'Electrical Engineering (Majoring in Power and Energy)', 5],
      ['dep_electrical_networking', 'Electrical Engineering (Majoring in Telecommunications and Networking)', 5],
    ],
  }],
]);

for (const databaseFile of databaseFiles) {
  const database = JSON.parse(await fs.readFile(databaseFile, 'utf8'));
  database.programs = database.programs
    .filter((program) => program.id !== 'fac_agro')
    .map((program) => {
      const official = officialPrograms.get(program.id);
      if (!official) return program;
      return {
        ...program,
        title: official.title,
        departments: official.departments.map(([id, name, durationYears]) => ({
          id,
          name,
          durationYears,
        })),
      };
    });
  await fs.writeFile(databaseFile, `${JSON.stringify(database, null, 2)}\n`);
}

console.log('Official JUST faculties and departments synchronized.');
