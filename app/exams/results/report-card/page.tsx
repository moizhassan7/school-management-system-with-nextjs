'use client';

import { useState, useEffect } from 'react';
import { Search, Download, User, Calendar, BookOpen, Award, TrendingUp, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  dateOfBirth: string;
  className: string;
}

interface ExamResult {
  examName: string;
  examDate: string;
  subjects: {
    subjectName: string;
    subjectCode: string;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    status: 'PASS' | 'FAIL';
  }[];
  totalMarks: number;
  totalObtained: number;
  overallPercentage: number;
  overallGrade: string;
  overallStatus: 'PASS' | 'FAIL';
  rank?: number;
}

interface ReportCard {
  student: Student;
  results: ExamResult[];
  summary: {
    totalExams: number;
    examsPassed: number;
    examsFailed: number;
    averagePercentage: number;
    bestSubject: string;
    improvementAreas: string[];
  };
}

export default function ReportCardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStudentId && selectedExamId) {
      generateReportCard();
    }
  }, [selectedStudentId, selectedExamId]);

  const fetchInitialData = async () => {
    try {
      const [studentsRes, examsRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/exams')
      ]);

      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (examsRes.ok) setExams(await examsRes.json());
    } catch (error) {
      toast.error('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  const generateReportCard = async () => {
    if (!selectedStudentId || !selectedExamId) return;

    setGenerating(true);
    try {
      const response = await fetch(`/api/exams/report-card?studentId=${selectedStudentId}&examId=${selectedExamId}`);
      
      if (response.ok) {
        const data = await response.json();
        setReportCard(data);
      } else {
        toast.error('Failed to generate report card');
      }
    } catch (error) {
      toast.error('Failed to generate report card');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReportCard = () => {
    // This would typically use a PDF generation library
    toast.success('PDF download functionality would be implemented here');
  };

  const getGradeColor = (grade: string) => {
    switch (grade.toUpperCase()) {
      case 'A+': return 'text-green-700 bg-green-100';
      case 'A': return 'text-green-600 bg-green-50';
      case 'B+': return 'text-blue-600 bg-blue-50';
      case 'B': return 'text-blue-700 bg-blue-100';
      case 'C+': return 'text-yellow-600 bg-yellow-50';
      case 'C': return 'text-yellow-700 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-50';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' 
      ? 'text-green-700 bg-green-100' 
      : 'text-red-700 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Card Generator</h1>
          <p className="text-gray-600">Generate individual student report cards with detailed performance analysis</p>
        </div>

        {/* Student and Exam Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select Student and Exam
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.rollNumber} - {student.firstName} {student.lastName} ({student.className})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Exam
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Exam</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({new Date(exam.startDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Report Card */}
        {reportCard && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">REPORT CARD</h2>
                  <p className="text-blue-100">Academic Performance Report</p>
                </div>
                <button
                  onClick={downloadReportCard}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>

            {/* Student Information */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-lg font-medium text-gray-900">{reportCard.student.firstName} {reportCard.student.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Roll Number</label>
                    <p className="text-lg font-medium text-gray-900">{reportCard.student.rollNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Father's Name</label>
                    <p className="text-lg font-medium text-gray-900">{reportCard.student.fatherName}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Class</label>
                    <p className="text-lg font-medium text-gray-900">{reportCard.student.className}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(reportCard.student.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Results */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Exam Performance
              </h3>

              {reportCard.results.map((result, index) => (
                <div key={index} className="mb-6 last:mb-0">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-gray-900">{result.examName}</h4>
                    <span className="text-sm text-gray-600">{new Date(result.examDate).toLocaleDateString()}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Subject</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Max Marks</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Obtained</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">%</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Grade</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects.map((subject, subIndex) => (
                          <tr key={subIndex}>
                            <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">
                              {subject.subjectName} ({subject.subjectCode})
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900">{subject.totalMarks}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900">{subject.obtainedMarks}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900">{subject.percentage.toFixed(1)}%</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(subject.grade)}`}>
                                {subject.grade}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subject.status)}`}>
                                {subject.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-medium">
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">TOTAL</td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900">{result.totalMarks}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900">{result.totalObtained}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900">{result.overallPercentage.toFixed(1)}%</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(result.overallGrade)}`}>
                              {result.overallGrade}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.overallStatus)}`}>
                              {result.overallStatus}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {result.rank && (
                    <div className="mt-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Rank: {result.rank} in class
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Performance Summary */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Summary
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Achievements</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• {reportCard.summary.examsPassed} out of {reportCard.summary.totalExams} exams passed</li>
                      <li>• Average percentage: {reportCard.summary.averagePercentage.toFixed(1)}%</li>
                      <li>• Best subject: {reportCard.summary.bestSubject}</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Areas for Improvement</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {reportCard.summary.improvementAreas.map((area, index) => (
                        <li key={index}>• {area}</li>
                      ))}
                      {reportCard.summary.improvementAreas.length === 0 && (
                        <li>• Keep up the good work!</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-600">
              <p>This report card is generated electronically and contains verified academic records.</p>
              <p className="mt-1">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {generating && (
          <div className="text-center text-gray-500 py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p>Generating report card...</p>
          </div>
        )}

        {!reportCard && !generating && selectedStudentId && selectedExamId && (
          <div className="text-center text-gray-500 py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No report card data available for the selected student and exam</p>
          </div>
        )}

        {!selectedStudentId || !selectedExamId && (
          <div className="text-center text-gray-500 py-12">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Please select both student and exam to generate report card</p>
          </div>
        )}
      </div>
    </div>
  );
}