'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Calendar, BookOpen, Users, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
}

interface StudentResult {
  studentId: string;
  rollNumber: string;
  studentName: string;
  subjects: {
    subjectId: string;
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

interface ClassResults {
  students: StudentResult[];
  statistics: {
    totalStudents: number;
    passed: number;
    failed: number;
    passPercentage: number;
    averagePercentage: number;
    highestMarks: number;
    lowestMarks: number;
  };
}

export default function ResultsGazettePage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classResults, setClassResults] = useState<ClassResults | null>(null);
  
  const [filters, setFilters] = useState({
    examId: '',
    classId: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rollNumber' | 'percentage' | 'name'>('rollNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.examId && filters.classId) {
      fetchClassResults();
    }
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [examsRes, subjectsRes, classesRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/subjects'),
        fetch('/api/classes')
      ]);

      if (examsRes.ok) setExams(await examsRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
    } catch (error) {
      toast.error('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassResults = async () => {
    if (!filters.examId || !filters.classId) return;

    try {
      const response = await fetch(`/api/exams/results?examId=${filters.examId}&classId=${filters.classId}`);
      
      if (response.ok) {
        const data = await response.json();
        setClassResults(data);
      } else {
        toast.error('Failed to fetch class results');
      }
    } catch (error) {
      toast.error('Failed to fetch class results');
    }
  };

  const sortResults = (results: StudentResult[]) => {
    return [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'rollNumber':
          comparison = a.rollNumber.localeCompare(b.rollNumber);
          break;
        case 'percentage':
          comparison = a.overallPercentage - b.overallPercentage;
          break;
        case 'name':
          comparison = a.studentName.localeCompare(b.studentName);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const filteredResults = classResults?.students.filter(student =>
    student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedResults = sortResults(filteredResults);

  const exportToPDF = () => {
    // This would typically use a PDF generation library
    // For now, we'll just show a toast
    toast.success('PDF export functionality would be implemented here');
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Results Gazette</h1>
          <p className="text-gray-600">View and analyze class-wise exam results</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select Exam and Class
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Exam
              </label>
              <select
                value={filters.examId}
                onChange={(e) => setFilters(prev => ({ ...prev, examId: e.target.value }))}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Class
              </label>
              <select
                value={filters.classId}
                onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {classResults && (
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rollNumber' | 'percentage' | 'name')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rollNumber">Sort by Roll Number</option>
                <option value="name">Sort by Name</option>
                <option value="percentage">Sort by Percentage</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>

              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          )}
        </div>

        {/* Statistics */}
        {classResults && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{classResults.statistics.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{classResults.statistics.passed}</p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{classResults.statistics.failed}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pass Percentage</p>
                  <p className="text-2xl font-bold text-blue-600">{classResults.statistics.passPercentage.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {classResults && sortedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Student Results</h3>
              <p className="text-sm text-gray-600">
                Showing {sortedResults.length} of {classResults.statistics.totalStudents} students
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    {classResults.students[0]?.subjects.map(subject => (
                      <th key={subject.subjectId} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {subject.subjectCode}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedResults.map((student, index) => (
                    <tr key={student.studentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.rollNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.studentName}
                      </td>
                      
                      {student.subjects.map(subject => (
                        <td key={subject.subjectId} className="px-4 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {subject.obtainedMarks}/{subject.totalMarks}
                          </div>
                          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(subject.grade)}`}>
                            {subject.grade}
                          </div>
                        </td>
                      ))}
                      
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                        {student.totalObtained}/{student.totalMarks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                        {student.overallPercentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(student.overallGrade)}`}>
                          {student.overallGrade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.overallStatus)}`}>
                          {student.overallStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {classResults && sortedResults.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students found matching your search criteria</p>
          </div>
        )}

        {!classResults && filters.examId && filters.classId && (
          <div className="text-center text-gray-500 py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No results found for the selected exam and class</p>
          </div>
        )}

        {!filters.examId || !filters.classId && (
          <div className="text-center text-gray-500 py-12">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Please select both exam and class to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}