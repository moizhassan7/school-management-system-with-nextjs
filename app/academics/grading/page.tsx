'use client';

import { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GradeRange {
  name: string;
  minPercent: number;
  maxPercent: number;
  gradePoint: number;
}

export default function GradingPage() {
  const { schools } = useSidebar();
  const [systems, setSystems] = useState<any[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [ranges, setRanges] = useState<GradeRange[]>([
    { name: 'A+', minPercent: 90, maxPercent: 100, gradePoint: 4.0 },
    { name: 'A', minPercent: 80, maxPercent: 89.9, gradePoint: 3.7 },
    { name: 'B', minPercent: 70, maxPercent: 79.9, gradePoint: 3.0 },
    { name: 'F', minPercent: 0, maxPercent: 39.9, gradePoint: 0.0 },
  ]);

  useEffect(() => {
    if(schools[0]?.id) {
        fetch(`/api/academics/grade-systems?schoolId=${schools[0].id}`)
            .then(res => res.json())
            .then(setSystems);
    }
  }, [schools]);

  const addRange = () => {
    setRanges([...ranges, { name: '', minPercent: 0, maxPercent: 0, gradePoint: 0 }]);
  };

  const updateRange = (index: number, field: keyof GradeRange, value: string) => {
    const newRanges = [...ranges];
    // @ts-ignore
    newRanges[index][field] = field === 'name' ? value : Number(value);
    setRanges(newRanges);
  };

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !schools[0]?.id) return;
    
    await fetch('/api/academics/grade-systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        schoolId: schools[0].id,
        ranges
      })
    });
    
    // Refresh
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <h1 className="text-3xl font-bold">Grading Systems</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Creation Form */}
        <Card>
          <CardHeader><CardTitle>Create New System</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input 
                placeholder="System Name (e.g. Standard High School)" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
            />
            
            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Grade</TableHead>
                            <TableHead>Min %</TableHead>
                            <TableHead>Max %</TableHead>
                            <TableHead>GPA</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ranges.map((r, i) => (
                            <TableRow key={i}>
                                <TableCell><Input value={r.name} onChange={(e) => updateRange(i, 'name', e.target.value)} className="h-8" /></TableCell>
                                <TableCell><Input type="number" value={r.minPercent} onChange={(e) => updateRange(i, 'minPercent', e.target.value)} className="h-8" /></TableCell>
                                <TableCell><Input type="number" value={r.maxPercent} onChange={(e) => updateRange(i, 'maxPercent', e.target.value)} className="h-8" /></TableCell>
                                <TableCell><Input type="number" value={r.gradePoint} onChange={(e) => updateRange(i, 'gradePoint', e.target.value)} className="h-8" /></TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => removeRange(i)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <div className="flex justify-between">
                <Button variant="outline" onClick={addRange}><Plus className="mr-2 h-4 w-4" /> Add Row</Button>
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save System</Button>
            </div>
          </CardContent>
        </Card>

        {/* List of Existing Systems */}
        <div className="space-y-4">
            {systems.map((sys) => (
                <Card key={sys.id}>
                    <CardHeader>
                        <CardTitle>{sys.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 flex-wrap">
                            {sys.ranges.map((r: any) => (
                                <span key={r.id} className="px-2 py-1 bg-slate-100 rounded text-sm border">
                                    <strong>{r.name}</strong>: {r.minPercent}-{r.maxPercent}%
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}   