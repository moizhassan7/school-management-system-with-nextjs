'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Edit, Calendar, BookOpen, Users } from 'lucide-react';

interface Question {
  id: string;
  questionNumber: number;
  maxMarks: number;
}

interface ExamConfiguration {
  id?: string;
  examId: string;
  subjectId: string;
  classId: string;
  maxMarks: number;
  passingMarks: number;
  questions: Question[];
}

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYearId: string;
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

export default function ExamConfigurationPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [configurations, setConfigurations] = useState<ExamConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ExamConfiguration>({
    examId: '',
    subjectId: '',
    classId: '',
    maxMarks: 0,
    passingMarks: 0,
    questions: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [examsRes, subjectsRes, classesRes, configurationsRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/subjects'),
        fetch('/api/classes'),
        fetch('/api/exams/configurations')
      ]);

      if (examsRes.ok) setExams(await examsRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (classesRes.ok) setClasses(await classesRes.json());
      if (configurationsRes.ok) setConfigurations(await configurationsRes.json());
    } catch (error) {
      toast.error('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      questionNumber: formData.questions.length + 1,
      maxMarks: 0
    };
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (id: string, field: keyof Question, value: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === id ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id).map((q, index) => ({
        ...q,
        questionNumber: index + 1
      }))
    }));
  };

  const calculateTotalMarks = () => {
    return formData.questions.reduce((total, q) => total + q.maxMarks, 0);
  };

  const validateForm = () => {
    if (!formData.examId || !formData.subjectId || !formData.classId) {
      toast.error('Please select exam, subject, and class');
      return false;
    }
    if (formData.maxMarks <= 0) {
      toast.error('Maximum marks must be greater than 0');
      return false;
    }
    if (formData.passingMarks < 0 || formData.passingMarks >= formData.maxMarks) {
      toast.error('Passing marks must be between 0 and maximum marks');
      return false;
    }
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return false;
    }
    if (calculateTotalMarks() !== formData.maxMarks) {
      toast.error(`Total question marks (${calculateTotalMarks()}) must equal maximum marks (${formData.maxMarks})`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = editingId ? `/api/exams/configurations/${editingId}` : '/api/exams/configurations';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: formData.examId,
          subjectId: formData.subjectId,
          classId: formData.classId,
          maxMarks: formData.maxMarks,
          passMarks: formData.passingMarks,
          questions: formData.questions.map(q => ({
            label: `Q${q.questionNumber}`,
            maxMarks: q.maxMarks,
            order: q.questionNumber
          }))
        })
      });

      if (response.ok) {
        toast.success(editingId ? 'Configuration updated successfully' : 'Configuration created successfully');
        resetForm();
        fetchInitialData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      examId: '',
      subjectId: '',
      classId: '',
      maxMarks: 0,
      passingMarks: 0,
      questions: []
    });
    setEditingId(null);
  };

  const editConfiguration = (config: ExamConfiguration) => {
    setFormData({
      ...config,
      questions: config.questions.map((q, index) => ({
        ...q,
        questionNumber: index + 1
      }))
    });
    setEditingId(config.id || null);
  };

  const deleteConfiguration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/exams/configurations/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Configuration deleted successfully');
        fetchInitialData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete configuration');
      }
    } catch (error) {
      toast.error('Failed to delete configuration');
    }
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Configuration</h1>
          <p className="text-gray-600">Configure exam structure, question patterns, and marking schemes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {editingId ? 'Edit Configuration' : 'New Configuration'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Exam
                    </label>
                    <select
                      value={formData.examId}
                      onChange={(e) => setFormData(prev => ({ ...prev, examId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
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
                      <BookOpen className="inline h-4 w-4 mr-1" />
                      Subject
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="inline h-4 w-4 mr-1" />
                      Class
                    </label>
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
                </div>

                {/* Marks Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passing Marks
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.passingMarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, passingMarks: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Questions Configuration */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Questions</h3>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.questions.map((question, index) => (
                      <div key={question.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                        <span className="text-sm font-medium text-gray-700 w-20">
                          Q{question.questionNumber}
                        </span>
                        <input
                          type="number"
                          placeholder="Max Marks"
                          min="1"
                          value={question.maxMarks}
                          onChange={(e) => updateQuestion(question.id, 'maxMarks', parseInt(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {formData.questions.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Total Question Marks:</span>
                        <span className="font-medium text-blue-700">{calculateTotalMarks()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-700">Maximum Marks:</span>
                        <span className="font-medium text-blue-700">{formData.maxMarks}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-700">Status:</span>
                        <span className={`font-medium ${
                          calculateTotalMarks() === formData.maxMarks 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {calculateTotalMarks() === formData.maxMarks ? '✓ Balanced' : '✗ Mismatch'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : (editingId ? 'Update Configuration' : 'Create Configuration')}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Existing Configurations */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">Existing Configurations</h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {configurations.map((config) => {
                  const exam = exams.find(e => e.id === config.examId);
                  const subject = subjects.find(s => s.id === config.subjectId);
                  const classItem = classes.find(c => c.id === config.classId);
                  
                  return (
                    <div key={config.id} className="p-4 border border-gray-200 rounded-md">
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {exam?.name} - {subject?.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Class: {classItem?.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Max: {config.maxMarks} | Pass: {config.passingMarks}
                        </div>
                        <div className="text-sm text-gray-600">
                          Questions: {config.questions.length}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => editConfiguration(config)}
                          className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteConfiguration(config.id!)}
                          className="flex items-center gap-1 px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {configurations.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No configurations found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}