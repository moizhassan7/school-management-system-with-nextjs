'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Save, User, Calendar, Users, CheckCircle, XCircle, Edit } from 'lucide-react';

interface ClassTest {
  id?: string;
  name: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  date: string;
  totalQuestions: number;
  passingQuestions: number;
  description?: string;
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

interface Student {
  id: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
}

interface ClassTestResult {
  id?: string;
  studentId: string;
  classTestId: string;
  correctAnswers: number;
  status: 'PASS' | 'FAIL';
  remarks?: string;
}

export default function ClassTestsPage() {
  const router = useRouter();
  const [classTests, setClassTests] = useState<ClassTest[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [testResults, setTestResults] = useState<Record<string, ClassTestResult>>({});
  
  const [selectedTest, setSelectedTest] = useState<ClassTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ClassTest>({
    name: '',
    subjectId: '',
    classId: '',
    teacherId: '',
    date: new Date().toISOString().split('T')[0],
    totalQuestions: 10,
    passingQuestions: 5,
    description: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchStudentsAndResults();
    }
  }, [selectedTest]);

  const fetchInitialData = async () => {
    try {
      const [testsRes, subjectsRes, classesRes] = await Promise.all([
        fetch('/api/exams/class-tests'),
        fetch('/api/subjects'),
        fetch('/api/classes')
      ]);

      if (testsRes.ok) setClassTests(await testsRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
    } catch (error) {
      toast.error('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndResults = async () => {
    if (!selectedTest) return;

    try {
      const [studentsRes, resultsRes] = await Promise.all([
        fetch(`/api/students?classId=${selectedTest.classId}`),
        fetch(`/api/exams/class-tests/${selectedTest.id}/results`)
      ]);

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);

        // Initialize results for all students
        const initialResults: Record<string, ClassTestResult> = {};
        studentsData.forEach((student: Student) => {
          initialResults[student.id] = {
            studentId: student.id,
            classTestId: selectedTest.id!,
            correctAnswers: 0,
            status: 'FAIL',
            remarks: ''
          };
        });

        // Load existing results if available
        if (resultsRes.ok) {
          const results = await resultsRes.json();
          results.forEach((result: ClassTestResult) => {
            if (initialResults[result.studentId]) {
              initialResults[result.studentId] = result;
            }
          });
        }

        setTestResults(initialResults);
      }
    } catch (error) {
      toast.error('Failed to fetch students and results');
    }
  };

  const updateStudentResult = (studentId: string, field: keyof ClassTestResult, value: any) => {
    setTestResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        status: field === 'correctAnswers' 
          ? (value >= selectedTest!.passingQuestions ? 'PASS' : 'FAIL')
          : prev[studentId].status
      }
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter test name');
      return false;
    }
    if (!formData.subjectId || !formData.classId) {
      toast.error('Please select subject and class');
      return false;
    }
    if (formData.totalQuestions <= 0) {
      toast.error('Total questions must be greater than 0');
      return false;
    }
    if (formData.passingQuestions < 0 || formData.passingQuestions > formData.totalQuestions) {
      toast.error('Passing questions must be between 0 and total questions');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = editingId ? `/api/exams/class-tests/${editingId}` : '/api/exams/class-tests';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingId ? 'Class test updated successfully' : 'Class test created successfully');
        resetForm();
        fetchInitialData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save class test');
      }
    } catch (error) {
      toast.error('Failed to save class test');
    } finally {
      setSaving(false);
    }
  };

  const handleResultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    setSaving(true);
    try {
      const resultsData = Object.values(testResults).map(result => ({
        ...result,
        classTestId: selectedTest.id!
      }));

      const response = await fetch(`/api/exams/class-tests/${selectedTest.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: resultsData })
      });

      if (response.ok) {
        toast.success('Results saved successfully');
        fetchStudentsAndResults(); // Refresh to show updated results
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save results');
      }
    } catch (error) {
      toast.error('Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subjectId: '',
      classId: '',
      teacherId: '',
      date: new Date().toISOString().split('T')[0],
      totalQuestions: 10,
      passingQuestions: 5,
      description: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const editTest = (test: ClassTest) => {
    setFormData(test);
    setEditingId(test.id!);
    setShowForm(true);
  };

  const deleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class test?')) return;

    try {
      const response = await fetch(`/api/exams/class-tests/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Class test deleted successfully');
        fetchInitialData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete class test');
      }
    } catch (error) {
      toast.error('Failed to delete class test');
    }
  };

  const filteredStudents = students.filter(student => 
    student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPassRate = () => {
    if (Object.keys(testResults).length === 0) return 0;
    const passed = Object.values(testResults).filter(r => r.status === 'PASS').length;
    return Math.round((passed / Object.keys(testResults).length) * 100);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Test Management</h1>
          <p className="text-gray-600">Create and manage class tests with simple pass/fail tracking</p>
        </div>

        {/* Class Test Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">
              {editingId ? 'Edit Class Test' : 'New Class Test'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Questions</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalQuestions}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalQuestions: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passing Questions</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.passingQuestions}
                    onChange={(e) => setFormData(prev => ({ ...prev, passingQuestions: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : (editingId ? 'Update Test' : 'Create Test')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Class Tests List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Class Tests</h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              New Test
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classTests.map(test => {
              const subject = subjects.find(s => s.id === test.subjectId);
              const cls = classes.find(c => c.id === test.classId);
              
              return (
                <div key={test.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">{test.name}</h3>
                    <div className="text-sm text-gray-600">
                      <div>Subject: {subject?.name} ({subject?.code})</div>
                      <div>Class: {cls?.name}</div>
                      <div>Date: {new Date(test.date).toLocaleDateString()}</div>
                      <div>Questions: {test.totalQuestions} (Pass: {test.passingQuestions})</div>
                    </div>
                    {test.description && (
                      <p className="text-sm text-gray-500">{test.description}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setSelectedTest(test)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    >
                      Enter Results
                    </button>
                    <button
                      onClick={() => editTest(test)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTest(test.id!)}
                      className="px-3 py-2 border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {classTests.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No class tests found. Create your first test!
              </div>
            )}
          </div>
        </div>

        {/* Results Entry */}
        {selectedTest && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Results Entry: {selectedTest.name}</h2>
                <p className="text-gray-600">
                  Pass Rate: {getPassRate()}% | Students: {Object.keys(testResults).length} | 
                  Passing: {selectedTest.passingQuestions}/{selectedTest.totalQuestions} questions
                </p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setSelectedTest(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleResultsSubmit}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        <User className="inline h-4 w-4 mr-1" />
                        Student
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Correct Answers
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const result = testResults[student.id];
                      if (!result) return null;

                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-gray-600">Roll: {student.rollNumber}</div>
                            </div>
                          </td>
                          
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={selectedTest.totalQuestions}
                              value={result.correctAnswers}
                              onChange={(e) => updateStudentResult(
                                student.id, 
                                'correctAnswers', 
                                parseInt(e.target.value) || 0
                              )}
                              className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              / {selectedTest.totalQuestions}
                            </div>
                          </td>
                          
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'PASS' 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-red-700 bg-red-100'
                            }`}>
                              {result.status === 'PASS' ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {result.status}
                            </span>
                          </td>
                          
                          <td className="border border-gray-300 px-4 py-3">
                            <input
                              type="text"
                              placeholder="Optional remarks"
                              value={result.remarks || ''}
                              onChange={(e) => updateStudentResult(student.id, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No students found for the selected criteria
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save All Results'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}