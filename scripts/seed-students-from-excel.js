/**
 * Clean std_data_for_db.xlsx and seed students (+ parents) into the DB.
 *
 * Usage: node scripts/seed-students-from-excel.js
 *
 * - Writes cleaned file: templates/students-cleaned.xlsx
 * - Creates missing classes / sections / academic years
 * - Seeds ALL rows (Active = not suspended; Disactive/Leave = suspended)
 */
const XLSX = require('xlsx');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

const SOURCE = path.join(process.cwd(), 'templates', 'std_data_for_db.xlsx');
const CLEANED = path.join(process.cwd(), 'templates', 'students-cleaned.xlsx');
const DEFAULT_PASSWORD = 'Student@123';
const SCHOOL_ID = 'default-school';
const CAMPUS_ID = 'default-campus';
const CLASS_GROUP_ID = 'excel-import-class-group';

const CLASS_MAP = {
  'play group': 'Play Group',
  'grade prep': 'Grade Prep',
  'grade one': 'Grade 1',
  'grade two': 'Grade 2',
  'grade three': 'Grade 3',
  'grade four': 'Grade 4',
  'grade five': 'Grade 5',
  'grade six': 'Grade 6',
  'grade seven': 'Grade 7',
  'grade eight': 'Grade 8',
  'grade nine': 'Grade 9',
  'grade ten': 'Grade 10',
  'adv. group': 'Advanced Group',
  'advanced group': 'Advanced Group',
};

const CLASS_TO_GROUP = {
  'Play Group': 'Early Years',
  'Grade Prep': 'Early Years',
  'Grade 1': 'Primary',
  'Grade 2': 'Primary',
  'Grade 3': 'Primary',
  'Grade 4': 'Primary',
  'Grade 5': 'Primary',
  'Grade 6': 'Middle',
  'Grade 7': 'Middle',
  'Grade 8': 'Middle',
  'Grade 9': 'Secondary',
  'Grade 10': 'Secondary',
  'Advanced Group': 'Secondary',
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function cleanStr(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if (!s || s.toUpperCase() === 'NULL' || s === '-' || /^[\s\-]+$/.test(s)) return '';
  // blank cnic patterns like "     -       -"
  if (/^[\s\-]*$/.test(s.replace(/\d/g, ''))) {
    const digits = s.replace(/\D/g, '');
    if (!digits) return '';
  }
  return s.replace(/\s+/g, ' ').trim();
}

function parseFlexibleDate(v) {
  const s = cleanStr(v);
  if (!s) return null;

  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) > 20000) {
    const n = Number(s);
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + n * 86400000);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // M/D/YY or M/D/YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year <= 40 ? 2000 : 1900;
    const month = Number(m[1]) - 1;
    const day = Number(m[2]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeGender(v) {
  const s = cleanStr(v).toUpperCase();
  if (s === 'MALE' || s === 'M') return 'MALE';
  if (s === 'FEMALE' || s === 'F') return 'FEMALE';
  if (s === 'OTHER') return 'OTHER';
  return 'UNSPECIFIED';
}

function normalizePhone(v) {
  let s = cleanStr(v).replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('92') && s.length >= 12) s = '0' + s.slice(2);
  if (s.length === 10 && s.startsWith('3')) s = '0' + s;
  return s;
}

