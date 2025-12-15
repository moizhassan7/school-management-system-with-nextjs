'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Save, Calendar, BookOpen, Users, Loader2, FileOutput, Eye } from 'lucide-react';
import GazetteView from '@/components/reports/gazette-view';
import PrintableReportCard from '@/components/reports/printable-report-card';

// --- Interfaces ---

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
    obtainedMarks: string; // Storing as STRING to fix jumpy inputs
    maxMarks: number;
    label: string;
  }[];
}

// --- Component ---

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
  const [viewMode, setViewMode] = useState<'entry' | 'gazette' | 'card'>('entry');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithMarks | null>(null);

  // --- Initial Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [e, s, c] = await Promise.all([
          fetch('/api/exams').then(r => r.ok ? r.json() : []),
          fetch('/api/subjects').then(r => r.ok ? r.json() : []),
          fetch('/api/classes').then(r => r.ok ? r.json() : [])
        ]);
        setExams(e);
        setSubjects(s);
        setClasses(c);
      } catch (err) {
        toast.error('Failed to load dropdowns');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Fetch Marks on Filter Change ---
  useEffect(() => {
    if (filters.examId && filters.subjectId && filters.classId) {
      fetchMarks();
    } else {
      setConfiguration(null);
      setStudents([]);
    }
  }, [filters]);

  const fetchMarks = async () => {
    setFetching(true);
    try {
      const url = `/api/exams/marks?examId=${filters.examId}&classId=${filters.classId}&subjectId=${filters.subjectId}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to load marks');
      }
      
      const data = await res.json();
      setConfiguration(data.configuration);
      
      const questionDefs: QuestionDef[] = data.configuration.questions;
      
      const normalizedStudents: StudentWithMarks[] = (data.students || []).map((s: any) => {
        const qmMap = new Map((s.questionMarks || []).map((qm: any) => [qm.questionDefId, qm]));
        
        const merged = questionDefs.map(q => {
          const existing = qmMap.get(q.id) as any;
          // Convert number from DB to string for stable input state
          const val = existing?.obtainedMarks !== undefined ? String(existing.obtainedMarks) : "0";
          return {
            id: existing?.id,
            questionDefId: q.id,
            obtainedMarks: val,
            maxMarks: q.maxMarks,
            label: q.label
          };
        });

        const total = merged.reduce((sum, m) => sum + (parseFloat(m.obtainedMarks) || 0), 0);
        
        return {
          studentId: s.studentId, // Ensure API sends this correctly now!
          studentName: s.studentName,
          admissionNumber: s.admissionNumber || '',
          resultId: s.resultId,
          totalObtained: total,
          status: total >= data.configuration.passMarks ? 'PASS' : 'FAIL',
          grade: s.grade,
          questionMarks: merged
        };
      });

      setStudents(normalizedStudents);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load marks');
    } finally {
      setFetching(false);
    }
  };

  // --- Handlers ---

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.studentName.toLowerCase().includes(q) ||
      (s.admissionNumber || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Calculate grade from percentage
  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Transform marks data for gazette view
  const gazetteData = useMemo(() => {
    if (!configuration || students.length === 0) return [];

    return students.map(student => {
      const subjects = student.questionMarks.map(qm => ({
        subjectName: qm.label,
        maxMarks: qm.maxMarks,
        obtained: parseFloat(qm.obtainedMarks) || 0,
        status: (parseFloat(qm.obtainedMarks) || 0) >= configuration.passMarks ? 'PASS' : 'FAIL'
      }));

      const totalObtained = parseFloat(String(student.totalObtained));
      const totalMax = configuration.questions.reduce((sum, q) => sum + q.maxMarks, 0);
      const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        admissionNo: student.admissionNumber,
        subjects,
        summary: {
          totalObtained,
          totalMax,
          percentage,
          grade: student.grade || calculateGrade(percentage)
        }
      };
    });
  }, [students, configuration]);

  // Stable Input Handler
  const updateMark = (studentId: string, questionDefId: string, valueStr: string) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.studentId !== studentId) return s;

        // Validation: Allow empty string, otherwise must be number
        if (valueStr !== '' && isNaN(parseFloat(valueStr))) return s;

        const questionMarks = s.questionMarks.map(qm => {
          if (qm.questionDefId === questionDefId) {
             // Optional: Check max marks but don't block typing
             const num = parseFloat(valueStr);
             if (num > qm.maxMarks) {
                 // You can toast error here or clamp. Clamping interrupts typing usually.
                 // We will just update state and let validation handle save.
             }
             return { ...qm, obtainedMarks: valueStr };
          }
          return qm;
        });

        const totalObtained = questionMarks.reduce((sum, m) => sum + (parseFloat(m.obtainedMarks) || 0), 0);
        const status = configuration && totalObtained >= configuration.passMarks ? 'PASS' : 'FAIL';
        
        return { ...s, questionMarks, totalObtained, status };
      })
    );
  };

  const saveStudent = async (student: StudentWithMarks) => {
    if (!filters.examId || !filters.classId || !filters.subjectId) {
      toast.error('Missing filters');
      return;
    }
    
    // Safety check for studentId
    if (!student.studentId) {
      toast.error('Error: Student ID missing. Check API response.');
      console.error('Missing studentId for:', student);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        examId: filters.examId,
        subjectId: filters.subjectId,
        classId: filters.classId,
        studentId: student.studentId,
        questionMarks: student.questionMarks.map(qm => ({
          questionDefId: qm.questionDefId,
          // Convert string back to number for API
          obtainedMarks: qm.obtainedMarks === '' ? 0 : Number(qm.obtainedMarks)
        }))
      };

      const res = await fetch('/api/exams/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }

      const data = await res.json();
      toast.success(`Saved: ${student.studentName}`);
      
      setStudents(prev => prev.map(s => 
        s.studentId === student.studentId ? {
           ...s, 
           grade: data.grade, // if API returns calculated grade
           status: data.status,
           resultId: data.examResultId 
        } : s
      ));

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const s of filteredStudents) {
        await saveStudent(s);
      }
      toast.success('All processed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  const currentExam = exams.find(e => e.id === filters.examId);
  const currentClass = classes.find(c => c.id === filters.classId);
  const examName = currentExam?.name || 'Exam';
  const className = currentClass?.name || 'Class';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Marks Entry & Results</h1>
        </div>

        <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="border p-2 rounded" value={filters.examId} onChange={e => setFilters(p => ({...p, examId: e.target.value}))}>
                <option value="">Select Exam</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select className="border p-2 rounded" value={filters.subjectId} onChange={e => setFilters(p => ({...p, subjectId: e.target.value}))}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="border p-2 rounded" value={filters.classId} onChange={e => setFilters(p => ({...p, classId: e.target.value}))}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        {/* View Mode Tabs */}
        {configuration && !fetching && (
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setViewMode('entry')}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                viewMode === 'entry'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="inline-block mr-2 h-4 w-4" />
              Marks Entry
            </button>
            <button
              onClick={() => setViewMode('gazette')}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                viewMode === 'gazette'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileOutput className="inline-block mr-2 h-4 w-4" />
              Class Gazette
            </button>
          </div>
        )}

        {fetching && <div className="flex justify-center my-4"><Loader2 className="animate-spin text-gray-500" /></div>}

        {/* Marks Entry View */}
        {configuration && !fetching && viewMode === 'entry' && (
          <div className="bg-white rounded shadow p-4">
            <div className="flex justify-between mb-4">
                <div className="font-medium">Pass: {configuration.passMarks} / {configuration.maxMarks}</div>
                <div className="flex gap-2">
                    <input 
                        placeholder="Search..." 
                        className="border p-2 rounded" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <button onClick={saveAll} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save All
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-left">Student</th>
                    {configuration.questions.map(q => (
                      <th key={q.id} className="p-2 text-center min-w-20">
                        {q.label} <div className="text-xs text-gray-500">/{q.maxMarks}</div>
                      </th>
                    ))}
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map(student => (
                    <tr key={student.studentId} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{student.studentName}</div>
                        <div className="text-xs text-gray-500">{student.admissionNumber}</div>
                      </td>
                      {student.questionMarks.map(qm => (
                        <td key={qm.questionDefId} className="p-2 text-center">
                          <input
                            value={qm.obtainedMarks}
                            onFocus={e => e.target.select()}
                            onChange={e => updateMark(student.studentId, qm.questionDefId, e.target.value)}
                            className="w-16 p-1 text-center border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                      ))}
                      <td className="p-3 text-center font-bold">
                        {student.totalObtained}
                        <div className={`text-xs ${student.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                            {student.status}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => saveStudent(student)} disabled={saving} className="text-blue-600 hover:text-blue-800 p-2">
                            <Save className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gazette View */}
        {configuration && !fetching && viewMode === 'gazette' && gazetteData.length > 0 && (
          <div className="space-y-6">
            <GazetteViewWithStudentCard 
              data={gazetteData} 
              examName={examName} 
              className={className}
              selectedStudent={selectedStudent}
              onSelectStudent={setSelectedStudent}
            />
          </div>
        )}

        {configuration && !fetching && viewMode === 'gazette' && gazetteData.length === 0 && (
          <div className="bg-white rounded shadow p-8 text-center">
            <p className="text-gray-600">No data to display</p>
          </div>
        )}
    </div>
  );
}

