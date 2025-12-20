import { PrismaClient, Role, AttendanceStatus, InvoiceStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to hash password (matching your app's logic)
const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Helper to get random element from array
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random date within last N days
const randomDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // 1. Create a Dummy School
  const school = await prisma.school.upsert({
    where: { id: 'default-school' },
    update: {},
    create: {
      id: 'default-school',
      name: 'Harvard High School',
      initials: 'HHS',
      address: '100 Harvard St, Cambridge, MA 02138',
      email: 'info@harvard.edu',
      phone: '555-0123',
    },
  });

  console.log(`🏫 School created: ${school.name}`);

  const commonPassword = 'password123';
  const hashedPassword = hashPassword(commonPassword);

  // Create Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 'default-academic-year' },
    update: {},
    create: {
      id: 'default-academic-year',
      startYear: '2024',
      stopYear: '2025',
      schoolId: school.id
    }
  });

  console.log(`📅 Academic Year created: ${academicYear.startYear}-${academicYear.stopYear}`);

  // Create Campus
  const campus = await prisma.campus.upsert({
    where: { id: 'default-campus' },
    update: {},
    create: {
      id: 'default-campus',
      name: 'Main Campus',
      address: '100 Harvard St, Cambridge, MA 02138',
      phone: '555-0123',
      email: 'campus@harvard.edu',
      schoolId: school.id
    }
  });

  console.log(`🏫 Campus created: ${campus.name}`);

  // Create Class Group
  const classGroup = await prisma.classGroup.upsert({
    where: { id: 'default-class-group' },
    update: {},
    create: {
      id: 'default-class-group',
      name: 'Primary School',
      description: 'Grades 1-5',
      campusId: campus.id
    }
  });

  console.log(`📚 Class Group created: ${classGroup.name}`);

  // Create Classes with Sections
  const classesData = [
    { name: 'Grade 1', sections: ['A', 'B'] },
    { name: 'Grade 2', sections: ['A', 'B'] },
    { name: 'Grade 3', sections: ['A', 'B', 'C'] }
  ];

  const allSections: any[] = [];

  for (const cls of classesData) {
    const createdClass = await prisma.class.upsert({
      where: { id: `class-${cls.name.toLowerCase().replace(' ', '-')}` },
      update: {},
      create: {
        id: `class-${cls.name.toLowerCase().replace(' ', '-')}`,
        name: cls.name,
        classGroupId: classGroup.id
      }
    });

    // Create sections for this class
    for (const sectionName of cls.sections) {
      const section = await prisma.section.upsert({
        where: { id: `section-${createdClass.id}-${sectionName.toLowerCase()}` },
        update: {},
        create: {
          id: `section-${createdClass.id}-${sectionName.toLowerCase()}`,
          name: sectionName,
          classId: createdClass.id
        }
      });
      allSections.push({ section, class: createdClass });
    }
  }

  console.log(`📖 Classes and Sections created`);

  // Create Subject Group and Subjects
  const subjectGroup = await prisma.subjectGroup.upsert({
    where: { id: 'default-subject-group' },
    update: {},
    create: {
      id: 'default-subject-group',
      name: 'Core Subjects',
      description: 'Basic academic subjects',
      classGroupId: classGroup.id
    }
  });

  const subjects = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' },
    { name: 'History', code: 'HIST' },
    { name: 'Art', code: 'ART' }
  ];

  const createdSubjects = [];
  for (const subj of subjects) {
    const subject = await prisma.subject.upsert({
      where: { id: `subject-${subj.code.toLowerCase()}` },
      update: {},
      create: {
        id: `subject-${subj.code.toLowerCase()}`,
        name: subj.name,
        code: subj.code,
        subjectGroupId: subjectGroup.id
      }
    });
    createdSubjects.push(subject);
  }

  console.log(`📚 Subjects created: ${subjects.map(s => s.name).join(', ')}`);

  // 2. Create Admin Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@school.com' },
    update: { role: Role.SUPER_ADMIN },
    create: {
      email: 'super@school.com',
      name: 'Super Admin',
      passwordHash: hashedPassword,
      role: Role.SUPER_ADMIN,
      schoolId: school.id,
      emailVerified: true,
    },
  });
  console.log(`👤 Created SUPER_ADMIN: super@school.com`);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: { role: Role.ADMIN },
    create: {
      email: 'admin@school.com',
      name: 'Principal Harvard',
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      schoolId: school.id,
      emailVerified: true,
    },
  });
  console.log(`👤 Created ADMIN: admin@school.com`);

  // 3. Create Accountant
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@school.com' },
    update: { role: Role.ACCOUNTANT },
    create: {
      email: 'accountant@school.com',
      name: 'John Accountant',
      passwordHash: hashedPassword,
      role: Role.ACCOUNTANT,
      schoolId: school.id,
      emailVerified: true,
    },
  });
  console.log(`👤 Created ACCOUNTANT: accountant@school.com`);

  // 4. Create Teachers with Staff Records
  const teacherNames = [
    'Ms. Sarah Johnson',
    'Mr. David Lee',
    'Ms. Emily Chen',
    'Mr. Michael Brown',
    'Ms. Lisa Taylor'
  ];

  const teachers = [];
  for (let i = 0; i < teacherNames.length; i++) {
    const teacher = await prisma.user.upsert({
      where: { email: `teacher${i + 1}@school.com` },
      update: { role: Role.TEACHER },
      create: {
        email: `teacher${i + 1}@school.com`,
        name: teacherNames[i],
        passwordHash: hashedPassword,
        role: Role.TEACHER,
        schoolId: school.id,
        emailVerified: true,
        phone: `555-010${i}`
      },
    });

    const staffRecord = await prisma.staffRecord.upsert({
      where: { userId: teacher.id },
      update: {},
      create: {
        userId: teacher.id,
        designation: 'Teacher',
        department: 'Academic',
        employmentType: 'FULL_TIME',
        joiningDate: new Date('2024-01-01'),
        salary: 50000
      }
    });

    teachers.push({ user: teacher, staffRecord });
  }

  // Assign teachers to sections
  for (let i = 0; i < allSections.length && i < teachers.length; i++) {
    await prisma.section.update({
      where: { id: allSections[i].section.id },
      data: {
        classTeacherId: teachers[i].staffRecord.id
      }
    });
  }

  console.log(`👨‍🏫 Created ${teachers.length} teachers with staff records`);

  // 5. Create Students with Records
  const firstNames = ['Muhammad', 'Ahmed', 'Fatima', 'Aisha', 'Omar', 'Khadija', 'Ali', 'Zainab', 'Hassan', 'Maryam', 'Ibrahim', 'Sara', 'Yusuf', 'Amina', 'Abdullah', 'Huda', 'Bilal', 'Asma', 'Omar', 'Layla'];
  const lastNames = ['Khan', 'Ali', 'Hassan', 'Ahmed', 'Malik', 'Sheikh', 'Qureshi', 'Raza', 'Javed', 'Akhtar'];

  const students = [];
  let studentCount = 0;

  for (const sectionData of allSections) {
    // Create 10-15 students per section
    const studentsInSection = 10 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < studentsInSection; i++) {
      studentCount++;
      const firstName = random(firstNames);
      const lastName = random(lastNames);
      const name = `${firstName} ${lastName}`;

      const student = await prisma.user.upsert({
        where: { email: `student${studentCount}@school.com` },
        update: { role: Role.STUDENT },
        create: {
          email: `student${studentCount}@school.com`,
          name,
          passwordHash: hashedPassword,
          role: Role.STUDENT,
          schoolId: school.id,
          emailVerified: true,
          phone: `555-200${studentCount}`
        },
      });

      const studentRecord = await prisma.studentRecord.upsert({
        where: { userId: student.id },
        update: {},
        create: {
          userId: student.id,
          admissionNumber: `ADM-2024-${String(studentCount).padStart(3, '0')}`,
          admissionDate: new Date('2024-01-15'),
          rollNumber: `${studentCount}`,
          classId: sectionData.class.id,
          sectionId: sectionData.section.id
        },
      });

      students.push({ user: student, record: studentRecord, section: sectionData.section });
    }
  }

  console.log(`👨‍🎓 Created ${students.length} students with records`);

  // 6. Create Parents
  const parents = [];
  for (let i = 0; i < 10; i++) {
    const parent = await prisma.user.upsert({
      where: { email: `parent${i + 1}@school.com` },
      update: { role: Role.PARENT },
      create: {
        email: `parent${i + 1}@school.com`,
        name: `Parent ${i + 1}`,
        passwordHash: hashedPassword,
        role: Role.PARENT,
        schoolId: school.id,
        emailVerified: true,
        phone: `555-300${i}`
      },
    });

    const parentRecord = await prisma.parentRecord.upsert({
      where: { userId: parent.id },
      update: {},
      create: {
        userId: parent.id,
        cnic: `12345-${String(1000000 + i).slice(1)}-${i}`,
        occupation: random(['Engineer', 'Doctor', 'Teacher', 'Business Owner', 'Lawyer'])
      },
    });

    // Link 1-3 students to this parent
    const numChildren = 1 + Math.floor(Math.random() * 2);
    const childStudents = students.slice(i * numChildren, (i + 1) * numChildren);
    
    for (const childStudent of childStudents) {
      await prisma.kinship.create({
        data: {
          parentId: parentRecord.id,
          studentId: childStudent.record.id,
          relationship: random(['FATHER', 'MOTHER', 'GUARDIAN']),
          isPrimary: true
        }
      });
    }

    parents.push({ user: parent, record: parentRecord });
  }

  console.log(`👨‍👩‍👧‍👦 Created ${parents.length} parents`);

  // 7. Create Attendance Records (last 30 days)
  console.log('📅 Creating attendance records...');
  const attendanceStatuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  
  for (let day = 0; day < 30; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(9, 0, 0, 0);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const student of students) {
      // 85% present, 10% absent, 3% late, 2% excused
      const rand = Math.random();
      let status: AttendanceStatus;
      if (rand < 0.85) status = 'PRESENT';
      else if (rand < 0.95) status = 'ABSENT';
      else if (rand < 0.98) status = 'LATE';
      else status = 'EXCUSED';

      await prisma.attendance.create({
        data: {
          studentId: student.user.id,
          schoolId: school.id,
          classId: student.record.classId!,
          sectionId: student.section.id,
          date,
          status,
          remarks: status === 'ABSENT' ? 'Absent without notice' : null
        }
      });
    }
  }

  console.log('✅ Attendance records created');

  // 8. Create Fee Structure and Invoices
  console.log('💰 Creating financial data...');

  // Create Account Heads
  const accountHead = await prisma.accountHead.upsert({
    where: { id: 'acc-head-fees' },
    update: {},
    create: {
      id: 'acc-head-fees',
      name: 'Student Fees',
      schoolId: school.id
    }
  });

  const accountSubhead = await prisma.accountSubHead.upsert({
    where: { id: 'acc-subhead-tuition' },
    update: {},
    create: {
      id: 'acc-subhead-tuition',
      name: 'Tuition Fee',
      headId: accountHead.id,
      schoolId: school.id
    }
  });

  // Create Fee Head
  const feeHead = await prisma.feeHead.upsert({
    where: { id: 'fee-head-monthly' },
    update: {},
    create: {
      id: 'fee-head-monthly',
      name: 'Monthly Tuition',
      type: 'MONTHLY',
      schoolId: school.id,
      accountSubHeadId: accountSubhead.id
    }
  });

  // Create Fee Structure for each class
  for (const cls of classesData) {
    const classId = `class-${cls.name.toLowerCase().replace(' ', '-')}`;
    await prisma.feeStructure.upsert({
      where: { id: `fee-struct-${classId}` },
      update: {},
      create: {
        id: `fee-struct-${classId}`,
        classId,
        feeHeadId: feeHead.id,
        amount: 5000 + (parseInt(cls.name.split(' ')[1]) * 1000), // 6000, 7000, 8000
        schoolId: school.id
      }
    });
  }

  // Create Invoices for students
  const invoiceStatuses: InvoiceStatus[] = ['PAID', 'UNPAID', 'PARTIAL', 'OVERDUE'];
  
  for (const student of students) {
    // Create 3 invoices per student (different months)
    for (let month = 0; month < 3; month++) {
      const amount = 5000 + (month * 100);
      const invoiceStatus: InvoiceStatus = month === 0 ? random(invoiceStatuses) : random(['PAID', 'PAID', 'PAID', 'UNPAID'] as InvoiceStatus[]);
      const paidAmount = invoiceStatus === 'PAID' ? amount : 
                        invoiceStatus === 'PARTIAL' ? amount * 0.5 : 0;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo: `INV-${Date.now()}-${student.record.id.slice(0, 8)}-${month}`,
          studentId: student.user.id,
          month: 9 + month,
          year: 2024,
          dueDate: new Date(2024, 8 + month, 10),
          totalAmount: amount,
          paidAmount,
          status: invoiceStatus,
          schoolId: school.id
        }
      });

      // Create challan if paid
      if (invoiceStatus === 'PAID' || invoiceStatus === 'PARTIAL') {
        const challanBarcode = `BC-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await prisma.challan.create({
          data: {
            studentId: student.user.id,
            barcode: challanBarcode,
            challanNo: `CH-${Date.now()}-${student.record.id.slice(0, 8)}-${month}`,
            issueDate: new Date(2024, 8 + month, 1),
            dueDate: new Date(2024, 8 + month, 10),
            totalAmount: paidAmount,
            status: 'PAID',
            schoolId: school.id
          }
        });
      }
    }
  }

  console.log('✅ Financial data created');

  // 9. Create Exams and Results
  console.log('📝 Creating exam results...');

  const exam = await prisma.exam.upsert({
    where: { id: 'exam-midterm-2024' },
    update: {},
    create: {
      id: 'exam-midterm-2024',
      name: 'Mid-Term Examination 2024',
      type: 'TERM',
      academicYearId: academicYear.id,
      schoolId: school.id,
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-10')
    }
  });

  // Create results for random students
  for (let i = 0; i < Math.min(50, students.length); i++) {
    const student = students[i];
    const marksObtained = 60 + Math.floor(Math.random() * 35); // 60-95
    const status = marksObtained >= 40 ? 'PASS' : 'FAIL';

    // Get a random subject
    const subject = random(createdSubjects);

    await prisma.examResult.create({
      data: {
        studentId: student.user.id,
        examId: exam.id,
        subjectId: subject.id,
        classId: student.record.classId!,
        marksObtained,
        status
      }
    });
  }

  console.log('✅ Exam results created');

  // 10. Create a Staff member (non-teacher)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@school.com' },
    update: { role: Role.STAFF },
    create: {
      email: 'staff@school.com',
      name: 'Admin Staff',
      passwordHash: hashedPassword,
      role: Role.STAFF,
      schoolId: school.id,
      emailVerified: true,
      phone: '555-4000'
    },
  });

  await prisma.staffRecord.upsert({
    where: { userId: staff.id },
    update: {},
    create: {
      userId: staff.id,
      designation: 'Administrative Officer',
      department: 'Administration',
      employmentType: 'FULL_TIME',
      joiningDate: new Date('2024-01-01'),
      salary: 45000
    }
  });

  console.log(`👤 Created STAFF: staff@school.com`);

  console.log('\n✅ ✅ ✅ Comprehensive seeding finished! ✅ ✅ ✅\n');
  console.log('📊 Summary:');
  console.log(`   - School: ${school.name}`);
  console.log(`   - Users: ${students.length + teachers.length + parents.length + 4} total`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Teachers: ${teachers.length}`);
  console.log(`   - Parents: ${parents.length}`);
  console.log(`   - Sections: ${allSections.length}`);
  console.log(`   - Attendance records: ~${students.length * 20} entries`);
  console.log(`   - Invoices: ${students.length * 3}`);
  console.log(`   - Exam results: 50`);
  console.log('\n🔑 Login credentials (all users):');
  console.log('   Password: password123');
  console.log('\n📧 Test accounts:');
  console.log('   Super Admin: super@school.com');
  console.log('   Admin: admin@school.com');
  console.log('   Accountant: accountant@school.com');
  console.log('   Teacher: teacher1@school.com (or teacher2, teacher3, etc.)');
  console.log('   Student: student1@school.com (or student2, student3, etc.)');
  console.log('   Parent: parent1@school.com (or parent2, parent3, etc.)');
  console.log('   Staff: staff@school.com');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