function normalizeCnic(v) {
  const s = cleanStr(v);
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (digits.length !== 13) return digits || '';
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function mapClassName(raw) {
  const key = cleanStr(raw).toLowerCase();
  return CLASS_MAP[key] || cleanStr(raw);
}

function parseSession(session) {
  const s = cleanStr(session);
  const m = s.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (m) return { startYear: m[1], stopYear: m[2] };
  return { startYear: '2024', stopYear: '2025' };
}

function slugEmailLocal(name, sid, domain = 'theharvardschools.com') {
  const base = cleanStr(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40);
  return `${base || 'student'}.${sid}@${domain}`;
}

function cleanRows(rawRows, domain = 'theharvardschools.com') {
  const cleaned = [];
  const errors = [];

  for (const row of rawRows) {
    const sid = cleanStr(row.SID) || cleanStr(row.AdminNo);
    const name = cleanStr(row.StudentNAme);
    if (!name) {
      errors.push({ sid, reason: 'Missing student name' });
      continue;
    }

    const className = mapClassName(row.class);
    if (!className) {
      errors.push({ sid, name, reason: 'Missing class' });
      continue;
    }

    const section = (cleanStr(row.Section) || 'A').toUpperCase();
    const status = cleanStr(row.status) || 'Active';
    const admissionDate =
      parseFlexibleDate(row.AdminDate) || new Date('2020-01-01');
    const session = parseSession(row.Session);
    const emailRaw = cleanStr(row.emailId);
    const email =
      emailRaw && emailRaw.includes('@')
        ? emailRaw.toLowerCase()
        : slugEmailLocal(name, sid || String(cleaned.length + 1), domain);

    const fatherName = cleanStr(row.fatherNAme) || 'Guardian';
    const motherName = cleanStr(row.MotherName);
    const guardianName = cleanStr(row.GName);

    cleaned.push({
      sid,
      name,
      email,
      password: DEFAULT_PASSWORD,
      gender: normalizeGender(row.Gender),
      phone: normalizePhone(row.contatNo || row.Phon),
      address: cleanStr(row.currAddres) || cleanStr(row.PermAddres),
      religion: cleanStr(row.Religion) || 'Islam',
      city: 'Sargodha',
      campus: 'Main Campus',
      class_group: CLASS_TO_GROUP[className] || 'Primary',
      class: className,
      section,
      subject_group: '',
      admission_number: cleanStr(row.AdminNo),
      roll_number: cleanStr(row['Roll No']),
      admission_date: toIsoDate(admissionDate),
      start_year: session.startYear,
      stop_year: session.stopYear,
      parent_name: fatherName,
      parent_email: '',
      parent_phone: normalizePhone(row.contatNo || row.Gcontact),
      parent_cnic: normalizeCnic(row.fcnic || row.Gcnic),
      parent_occupation: cleanStr(row.focpacrion),
      relationship: 'FATHER',
      mother_name: motherName,
      mother_cnic: normalizeCnic(row.mcinc),
      mother_occupation: cleanStr(row.Mocpation),
      guardian_name: guardianName,
      guardian_phone: normalizePhone(row.Gcontact),
      guardian_cnic: normalizeCnic(row.Gcnic),
      guardian_relationship: cleanStr(row.GrelationShip).toUpperCase() || 'GUARDIAN',
      status,
      suspended: status.toLowerCase() !== 'active',
      session_label: cleanStr(row.Session),
      original_class: cleanStr(row.class),
      original_cname: cleanStr(row.CName),
    });
  }

  return { cleaned, errors };
}

function writeCleanedExcel(cleaned, domain = 'theharvardschools.com') {
  const exportCols = [
    'sid',
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
    'admission_number',
    'roll_number',
    'admission_date',
    'start_year',
    'stop_year',
    'parent_name',
    'parent_phone',
    'parent_cnic',
    'parent_occupation',
    'relationship',
    'status',
    'suspended',
  ];

  const sheetRows = cleaned.map((r) => {
    const o = {};
    for (const c of exportCols) o[c] = r[c] ?? '';
    return o;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows, { header: exportCols });
  ws['!cols'] = exportCols.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  const summary = [
    ['Metric', 'Value'],
    ['Total cleaned', cleaned.length],
    ['Active', cleaned.filter((r) => !r.suspended).length],
    ['Suspended (Disactive/Leave)', cleaned.filter((r) => r.suspended).length],
    ['Unique classes', [...new Set(cleaned.map((r) => r.class))].join(', ')],
    ['Default password', DEFAULT_PASSWORD],
    ['Email domain', `@${domain}`],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  XLSX.writeFile(wb, CLEANED);
  console.log(`📄 Cleaned Excel written: ${CLEANED}`);
}

async function ensureAcademicYears(cleaned) {
  const pairs = new Map();
  for (const r of cleaned) {
    pairs.set(`${r.start_year}-${r.stop_year}`, {
      startYear: r.start_year,
      stopYear: r.stop_year,
    });
  }

  const map = new Map();
  for (const { startYear, stopYear } of pairs.values()) {
    let year = await prisma.academicYear.findFirst({
      where: { schoolId: SCHOOL_ID, startYear, stopYear },
    });
    if (!year) {
      year = await prisma.academicYear.create({
        data: { schoolId: SCHOOL_ID, startYear, stopYear },
      });
      console.log(`📅 Created academic year ${startYear}-${stopYear}`);
    }
    map.set(`${startYear}-${stopYear}`, year.id);
  }
  return map;
}

async function ensureClassStructure(cleaned) {
  // Class groups by stage
  const groupNames = [...new Set(cleaned.map((r) => r.class_group))];
  const groupIdByName = new Map();

  for (const name of groupNames) {
    let group = await prisma.classGroup.findFirst({
      where: { campusId: CAMPUS_ID, name },
    });
    if (!group) {
      group = await prisma.classGroup.create({
        data: {
          name,
          description: `Imported from Excel (${name})`,
          campusId: CAMPUS_ID,
          isActive: true,
        },
      });
      console.log(`🏫 Created class group: ${name}`);
    }
    groupIdByName.set(name, group.id);
  }

  // Also keep a fallback group
  let fallback = await prisma.classGroup.findUnique({
    where: { id: CLASS_GROUP_ID },
  });
  if (!fallback) {
    fallback = await prisma.classGroup
      .create({
        data: {
          id: CLASS_GROUP_ID,
          name: 'Imported Classes',
          campusId: CAMPUS_ID,
          isActive: true,
        },
      })
      .catch(async () => {
        return prisma.classGroup.findFirst({ where: { campusId: CAMPUS_ID } });
      });
  }

  const classCache = new Map(); // "Grade 1" -> { classId, sections: Map }
  const needed = [...new Set(cleaned.map((r) => `${r.class}||${r.class_group}`))];

  for (const key of needed) {
    const [className, groupName] = key.split('||');
    const groupId = groupIdByName.get(groupName) || fallback.id;

    // Prefer existing class by exact name anywhere on this campus
    let cls = await prisma.class.findFirst({
      where: {
        name: className,
        classGroup: { campusId: CAMPUS_ID },
      },
      include: { sections: true },
    });

    if (!cls) {
      // Try loose match: "Grade 1" vs existing
      cls = await prisma.class.findFirst({
        where: {
          classGroup: { campusId: CAMPUS_ID },
          name: { equals: className, mode: 'insensitive' },
        },
        include: { sections: true },
      });
    }

    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: className,
          classGroupId: groupId,
          isActive: true,
          sections: {
            create: [{ name: 'A' }, { name: 'B' }],
          },
        },
        include: { sections: true },
      });
      console.log(`📚 Created class: ${className}`);
    }

    const sectionMap = new Map(
      cls.sections.map((s) => [s.name.toUpperCase(), s.id])
    );

    // Ensure A and B exist for import rows
    for (const secName of ['A', 'B']) {
      if (!sectionMap.has(secName)) {
        const created = await prisma.section.create({
          data: { name: secName, classId: cls.id, isActive: true },
        });
        sectionMap.set(secName, created.id);
        console.log(`  ➕ Section ${secName} on ${className}`);
      }
    }

    classCache.set(className, { classId: cls.id, sections: sectionMap });
  }

  return classCache;
}

