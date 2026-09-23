/**
 * Fresh student import from templates/Student data 3 .xlsx
 *
 * Deletes every STUDENT and PARENT user (and their fee, attendance,
 * result, and kinship rows), then seeds the full Excel list.
 *
 * Usage:
 *   node scripts/seed-fresh-students.js --dry-run
 *   node scripts/seed-fresh-students.js
 *
 * Login: admission number (username) or generated email.
 * Password: Student@123
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

const SOURCE = path.join(process.cwd(), 'templates', 'Student data 3 .xlsx');
const FAIL_PATH = path.join(process.cwd(), 'templates', 'fresh-student-seed-failures.json');
const DEFAULT_PASSWORD = 'Student@123';
const SCHOOL_ID = 'default-school';
const CAMPUS_ID = 'default-campus';
const DRY_RUN = process.argv.includes('--dry-run');

const CLASS_ALIASES = {
  'play group': 'Play Group',
  'grade prep': 'Grade Prep',
  'ths prep': 'Grade Prep',
  'ths-prep': 'Grade Prep',
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
  'adv.group': 'Advanced Group',
  'adv group': 'Advanced Group',
  'advanced group': 'Advanced Group',
  'advance': 'Advanced Group',
  'adv. group b': 'Grade 4',
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

function cleanStr(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if (!s || s.toUpperCase() === 'NULL' || s === '-' || /^[\s\-]+$/.test(s)) return '';
  if (/^[\s\-]*$/.test(s.replace(/\d/g, ''))) {
    if (!s.replace(/\D/g, '')) return '';
  }
  return s.replace(/\s+/g, ' ').trim();
}

function parseFlexibleDate(v) {
  const s = cleanStr(v);
  if (!s || s === '0001-01-01') return null;

  if (/^\d+(\.\d+)?$/.test(s) && Number(s) > 20000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + Number(s) * 86400000);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year <= 40 ? 2000 : 1900;
    const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const digits = cleanStr(v).replace(/\D/g, '');
  if (digits.length !== 13) return '';
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function normalizeReligion(v) {
  const s = cleanStr(v).toLowerCase();
  if (!s || s === 'islam' || s === 'muslim') return 'Islam';
  if (s === 'christian' || s === 'christianity') return 'Christian';
  if (s === 'hindu' || s === 'hinduism') return 'Hindu';
  if (s === 'sikh' || s === 'sikhism') return 'Sikh';
  return 'Islam';
}

function stripCohortYear(v) {
  return cleanStr(v).replace(/\s*[-–]\s*\d{2,4}\s*$/, '').replace(/\s+/g, ' ').trim();
}

function resolveClass(cname, classCol) {
  const fromCName = CLASS_ALIASES[stripCohortYear(cname).toLowerCase()];
  if (fromCName) return fromCName;
  return CLASS_ALIASES[cleanStr(classCol).toLowerCase()] || '';
}

function resolveSection(v) {
  return cleanStr(v).toUpperCase() === 'B' ? 'B' : 'A';
}

function parseSession(session) {
  const m = cleanStr(session).match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  if (m) return { startYear: m[1], stopYear: m[2], label: `${m[1]}-${m[2]}` };
  return { startYear: '2026', stopYear: '2027', label: '2026-2027' };
}

function slug(name) {
  return (
    cleanStr(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 40) || 'student'
  );
}

function studentEmail(name, sid, domain) {
  return `${slug(name)}.${sid}@${domain}`;
}

function parentEmail(kind, name, phone, cnic, domain) {
  const tail = (normalizePhone(phone) || normalizeCnic(cnic).replace(/\D/g, '') || 'na').slice(-8);
  return `${kind}.${slug(name)}.${tail}@${domain}`;
}

function isJunkRow(row) {
  const filled = row.filter((v) => cleanStr(v));
  const sid = cleanStr(row[0]);
  return filled.length <= 2 && !/^\d+$/.test(sid);
}

function isShiftedContinuation(row) {
  const session = cleanStr(row[44]);
  const className = resolveClass(row[46], row[46]);
  return /^\d{4}\s*[-–]\s*\d{4}$/.test(session) && Boolean(className);
}

function baseStudent(row, domain) {
  const sid = cleanStr(row[0]);
  const name = cleanStr(row[1]);
  return {
    sid,
    name,
    email: studentEmail(name, sid || 'x', domain),
    gender: normalizeGender(row[2]),
    religion: normalizeReligion(row[3]),
    phone: normalizePhone(row[7]),
    address: cleanStr(row[9]) || cleanStr(row[10]),
    city: 'Sargodha',
    fatherName: cleanStr(row[12]) || 'Guardian',
    fatherCnic: normalizeCnic(row[13]),
    fatherOccupation: cleanStr(row[14]),
    fatherPhone: normalizePhone(row[7]) || normalizePhone(row[24]),
    motherName: cleanStr(row[16]),
    motherOccupation: cleanStr(row[17]),
    motherCnic: normalizeCnic(row[18]),
    guardianName: cleanStr(row[20]),
    guardianCnic: normalizeCnic(row[22]),
    guardianRelationship: cleanStr(row[23]).toUpperCase() || 'GUARDIAN',
    guardianPhone: normalizePhone(row[24]),
    admissionDate: parseFlexibleDate(row[33]) || new Date('2020-01-01'),
    admissionNumber: cleanStr(row[34]),
    section: resolveSection(row[40]),
    session: parseSession(row[55]),
    className: resolveClass(row[49], row[57]),
    rollNumber: cleanStr(row[94]) || null,
    status: cleanStr(row[95]) || 'Active',
  };
}

function applyShiftedTail(student, row) {
  const fatherName = cleanStr(row[1]);
  const fatherPhone = normalizePhone(row[13]);
  const admissionDate = parseFlexibleDate(row[22]);
  student.fatherName = fatherName || student.fatherName;
  student.fatherOccupation = cleanStr(row[3]) || student.fatherOccupation;
  student.motherName = cleanStr(row[5]) || student.motherName;
  student.motherOccupation = cleanStr(row[6]) || student.motherOccupation;
  student.fatherPhone = fatherPhone || student.fatherPhone;
  student.phone = student.phone || fatherPhone;
  student.admissionDate = admissionDate || student.admissionDate;
  student.admissionNumber = cleanStr(row[23]) || student.admissionNumber;
  student.section = resolveSection(row[29]);
  student.session = parseSession(row[44]);
  student.className = resolveClass(row[46], row[46]);
  student.rollNumber = cleanStr(row[83]) || student.rollNumber;
  student.status = cleanStr(row[84]) || 'Active';
  return student;
}

function finalize(student) {
  student.suspended = student.status.toLowerCase() !== 'active';
  student.classGroup = CLASS_TO_GROUP[student.className] || 'Primary';
  return student;
}

function readStudents(domain) {
  const wb = XLSX.readFile(SOURCE);
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: '',
    raw: false,
  });
  const rows = aoa.slice(1);
  const cleaned = [];
  const dropped = [];
  let partial = null;

  const flushPartial = (reason) => {
    if (!partial) return;
    dropped.push({ sid: partial.sid, name: partial.name, reason });
    partial = null;
  };

  for (const row of rows) {
    if (isJunkRow(row)) continue;

    if (partial && isShiftedContinuation(row)) {
      cleaned.push(finalize(applyShiftedTail(partial, row)));
      partial = null;
      continue;
    }

    if (!cleanStr(row[1])) {
      dropped.push({ sid: cleanStr(row[0]), reason: 'Missing student name' });
      continue;
    }

    const student = baseStudent(row, domain);
    if (!student.className) {
      flushPartial('Incomplete row was replaced before a continuation was found');
      partial = student;
      continue;
    }

    flushPartial('Incomplete row had no continuation');
    if (!student.admissionNumber) {
      dropped.push({ sid: student.sid, name: student.name, reason: 'Missing admission number' });
      continue;
    }
    cleaned.push(finalize(student));
  }

  flushPartial('Incomplete row at end of file');

  const seenAdmission = new Set();
  const seenEmail = new Set();
  const unique = [];
  for (const student of cleaned) {
    if (seenAdmission.has(student.admissionNumber)) {
      dropped.push({
        sid: student.sid,
        name: student.name,
        reason: `Duplicate admission number ${student.admissionNumber}`,
      });
      continue;
    }
    if (seenEmail.has(student.email)) {
      student.email = student.email.replace('@', `.${student.admissionNumber}@`);
    }
    seenAdmission.add(student.admissionNumber);
    seenEmail.add(student.email);
    unique.push(student);
  }

  return { cleaned: unique, dropped, rawCount: rows.length };
}

async function wipeStudentsAndParents() {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: { id: true },
  });
  const parents = await prisma.user.findMany({
    where: { role: Role.PARENT },
    select: { id: true },
  });
  const studentIds = students.map((u) => u.id);
  const parentIds = parents.map((u) => u.id);
  const userIds = [...studentIds, ...parentIds];

  console.log(`🗑  Removing ${studentIds.length} students and ${parentIds.length} parents`);
  if (!userIds.length) return { students: 0, parents: 0 };

  if (studentIds.length) {
    await prisma.questionMark.deleteMany({
      where: { examResult: { studentId: { in: studentIds } } },
    });
    await prisma.examResult.deleteMany({
      where: { studentId: { in: studentIds } },
    });
    await prisma.challan.updateMany({
      where: {
        OR: [
          { studentId: { in: studentIds }, cancelsChallanId: { not: null } },
          { cancelsChallan: { studentId: { in: studentIds } } },
        ],
      },
      data: { cancelsChallanId: null },
    });
  }

  await prisma.attendance.updateMany({
    where: { recordedById: { in: userIds } },
    data: { recordedById: null },
  });

  if (studentIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: studentIds } } });
  }
  if (parentIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: parentIds } } });
  }

  const leftStudents = await prisma.studentRecord.count();
  const leftParents = await prisma.parentRecord.count();
  if (leftStudents || leftParents) {
    throw new Error(`Wipe incomplete. Students left: ${leftStudents}, parents left: ${leftParents}`);
  }

  return { students: studentIds.length, parents: parentIds.length };
}

async function ensureAcademicYears(students) {
  const pairs = new Map();
  for (const student of students) {
    pairs.set(student.session.label, student.session);
  }

  const map = new Map();
  for (const session of pairs.values()) {
    let year = await prisma.academicYear.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        startYear: session.startYear,
        stopYear: session.stopYear,
      },
    });
    if (!year) {
      year = await prisma.academicYear.create({
        data: {
          schoolId: SCHOOL_ID,
          startYear: session.startYear,
          stopYear: session.stopYear,
        },
      });
      console.log(`📅 Created academic year ${session.label}`);
    }
    map.set(session.label, year.id);
  }
  return map;
}

async function ensureClassStructure(students) {
  const groupIdByName = new Map();
  for (const name of [...new Set(students.map((s) => s.classGroup))]) {
    let group = await prisma.classGroup.findFirst({
      where: { campusId: CAMPUS_ID, name },
    });
    if (!group) {
      group = await prisma.classGroup.create({
        data: {
          name,
          description: `${name} classes`,
          campusId: CAMPUS_ID,
          isActive: true,
        },
      });
      console.log(`🏫 Created class group: ${name}`);
    }
    groupIdByName.set(name, group.id);
  }

  const classCache = new Map();
  const needed = [...new Set(students.map((s) => `${s.className}||${s.classGroup}`))];

  for (const key of needed) {
    const [className, groupName] = key.split('||');
    let cls = await prisma.class.findFirst({
      where: { name: className, classGroup: { campusId: CAMPUS_ID } },
      include: { sections: true },
    });

    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: className,
          classGroupId: groupIdByName.get(groupName),
          isActive: true,
          sections: { create: [{ name: 'A' }, { name: 'B' }] },
        },
        include: { sections: true },
      });
      console.log(`📚 Created class: ${className}`);
    }

    const sectionMap = new Map(cls.sections.map((s) => [s.name.toUpperCase(), s.id]));
    for (const secName of ['A', 'B']) {
      if (!sectionMap.has(secName)) {
        const created = await prisma.section.create({
          data: { name: secName, classId: cls.id, isActive: true },
        });
        sectionMap.set(secName, created.id);
      }
    }
    classCache.set(className, { classId: cls.id, sections: sectionMap });
  }

  return classCache;
}

async function seedStudents(students, classCache, yearMap, passwordHash, domain) {
  let created = 0;
  let parentsCreated = 0;
  const failures = [];
  const parentCache = new Map();
  const usedEmails = new Set(students.map((s) => s.email));

  function claimEmail(email) {
    let next = email;
    let n = 2;
    while (usedEmails.has(next)) {
      next = email.replace('@', `.${n}@`);
      n += 1;
    }
    usedEmails.add(next);
    return next;
  }

  async function ensureParent(tx, kind, profile, fallbackKey, stagedParents) {
    const key = `${kind}|${profile.name.toLowerCase()}|${profile.phone}|${profile.cnic}`;
    const cached = stagedParents.get(key) || parentCache.get(key);
    if (cached) return cached;

    const email = claimEmail(
      parentEmail(kind, profile.name, profile.phone, profile.cnic || fallbackKey, domain)
    );
    const user = await tx.user.create({
      data: {
        name: profile.name,
        email,
        username: null,
        passwordHash,
        phone: profile.phone || null,
        address: profile.address || null,
        schoolId: SCHOOL_ID,
        role: Role.PARENT,
        emailVerified: true,
        gender: kind === 'mother' ? 'FEMALE' : kind === 'father' ? 'MALE' : 'UNSPECIFIED',
      },
    });
    await tx.campusAccess.create({
      data: { userId: user.id, campusId: CAMPUS_ID },
    });
    const record = await tx.parentRecord.create({
      data: {
        userId: user.id,
        occupation: profile.occupation || null,
        cnic: profile.cnic || null,
      },
    });
    stagedParents.set(key, record.id);
    return record.id;
  }

  for (let i = 0; i < students.length; i++) {
    const row = students[i];
    try {
      const classInfo = classCache.get(row.className);
      if (!classInfo) {
        throw new Error(`Class not found: ${row.className}`);
      }
      const sectionId = classInfo.sections.get(row.section) || classInfo.sections.get('A');
      const academicYearId = yearMap.get(row.session.label);
      const stagedParents = new Map();

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: row.name,
            email: row.email,
            username: row.admissionNumber,
            passwordHash,
            phone: row.phone || null,
            address: row.address || null,
            city: row.city,
            religion: row.religion,
            gender: row.gender,
            schoolId: SCHOOL_ID,
            role: Role.STUDENT,
            emailVerified: true,
            suspended: row.suspended,
          },
        });

        await tx.campusAccess.create({
          data: { userId: user.id, campusId: CAMPUS_ID },
        });

        const studentRecord = await tx.studentRecord.create({
          data: {
            userId: user.id,
            schoolId: SCHOOL_ID,
            admissionNumber: row.admissionNumber,
            rollNumber: row.rollNumber,
            admissionDate: row.admissionDate,
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

        const fatherId = await ensureParent(
          tx,
          'father',
          {
            name: row.fatherName,
            phone: row.fatherPhone,
            cnic: row.fatherCnic,
            occupation: row.fatherOccupation,
            address: row.address,
          },
          row.sid,
          stagedParents
        );
        await tx.kinship.create({
          data: {
            studentId: studentRecord.id,
            parentId: fatherId,
            relationship: 'FATHER',
            isPrimary: true,
          },
        });

        if (row.motherName) {
          const motherId = await ensureParent(
            tx,
            'mother',
            {
              name: row.motherName,
              phone: row.fatherPhone,
              cnic: row.motherCnic,
              occupation: row.motherOccupation,
              address: row.address,
            },
            `${row.sid}-mother`,
            stagedParents
          );
          if (motherId !== fatherId) {
            await tx.kinship.create({
              data: {
                studentId: studentRecord.id,
                parentId: motherId,
                relationship: 'MOTHER',
                isPrimary: false,
              },
            });
          }
        }

        const guardianSameAsFather =
          row.guardianName &&
          row.guardianName.toLowerCase() === row.fatherName.toLowerCase();
        if (row.guardianName && !guardianSameAsFather) {
          const guardianId = await ensureParent(
            tx,
            'guardian',
            {
              name: row.guardianName,
              phone: row.guardianPhone || row.fatherPhone,
              cnic: row.guardianCnic,
              occupation: null,
              address: row.address,
            },
            `${row.sid}-guardian`,
            stagedParents
          );
          if (guardianId !== fatherId) {
            await tx.kinship.create({
              data: {
                studentId: studentRecord.id,
                parentId: guardianId,
                relationship: row.guardianRelationship || 'GUARDIAN',
                isPrimary: false,
              },
            });
          }
        }
      });

      for (const [key, id] of stagedParents) {
        if (!parentCache.has(key)) parentsCreated += 1;
        parentCache.set(key, id);
      }
      created += 1;
      if (created % 50 === 0 || i === students.length - 1) {
        console.log(`✅ ${created}/${students.length}  ${row.name} (${row.admissionNumber})`);
      }
    } catch (err) {
      failures.push({
        sid: row.sid,
        name: row.name,
        admissionNumber: row.admissionNumber,
        reason: err.message || String(err),
      });
      console.error(`❌ ${row.name} (${row.admissionNumber}): ${err.message || err}`);
    }
  }

  return { created, parentsCreated, failures };
}

function printSummary(students, dropped) {
  const byClass = {};
  const byStatus = {};
  for (const student of students) {
    byClass[student.className] = (byClass[student.className] || 0) + 1;
    byStatus[student.status] = (byStatus[student.status] || 0) + 1;
  }
  console.log(`Raw Excel rows : ${students.length + dropped.length} kept+dropped accounting below`);
  console.log(`Ready to seed  : ${students.length}`);
  console.log(`Dropped        : ${dropped.length}`);
  console.log('By status      :', byStatus);
  console.log('By class       :', byClass);
  if (dropped.length) console.log('Dropped sample :', dropped.slice(0, 8));
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source file not found: ${SOURCE}`);
  }

  const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID } });
  if (!school) throw new Error(`School ${SCHOOL_ID} not found.`);
  const campus = await prisma.campus.findUnique({ where: { id: CAMPUS_ID } });
  if (!campus) throw new Error(`Campus ${CAMPUS_ID} not found.`);

  const domain = 'theharvardschools.com';
  console.log(`🏫 ${school.name} / ${campus.name}`);

  const { cleaned, dropped, rawCount } = readStudents(domain);
  console.log(`📖 Excel rows: ${rawCount}`);
  printSummary(cleaned, dropped);

  if (DRY_RUN) {
    console.log('Dry run only. Nothing was deleted or inserted.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const wiped = await wipeStudentsAndParents();
  const yearMap = await ensureAcademicYears(cleaned);
  const classCache = await ensureClassStructure(cleaned);

  console.log('🌱 Seeding fresh students...');
  const result = await seedStudents(cleaned, classCache, yearMap, passwordHash, domain);

  const dbStudents = await prisma.studentRecord.count();
  const dbParents = await prisma.parentRecord.count();

  console.log('\n======= DONE =======');
  console.log(`Removed students : ${wiped.students}`);
  console.log(`Removed parents  : ${wiped.parents}`);
  console.log(`Seeded students  : ${result.created}`);
  console.log(`Parents created  : ${result.parentsCreated}`);
  console.log(`Failures         : ${result.failures.length}`);
  console.log(`DB students now  : ${dbStudents}`);
  console.log(`DB parents now   : ${dbParents}`);
  console.log(`Default password : ${DEFAULT_PASSWORD}`);
  console.log('Username         : admission number');

  if (result.failures.length || dropped.length) {
    fs.writeFileSync(
      FAIL_PATH,
      JSON.stringify({ dropped, failures: result.failures }, null, 2)
    );
    console.log(`Notes written    : ${FAIL_PATH}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
