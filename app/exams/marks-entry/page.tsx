'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Save, Calendar, BookOpen, Users, CheckCircle2, XCircle } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface QuestionDef {
  id: string;
  label: string;
  maxMarks: number;
  order: number;
}

interface Configuration {
  id: string;
  examId: string;
  subjectId: string;
  classId: string;
  maxMarks: number;
  passMarks: number;
  questions: QuestionDef[];
}

interface StudentWithMarks {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  resultId?: string;
  totalObtained: number;
  status?: 'PASS' | 'FAIL';
  grade?: string | null;
  questionMarks: {
    id?: string;
    questionDefId: string;
    obtainedMarks: number;
    questionDef?: QuestionDef;
  }[];
}

export default function MarksEntryPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [filters, setFilters] = useState({
    examId: '',
    subjectId: '',
    classId: ''
  });

  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [students, setStudents] = useState<StudentWithMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (filters.examId && filters.subjectId && filters.classId) {
      fetchMarks();
    } else {
      setConfiguration(null);
      setStudents([]);
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
    } catch {
      toast.error('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarks = async () => {
    setFetching(true);
    try {
      const url = `/api/exams/marks?examId=${filters.examId}&classId=${filters.classId}&subjectId=${filters.subjectId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to load marks');
        return;
      }
      const data = await res.json();
      setConfiguration(data.configuration);
      const questionDefs: QuestionDef[] = data.configuration.questions;
      const normalizedStudents: StudentWithMarks[] = (data.students || []).map((s: StudentWithMarks) => {
        const qmMap = new Map(s.questionMarks.map(qm => [qm.questionDefId, qm]));
        const merged = questionDefs.map(q => {
          const existing = qmMap.get(q.id);
          return {
            id: existing?.id,
            questionDefId: q.id,
            obtainedMarks: existing?.obtainedMarks ?? 0,
            questionDef: q
          };
        });
        const total = merged.reduce((sum, m) => sum + (Number(m.obtainedMarks) || 0), 0);
        return {
          ...s,
          totalObtained: total,
          status: total >= data.configuration.passMarks ? 'PASS' : 'FAIL',
          questionMarks: merged
        };
      });
      setStudents(normalizedStudents);
    } catch {
      toast.error('Failed to load marks');
    } finally {
      setFetching(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.studentName.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const updateMark = (studentId: string, questionDefId: string, value: number) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.studentId !== studentId) return s;
        const questionMarks = s.questionMarks.map(qm =>
          qm.questionDefId === questionDefId
            ? { ...qm, obtainedMarks: Math.min(Math.max(0, value), qm.questionDef!.maxMarks) }
            : qm
        );
        const totalObtained = questionMarks.reduce((sum, m) => sum + (Number(m.obtainedMarks) || 0), 0);
        const status = configuration && totalObtained >= configuration.passMarks ? 'PASS' : 'FAIL';
        return { ...s, questionMarks, totalObtained, status };
      })
    );
  };

  const saveStudent = async (student: StudentWithMarks) => {
    if (!configuration) return;
    setSaving(true);
    try {
      const payload = {
        examId: configuration.examId,
        studentId: student.studentId,
        subjectId: configuration.subjectId,
        classId: configuration.classId,
        questionMarks: student.questionMarks.map(qm => ({
          questionDefId: qm.questionDefId,
          obtainedMarks: Number(qm.obtainedMarks) || 0
        }))
      };
      const res = await fetch('/api/exams/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save marks');
        return;
      }
      const data = await res.json();
      toast.success(`Saved: ${student.studentName} — ${data.status} (${Math.round(data.percentage)}%)`);
      await fetchMarks();
    } catch {
      toast.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!configuration) return;
    setSaving(true);
    try {
      for (const s of filteredStudents) {
        await saveStudent(s);
      }
      toast.success('All marks saved');
    } finally {
      setSaving(false);
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marks Entry</h1>
          <p className="text-gray-600">Enter per-question marks for selected exam, subject, and class</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select Exam, Subject, and Class
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <BookOpen className="inline h-4 w-4 mr-1" />
                Subject
              </label>
              <select
                value={filters.subjectId}
                onChange={(e) => setFilters(prev => ({ ...prev, subjectId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}{subject.code ? ` (${subject.code})` : ''}
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
        </div>

        {configuration && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold">Marks Entry</h2>
                <p className="text-gray-600">
                  Max: {configuration.maxMarks} • Pass: {configuration.passMarks} • Questions: {configuration.questions.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={saveAll}
                  disabled={saving || fetching || filteredStudents.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    {configuration.questions.map(q => (
                      <th key={q.id} className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        {q.label} <span className="text-xs text-gray-500">/ {q.maxMarks}</span>
                      </th>
                    ))}
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">Total</th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.studentId} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{student.studentName}</div>
                          <div className="text-sm text-gray-600">Adm: {student.admissionNumber}</div>
                        </div>
                      </td>
                      {student.questionMarks.map(qm => (
                        <td key={qm.questionDefId} className="border border-gray-200 px-4 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={qm.questionDef?.maxMarks ?? 0}
                            value={qm.obtainedMarks}
                            onChange={(e) => updateMark(student.studentId, qm.questionDefId, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="text-[10px] text-gray-500 mt-1">/ {qm.questionDef?.maxMarks}</div>
                        </td>
                      ))}
                      <td className="border border-gray-200 px-4 py-3 text-center font-medium">
                        {student.totalObtained} / {configuration.maxMarks}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === 'PASS' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                        }`}>
                          {student.status === 'PASS' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {student.status || '—'}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <button
                          onClick={() => saveStudent(student)}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No students found for the selected criteria
              </div>
            )}
          </div>
        )}

        {!configuration && filters.examId && filters.subjectId && filters.classId && !fetching && (
          <div className="text-center text-gray-500 py-12">
            No configuration found for the selected exam, subject, and class
          </div>
        )}
      </div>
    </div>
  );
}