async function seedStudents(cleaned, classCache, yearMap, domain = 'theharvardschools.com') {
  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  let created = 0;
  let skipped = 0;
  let parentsCreated = 0;
  const failures = [];

  // parent reuse key: normalized name + phone
  const parentCache = new Map();

  for (let i = 0; i < cleaned.length; i++) {
    const row = cleaned[i];
    const progress =
      i % 50 === 0 || i === cleaned.length - 1
        ? ` (${i + 1}/${cleaned.length})`
        : '';

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: row.email },
        include: { studentRecord: true },
      });
      if (existingUser?.studentRecord) {
        skipped++;
        if (progress) console.log(`⏭  Skip existing${progress}: ${row.email}`);
        continue;
      }

      const classInfo = classCache.get(row.class);
      if (!classInfo) {
        failures.push({ name: row.name, reason: `Class not found: ${row.class}` });
        continue;
      }

      const sectionId =
        classInfo.sections.get(row.section.toUpperCase()) ||
        classInfo.sections.get('A') ||
        null;

      const academicYearId = yearMap.get(`${row.start_year}-${row.stop_year}`);

      const result = await prisma.$transaction(async (tx) => {
        let user;
        if (existingUser) {
          user = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: row.name,
              phone: row.phone || null,
              address: row.address || null,
              religion: row.religion || null,
              gender: row.gender,
              role: Role.STUDENT,
              suspended: row.suspended,
            },
          });
        } else {
          user = await tx.user.create({
            data: {
              name: row.name,
              email: row.email,
              passwordHash,
              phone: row.phone || null,
              address: row.address || null,
              religion: row.religion || null,
              gender: row.gender,
              schoolId: SCHOOL_ID,
              role: Role.STUDENT,
              emailVerified: true,
              suspended: row.suspended,
            },
          });
        }

        await tx.campusAccess.upsert({
          where: {
            userId_campusId: { userId: user.id, campusId: CAMPUS_ID },
          },
          update: {},
          create: { userId: user.id, campusId: CAMPUS_ID },
        });

        const admissionNumber =
          row.admission_number ||
          `${row.start_year}-${row.class.replace(/\s+/g, '').slice(0, 6).toUpperCase()}-${String(row.sid).padStart(4, '0')}`;

        const studentRecord = await tx.studentRecord.create({
          data: {
            userId: user.id,
            admissionNumber: String(admissionNumber),
            rollNumber: row.roll_number || null,
            admissionDate: new Date(row.admission_date),
            classId: classInfo.classId,
            sectionId,
          },
        });

        if (academicYearId) {
          await tx.academicYearStudentRecord.create({
            data: {
              academicYearId,
              studentRecordId: studentRecord.id,
              classId: classInfo.classId,
              sectionId,
            },
          });
        }

        // Parent (father)
        const parentKey = `${row.parent_name.toLowerCase()}|${row.parent_phone}|${row.parent_cnic}`;
        let parentRecordId = parentCache.get(parentKey);

        if (!parentRecordId) {
          const parentEmail = `parent.${row.sid || i}@${domain}`;
          const existingParentUser = await tx.user.findUnique({
            where: { email: parentEmail },
            include: { parentRecord: true },
          });

          if (existingParentUser?.parentRecord) {
            parentRecordId = existingParentUser.parentRecord.id;
          } else {
            const parentUser = await tx.user.create({
              data: {
                name: row.parent_name,
                email: parentEmail,
                passwordHash,
                phone: row.parent_phone || row.phone || null,
                address: row.address || null,
                schoolId: SCHOOL_ID,
                role: Role.PARENT,
                emailVerified: true,
              },
            });
            const parentRecord = await tx.parentRecord.create({
              data: {
                userId: parentUser.id,
                occupation: row.parent_occupation || null,
                cnic: row.parent_cnic || null,
              },
            });
            parentRecordId = parentRecord.id;
            parentsCreated++;
          }
          parentCache.set(parentKey, parentRecordId);
        }

        await tx.kinship.create({
          data: {
            studentId: studentRecord.id,
            parentId: parentRecordId,
            relationship: 'FATHER',
            isPrimary: true,
          },
        });

        return studentRecord;
      });

      created++;
      if (progress) {
        console.log(`✅ Seeded${progress}: ${row.name} → ${result.admissionNumber}`);
      }
    } catch (err) {
      failures.push({
        name: row.name,
        email: row.email,
        reason: err.message || String(err),
      });
      if (failures.length <= 15) {
        console.error(`❌ Failed ${row.name}:`, err.message || err);
      }
    }
  }

  return { created, skipped, parentsCreated, failures };
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source file not found: ${SOURCE}`);
  }

  const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID } });
  if (!school) {
    throw new Error(`School ${SCHOOL_ID} not found. Run base seed first.`);
  }
  const campus = await prisma.campus.findUnique({ where: { id: CAMPUS_ID } });
  if (!campus) {
    throw new Error(`Campus ${CAMPUS_ID} not found.`);
  }

  const schoolDomain = school.name
    ? `${school.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    : 'theharvardschools.com';

  console.log(`🏫 Target: ${school.name} / ${campus.name} (Domain: @${schoolDomain})`);

  console.log('📖 Reading Excel...');
  const wb = XLSX.readFile(SOURCE);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: '',
    raw: false,
  });
  console.log(`   Raw rows: ${rawRows.length}`);

  const { cleaned, errors } = cleanRows(rawRows, schoolDomain);
  console.log(`🧹 Cleaned: ${cleaned.length} | Dropped: ${errors.length}`);
  if (errors.length) {
    console.log('   Sample drops:', errors.slice(0, 5));
  }

  writeCleanedExcel(cleaned, schoolDomain);

  const yearMap = await ensureAcademicYears(cleaned);
  const classCache = await ensureClassStructure(cleaned);

  console.log('🌱 Seeding students...');
  const result = await seedStudents(cleaned, classCache, yearMap, schoolDomain);

  console.log('\n======= DONE =======');
  console.log(`Created students : ${result.created}`);
  console.log(`Skipped existing : ${result.skipped}`);
  console.log(`Parents created  : ${result.parentsCreated}`);
  console.log(`Failures         : ${result.failures.length}`);
  if (result.failures.length) {
    const failPath = path.join(process.cwd(), 'templates', 'student-seed-failures.json');
    fs.writeFileSync(failPath, JSON.stringify(result.failures, null, 2));
    console.log(`Failures written : ${failPath}`);
  }
  console.log(`Cleaned Excel    : ${CLEANED}`);
  console.log(`Default password : ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
