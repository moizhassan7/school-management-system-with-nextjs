'use client';

import { useState, useEffect, use } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from '@/components/ui/card';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MarksEntryPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const { classGroups } = useSidebar();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const allClasses = classGroups.flatMap(cg => cg.classes || []);

  // Load Subjects when Class selected
  useEffect(() => {
    if (selectedClassId) {
      const cls = allClasses.find(c => c.id === selectedClassId);
      // Need to fetch subjects for this class's subject group. 
      // Simple way: call our config API which already lists subjects
      fetch(`/api/academics/exams/${examId}/config?classId=${selectedClassId}`)
        .then(res => res.json())
        .then(data => setAvailableSubjects(data)); // Reuse config response structure
    }
  }, [selectedClassId, examId]);

  // Load Students & Marks
  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      fetch(`/api/academics/exams/${examId}/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}`)
        .then(res => res.json())
        .then(setStudents);
    }
  }, [selectedClassId, selectedSubjectId, examId]);

  const handleMarkChange = (index: number, value: string) => {
    const updated = [...students];
    updated[index].marksObtained = value;
    setStudents(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await fetch(`/api/academics/exams/${examId}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        classId: selectedClassId, 
        subjectId: selectedSubjectId, 
        marks: students.filter(s => s.marksObtained !== '') 
      })
    });
    setIsSaving(false);
    alert('Marks Saved!');
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/academics/exams"><Button variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Marks Entry</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select onValueChange={setSelectedClassId}>
          <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
          <SelectContent>{allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>

        <Select onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
          <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
          <SelectContent>{availableSubjects.map(s => <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {students.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-48">Marks Obtained</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((stu, i) => (
                    <TableRow key={stu.studentId}>
                      <TableCell className="font-medium">{stu.studentName}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={stu.marksObtained} 
                          onChange={e => handleMarkChange(i, e.target.value)} 
                          className="bg-slate-50 focus:bg-white transition-colors font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Optional..." 
                          value={stu.remarks} 
                          onChange={e => {
                             const updated = [...students];
                             updated[i].remarks = e.target.value;
                             setStudents(updated);
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 flex justify-end sticky bottom-4">
                <Button onClick={handleSave} disabled={isSaving} className="shadow-lg">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  Save Marks
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {selectedSubjectId ? "No students found in this class." : "Select Class and Subject to begin."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
