const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outDir = path.join(process.cwd(), 'templates');
fs.mkdirSync(outDir, { recursive: true });

const headers = [
  'name',
  'email',
  'password',
  'gender',
  'phone',
  'address',
  'religion',
  'city',
  'campus',
  'class_group',
  'class',
  'section',
  'subject_group',
  'admission_number',
  'roll_number',
  'admission_date',
  'start_year',
  'stop_year',
  'parent_name',
  'parent_email',
  'parent_phone',
  'parent_cnic',
  'parent_occupation',
  'relationship',
];

const samples = [
  {
    name: 'Fatima Khan',
    email: 'fatima001@school.com',
    password: 'Student@123',
    gender: 'FEMALE',
    phone: '03001112233',
    address: 'House 12, Gulberg, Lahore',
    religion: 'Islam',
    city: 'Lahore',
    campus: 'Main Campus',
    class_group: 'Secondary',
    class: 'Class 9',
    section: 'A',
    subject_group: 'Science',
    admission_number: '',
    roll_number: '1',
    admission_date: '2026-04-01',
    start_year: '2026',
    stop_year: '2027',
    parent_name: 'Imran Khan',
    parent_email: 'imran.khan@email.com',
    parent_phone: '03009998877',
    parent_cnic: '35202-1111111-1',
    parent_occupation: 'Business',
    relationship: 'FATHER',
  },
  {
    name: 'Ahmed Ali',
    email: 'ahmed002@school.com',
    password: 'Student@123',
    gender: 'MALE',
    phone: '03004445566',
    address: 'Street 5, Model Town, Lahore',
    religion: 'Islam',
    city: 'Lahore',
    campus: 'Main Campus',
    class_group: 'Secondary',
    class: 'Class 9',
    section: 'A',
    subject_group: 'Science',
    admission_number: '',
    roll_number: '2',
    admission_date: '2026-04-01',
    start_year: '2026',
    stop_year: '2027',
    parent_name: 'Sara Ali',
    parent_email: 'sara.ali@email.com',
    parent_phone: '03007776655',
    parent_cnic: '35202-2222222-2',
    parent_occupation: 'Teacher',
    relationship: 'MOTHER',
  },
];

const instructions = [
  ['Field', 'Required', 'Allowed / Format', 'Notes'],
  ['name', 'Yes', 'Text', 'Student full name'],
  ['email', 'Yes', 'email@domain.com', 'Must be unique'],
  ['password', 'Yes', 'Min 6 chars', 'Login password'],
  ['gender', 'Yes', 'MALE | FEMALE | OTHER | UNSPECIFIED', 'Uppercase only'],
  ['phone', 'No', '03001234567', ''],
  ['address', 'No', 'Text', ''],
  ['religion', 'No', 'Text', ''],
  ['city', 'No', 'Text', ''],
  ['campus', 'Yes', 'Exact name in system', 'Must already exist'],
  ['class_group', 'Yes', 'Exact name in system', 'Must already exist'],
  ['class', 'Yes', 'Exact name in system', 'Must already exist'],
  ['section', 'No', 'Exact name in system', 'Must already exist if filled'],
  ['subject_group', 'No', 'Exact name in system', 'Stream e.g. Science'],
  ['admission_number', 'No', '2026-09-0001', 'Leave blank to auto-generate later'],
  ['roll_number', 'No', '1', 'Class roll number'],
  ['admission_date', 'Yes', 'YYYY-MM-DD', 'Example: 2026-04-01'],
  ['start_year', 'Yes', 'YYYY', 'Example: 2026'],
  ['stop_year', 'Yes', 'YYYY', 'Example: 2027'],
  ['parent_name', 'Yes', 'Text', 'Father/Mother/Guardian name'],
  ['parent_email', 'No', 'email@domain.com', ''],
  ['parent_phone', 'No', '03001234567', ''],
  ['parent_cnic', 'No', '35202-1234567-1', ''],
  ['parent_occupation', 'No', 'Text', ''],
  ['relationship', 'Yes', 'FATHER | MOTHER | GUARDIAN | OTHER', 'Uppercase only'],
  ['', '', '', ''],
  [
    'IMPORTANT',
    '',
    '',
    'Delete sample rows before import. Keep header row. Campus/Class names must match system exactly.',
  ],
];

const wb = XLSX.utils.book_new();

const studentsSheet = XLSX.utils.json_to_sheet(samples, { header: headers });
studentsSheet['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
XLSX.utils.book_append_sheet(wb, studentsSheet, 'Students');

const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
instructionsSheet['!cols'] = [
  { wch: 20 },
  { wch: 10 },
  { wch: 40 },
  { wch: 35 },
];
XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

const outPath = path.join(outDir, 'student-import-template.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Created:', outPath);