// Gazette View Component with integrated student card modal
function GazetteViewWithStudentCard({ data, examName, className, selectedStudent, onSelectStudent }: any) {
  if (data.length === 0) return <div className="text-center py-10">No records found.</div>;

  const subjects = data[0].subjects;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Result Gazette: {className}</h2>
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
        >
          <FileOutput className="h-4 w-4" /> Print Gazette
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="font-bold p-3 text-left">Roll No</th>
              <th className="font-bold p-3 text-left">Student Name</th>
              {subjects.map((sub: any, i: number) => (
                <th key={i} className="text-center p-3">{sub.subjectName}</th>
              ))}
              <th className="text-center font-bold bg-slate-200 p-3">Total</th>
              <th className="text-center font-bold bg-slate-200 p-3">%</th>
              <th className="text-center font-bold bg-slate-200 p-3">Grade</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((student: any) => (
              <tr key={student.studentId} className="border-b hover:bg-gray-50">
                <td className="font-mono p-3">{student.admissionNo}</td>
                <td className="font-medium p-3">{student.studentName}</td>
                
                {student.subjects.map((sub: any, i: number) => (
                  <td key={i} className="text-center p-3">
                    <span className={sub.status === 'FAIL' ? 'text-red-600 font-bold' : ''}>
                      {sub.obtained}
                    </span>
                  </td>
                ))}

                <td className="text-center font-bold bg-slate-50 p-3">
                  {student.summary.totalObtained} / {student.summary.totalMax}
                </td>
                <td className="text-center bg-slate-50 p-3">{student.summary.percentage}%</td>
                <td className="text-center bg-slate-50 p-3">
                  <span className={`px-2 py-1 rounded text-xs ${student.summary.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {student.summary.grade}
                  </span>
                </td>
                <td className="text-right p-3">
                  <button 
                    onClick={() => onSelectStudent(student)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 ml-auto"
                  >
                    <Eye className="h-4 w-4" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Student Card Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selectedStudent.studentName} - {examName}</h3>
              <button 
                onClick={() => onSelectStudent(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <PrintableReportCard 
                student={selectedStudent} 
                examName={examName} 
                className={className}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}