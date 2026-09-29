'use client';

import React from 'react';
import { format } from 'date-fns';
import type { StudentReportItem } from '@/lib/reports/student-export';

interface PrintableStudentReportProps {
  school: {
    name: string;
    initials?: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    logoPath?: string | null;
  };
  students: StudentReportItem[];
  className: string;
  sectionName?: string;
  classGroupName?: string;
  academicYear?: string;
  reportType?: 'general' | 'contacts' | 'attendance';
}

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

export default function PrintableStudentReport({
  school,
  students,
  className,
  sectionName,
  classGroupName,
  academicYear,
  reportType = 'general',
}: PrintableStudentReportProps) {
  const printTime = format(new Date(), 'dd MMMM yyyy, hh:mm a');
  const maleCount = students.filter((s) => s.gender === 'MALE').length;
  const femaleCount = students.filter((s) => s.gender === 'FEMALE').length;
  const activeCount = students.filter((s) => !s.suspended).length;

  return (
    <div className="report-print-root mx-auto max-w-[1100px] bg-white text-slate-900 print:max-w-none print:p-0">
      {/* Official School Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
        <div className="flex items-center gap-4">
          {school.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logoPath}
              alt={school.name}
              className="h-16 w-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
              {school.name}
            </h1>
            <p className="text-xs text-slate-600">
              {[school.address, school.phone, school.email].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block rounded border border-slate-700 bg-slate-100 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-slate-800">
            Official Report
          </span>
          <p className="mt-1 text-[11px] text-slate-500">
            Printed: {printTime}
          </p>
        </div>
      </div>

      {/* Report Title & Metadata Box */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            {reportType === 'contacts'
              ? 'Student & Parent Contact Directory'
              : reportType === 'attendance'
              ? 'Monthly Student Attendance Register'
              : 'Class-Wise Student Information Report'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
            <span>
              <strong className="font-semibold text-slate-900">Class:</strong> {className || 'All Classes'}
            </span>
            {sectionName && (
              <span>
                <strong className="font-semibold text-slate-900">Section:</strong> {sectionName}
              </span>
            )}
            {classGroupName && (
              <span>
                <strong className="font-semibold text-slate-900">Group:</strong> {classGroupName}
              </span>
            )}
            {academicYear && (
              <span>
                <strong className="font-semibold text-slate-900">Session:</strong> {academicYear}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="rounded border border-slate-300 bg-white px-2.5 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase">Total</span>
            <span className="font-bold text-slate-900">{students.length}</span>
          </div>
          <div className="rounded border border-slate-300 bg-white px-2.5 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase">Boys</span>
            <span className="font-bold text-slate-900">{maleCount}</span>
          </div>
          <div className="rounded border border-slate-300 bg-white px-2.5 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase">Girls</span>
            <span className="font-bold text-slate-900">{femaleCount}</span>
          </div>
          <div className="rounded border border-slate-300 bg-white px-2.5 py-1 text-center">
            <span className="block text-[10px] text-slate-500 uppercase">Active</span>
            <span className="font-bold text-green-700">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="mt-4 overflow-x-auto">
        {reportType === 'contacts' ? (
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-200 text-slate-800">
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">#</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Roll No</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Adm No</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Student Name</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Father / Guardian</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Father Phone</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">Father CNIC</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left font-bold">Mother Name</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Address</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-200 ${
                    idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <td className="border border-slate-300 px-2 py-1 text-center text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center font-mono font-medium">
                    {s.rollNumber || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                    {s.admissionNumber || '—'}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1 font-semibold text-slate-900">
                    {s.name}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1">
                    {s.fatherName || s.primaryGuardianName || '—'}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1 font-mono">
                    {s.fatherPhone || s.primaryGuardianPhone || s.phone || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 font-mono text-[10px]">
                    {s.fatherCnic || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    {s.motherName || '—'}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1 text-[10px]">
                    {s.address || s.city || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        s.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : reportType === 'attendance' ? (
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-200 text-slate-800">
                <th className="border border-slate-300 px-1 py-1 text-center font-bold">#</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-bold">Roll</th>
                <th className="border border-slate-300 px-2 py-1 text-left font-bold min-w-[120px]">
                  Student Name
                </th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th
                    key={i}
                    className="border border-slate-300 px-0.5 py-1 text-center font-bold text-[9px] w-5"
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="border border-slate-300 px-1 py-1 text-center font-bold">P</th>
                <th className="border border-slate-300 px-1 py-1 text-center font-bold">A</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-200 ${
                    idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <td className="border border-slate-300 px-1 py-1 text-center text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 px-1 py-1 text-center font-mono font-medium">
                    {s.rollNumber || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-900 truncate max-w-[140px]">
                    {s.name}
                  </td>
                  {Array.from({ length: 31 }, (_, i) => (
                    <td
                      key={i}
                      className="border border-slate-300 px-0.5 py-1 text-center text-[9px] h-6"
                    />
                  ))}
                  <td className="border border-slate-300 px-1 py-1 text-center" />
                  <td className="border border-slate-300 px-1 py-1 text-center" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-200 text-slate-800">
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">#</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Roll No</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Adm No</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Student Name</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Father Name</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Gender</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Class & Sec</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Adm Date</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Contact Phone</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">Address</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-200 ${
                    idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <td className="border border-slate-300 px-2 py-1 text-center text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center font-mono font-medium">
                    {s.rollNumber || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center font-mono">
                    {s.admissionNumber || '—'}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1 font-semibold text-slate-900">
                    {s.name}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1">
                    {s.fatherName || s.primaryGuardianName || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        s.gender === 'FEMALE'
                          ? 'bg-pink-100 text-pink-700'
                          : s.gender === 'MALE'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {s.gender === 'MALE' ? 'Boy' : s.gender === 'FEMALE' ? 'Girl' : s.gender}
                    </span>
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center">
                    {s.className} {s.sectionName ? `(${s.sectionName})` : ''}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center text-[10px]">
                    {formatDateSafe(s.admissionDate)}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1 font-mono text-[10px]">
                    {s.fatherPhone || s.primaryGuardianPhone || s.phone || '—'}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1 text-[10px] max-w-[180px] truncate">
                    {s.address || s.city || '—'}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        s.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Signature & Verification Block */}
      <div className="mt-10 pt-4 border-t border-slate-300 print:mt-16">
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="mx-auto mb-1.5 w-40 border-b border-slate-700" />
            <p className="font-semibold text-slate-800">Class Teacher Signature</p>
            <p className="text-[10px] text-slate-500">Name & Date</p>
          </div>
          <div>
            <div className="mx-auto mb-1.5 w-40 border-b border-slate-700" />
            <p className="font-semibold text-slate-800">Section Incharge / Coordinator</p>
            <p className="text-[10px] text-slate-500">Verified & Approved</p>
          </div>
          <div>
            <div className="mx-auto mb-1.5 w-40 border-b border-slate-700" />
            <p className="font-semibold text-slate-800">Principal / Administrator</p>
            <p className="text-[10px] text-slate-500">Official Stamp & Signature</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-[10px] text-slate-400">
          <span>{school.name} — Confidential Student Records</span>
          <span>Computer Generated Document — Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
