'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Settings, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSidebar } from '@/contexts/SidebarContext';
import { format } from 'date-fns';

export default function ExamsPage() {
  const { schools } = useSidebar();
  const [exams, setExams] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', academicYearId: '' });

  const schoolId = schools[0]?.id;

  useEffect(() => {
    if (schoolId) {
      fetch(`/api/academics/exams?schoolId=${schoolId}`).then(res => res.json()).then(setExams);
      fetch(`/api/academics/years?schoolId=${schoolId}`).then(res => res.json()).then(setYears);
    }
  }, [schoolId]);

  const handleSubmit = async () => {
    await fetch('/api/academics/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, schoolId })
    });
    setIsDialogOpen(false);
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Examinations</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Create Exam</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Exam</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Input placeholder="Exam Name (e.g. Final Term)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Select onValueChange={val => setFormData({...formData, academicYearId: val})}>
                <SelectTrigger><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y.id} value={y.id}>{y.startYear}-{y.stopYear}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
              </div>
              <Button onClick={handleSubmit} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <Card key={exam.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>{exam.name}</CardTitle>
              <CardDescription>{exam.academicYear.startYear}-{exam.academicYear.stopYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(exam.startDate), 'MMM d')} - {format(new Date(exam.endDate), 'MMM d, yyyy')}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex gap-2">
              <Link href={`/academics/exams/${exam.id}/config`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full"><Settings className="mr-2 h-3.5 w-3.5" /> Setup</Button>
              </Link>
              <Link href={`/academics/exams/${exam.id}/marks`} className="flex-1">
                <Button size="sm" className="w-full"><FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Marks</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}