const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, initials: true },
  });
  console.log('Schools:', JSON.stringify(schools, null, 2));

  const campuses = await prisma.campus.findMany({
    select: { id: true, name: true, schoolId: true },
  });
  console.log('Campuses:', JSON.stringify(campuses, null, 2));

  const classGroups = await prisma.classGroup.findMany({
    select: {
      id: true,
      name: true,
      campusId: true,
      classes: {
        select: {
          id: true,
          name: true,
          sections: { select: { id: true, name: true } },
        },
      },
    },
  });
  console.log('ClassGroups:', JSON.stringify(classGroups, null, 2));

  const studentCount = await prisma.studentRecord.count();
  const userStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  console.log('Existing studentRecords:', studentCount, 'student users:', userStudents);

  const years = await prisma.academicYear.findMany({
    select: { id: true, startYear: true, stopYear: true, schoolId: true },
  });
  console.log('AcademicYears:', JSON.stringify(years, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
