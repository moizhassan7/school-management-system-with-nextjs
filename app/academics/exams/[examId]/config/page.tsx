'use client';

import { useState, useEffect, use } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ExamConfigPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const { classGroups } = useSidebar();
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Flatten classes for dropdown
  const allClasses = classGroups.flatMap(cg => cg.classes || []);

  useEffect(() => {
    if (selectedClassId) {
      fetch(`/api/academics/exams/${examId}/config?classId=${selectedClassId}`)
        .then(res => res.json())
        .then(setSubjects);
    }
  }, [selectedClassId, examId]);

  const handleUpdate = (index: number, field: string, value: string) => {
    const updated = [...subjects];
    updated[index][field] = value;
    setSubjects(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await fetch(`/api/academics/exams/${examId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId, configs: subjects })
    });
    setIsSaving(false);
    alert('Configuration Saved!');
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/academics/exams"><Button variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Exam Configuration</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="w-64">
            <Select onValueChange={setSelectedClassId}>
              <SelectTrigger><SelectValue placeholder="Select Class to Configure" /></SelectTrigger>
              <SelectContent>{allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {subjects.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Subject</TableHead><TableHead>Max Marks</TableHead><TableHead>Pass Marks</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((sub, i) => (
                    <TableRow key={sub.subjectId}>
                      <TableCell className="font-medium">{sub.subjectName}</TableCell>
                      <TableCell><Input type="number" value={sub.maxMarks} onChange={e => handleUpdate(i, 'maxMarks', e.target.value)} className="w-32" /></TableCell>
                      <TableCell><Input type="number" value={sub.passMarks} onChange={e => handleUpdate(i, 'passMarks', e.target.value)} className="w-32" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Select a class to configure subjects.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
