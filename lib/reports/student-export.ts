import { format } from 'date-fns';

export interface StudentReportItem {
  srNo: number;
  id: string;
  studentRecordId: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  city: string;
  religion: string;
  suspended: boolean;
  status: string;
  admissionNumber: string;
  rollNumber: string;
  admissionDate: string;
  className: string;
  sectionName: string;
  classGroupName: string;
  streamName: string;
  academicYear: string;
  fatherName: string;
  fatherPhone: string;
  fatherCnic: string;
  fatherOccupation: string;
  motherName: string;
  motherPhone: string;
  primaryGuardianName: string;
  primaryGuardianPhone: string;
}

export interface ReportMeta {
  schoolName: string;
  className: string;
  sectionName?: string;
  classGroupName?: string;
  academicYear?: string;
  generatedAt?: Date;
  generatedBy?: string;
}

/** Formats a date string safely */
function formatDateSafe(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(d, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Downloads a rich, formatted Excel file with school headers and student details
 */
export async function exportStudentsToExcel(
  students: StudentReportItem[],
  meta: ReportMeta,
  exportType: 'general' | 'contacts' | 'attendance' = 'general'
) {
  const generatedTime = format(meta.generatedAt || new Date(), 'dd-MMM-yyyy hh:mm a');
  const classLabel = meta.className
    ? `${meta.className}${meta.sectionName && meta.sectionName !== 'All Sections' ? ` (${meta.sectionName})` : ''}`
    : 'All Classes';

  const rows: (string | number)[][] = [];

  // Title rows
  rows.push([meta.schoolName.toUpperCase()]);
  if (exportType === 'contacts') {
    rows.push([`STUDENT & PARENT CONTACT DIRECTORY — ${classLabel.toUpperCase()}`]);
  } else if (exportType === 'attendance') {
    rows.push([`STUDENT ATTENDANCE SHEET / ROSTER — ${classLabel.toUpperCase()}`]);
  } else {
    rows.push([`CLASS-WISE STUDENT INFORMATION REPORT — ${classLabel.toUpperCase()}`]);
  }

  rows.push([
    `Academic Session: ${meta.academicYear || 'Current'}  |  Total Students: ${students.length}  |  Generated: ${generatedTime}`,
  ]);
  rows.push([]); // blank row

  if (exportType === 'contacts') {
    // Header row
    rows.push([
      'Sr #',
      'Roll No',
      'Admission No',
      'Student Name',
      'Father / Guardian Name',
      'Father Phone',
      'Father CNIC',
      'Father Occupation',
      'Mother Name',
      'Mother Phone',
      'Residential Address',
      'City',
      'Status',
    ]);

    // Data rows
    students.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.rollNumber || '—',
        s.admissionNumber || '—',
        s.name,
        s.fatherName || s.primaryGuardianName || '—',
        s.fatherPhone || s.primaryGuardianPhone || s.phone || '—',
        s.fatherCnic || '—',
        s.fatherOccupation || '—',
        s.motherName || '—',
        s.motherPhone || '—',
        s.address || '—',
        s.city || '—',
        s.status,
      ]);
    });
  } else if (exportType === 'attendance') {
    // Header row with 31 days columns
    const daysHeader = Array.from({ length: 31 }, (_, i) => String(i + 1));
    rows.push([
      'Sr #',
      'Roll No',
      'Admission No',
      'Student Name',
      'Father Name',
      ...daysHeader,
      'Total Present',
      'Total Absent',
    ]);

    students.forEach((s, idx) => {
      const blankDays = Array(31).fill('');
      rows.push([
        idx + 1,
        s.rollNumber || '—',
        s.admissionNumber || '—',
        s.name,
        s.fatherName || '—',
        ...blankDays,
        '',
        '',
      ]);
    });
  } else {
    // General student information report
    rows.push([
      'Sr #',
      'Roll No',
      'Admission No',
      'Student Name',
      'Father Name',
      'Gender',
      'Class',
      'Section',
      'Admission Date',
      'Guardian / Father Phone',
      'Student Phone',
      'Father CNIC',
      'Residential Address',
      'Status',
    ]);

    students.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.rollNumber || '—',
        s.admissionNumber || '—',
        s.name,
        s.fatherName || s.primaryGuardianName || '—',
        s.gender,
        s.className,
        s.sectionName,
        formatDateSafe(s.admissionDate),
        s.fatherPhone || s.primaryGuardianPhone || '—',
        s.phone || '—',
        s.fatherCnic || '—',
        s.address || '—',
        s.status,
      ]);
    });
  }

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths based on longest values
  const colWidths = rows[4]?.map((_, colIdx) => {
    let maxLen = 10;
    for (let r = 4; r < rows.length; r++) {
      const cellVal = String(rows[r]?.[colIdx] ?? '');
      if (cellVal.length > maxLen) {
        maxLen = Math.min(cellVal.length, 40);
      }
    }
    return { wch: maxLen + 2 };
  }) || [];

  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const sheetName = (classLabel.replace(/[/\\?*[\]]/g, '-') || 'Students').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanClassName = meta.className.replace(/[^a-zA-Z0-9_-]/g, '_') || 'All_Classes';
  const filePrefix =
    exportType === 'contacts'
      ? 'Student_Contacts'
      : exportType === 'attendance'
      ? 'Attendance_Sheet'
      : 'Student_Report';
  const fileName = `${filePrefix}_${cleanClassName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Downloads a CSV file with UTF-8 BOM encoding
 */
export function exportStudentsToCsv(
  students: StudentReportItem[],
  meta: ReportMeta
) {
  const headers = [
    'Sr #',
    'Roll No',
    'Admission No',
    'Student Name',
    'Father Name',
    'Gender',
    'Class',
    'Section',
    'Admission Date',
    'Father Phone',
    'Student Phone',
    'Father CNIC',
    'Address',
    'Status',
  ];

  const csvRows = [headers.join(',')];

  students.forEach((s, idx) => {
    const row = [
      idx + 1,
      `"${(s.rollNumber || '').replace(/"/g, '""')}"`,
      `"${(s.admissionNumber || '').replace(/"/g, '""')}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.fatherName || s.primaryGuardianName || '').replace(/"/g, '""')}"`,
      `"${s.gender}"`,
      `"${s.className.replace(/"/g, '""')}"`,
      `"${s.sectionName.replace(/"/g, '""')}"`,
      `"${formatDateSafe(s.admissionDate)}"`,
      `"${(s.fatherPhone || s.primaryGuardianPhone || '').replace(/"/g, '""')}"`,
      `"${(s.phone || '').replace(/"/g, '""')}"`,
      `"${(s.fatherCnic || '').replace(/"/g, '""')}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${s.status}"`,
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanClassName = meta.className.replace(/[^a-zA-Z0-9_-]/g, '_') || 'All_Classes';
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Student_Report_${cleanClassName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
