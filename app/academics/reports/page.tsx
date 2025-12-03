'use client';

import { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, FileBarChart, Printer } from 'lucide-react';
import GazetteView from '@/components/reports/gazette-view';

export default function ReportsPage() {
    const { schools, classGroups } = useSidebar();
    const [exams, setExams] = useState<any[]>([]);
    
    // Selection State
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    
    // Report Data State
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    // Load Exams
    useEffect(() => {
        if (schools[0]?.id) {
            fetch(`/api/academics/exams?schoolId=${schools[0].id}`)
                .then(res => res.json())
                .then(setExams);
        }
    }, [schools]);

    const allClasses = classGroups.flatMap(cg => 
        cg.subjectGroups.flatMap(sg => sg.classes)
    );

    const handleGenerate = async () => {
        if (!selectedExamId || !selectedClassId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/academics/reports?examId=${selectedExamId}&classId=${selectedClassId}`);
            if (res.ok) {
                setReportData(await res.json());
                setGenerated(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex items-center gap-2">
                <FileBarChart className="h-8 w-8 text-indigo-600" />
                <div>
                    <h1 className="text-3xl font-bold">Academic Reports</h1>
                    <p className="text-muted-foreground">Generate class gazettes and student result cards.</p>
                </div>
            </div>

            {/* Selection Card */}
            <Card className="bg-slate-50 border-indigo-100">
                <CardHeader>
                    <CardTitle className="text-lg">Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="grid w-full gap-2">
                        <label className="text-sm font-medium">Select Exam</label>
                        <Select onValueChange={setSelectedExamId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Choose Exam" /></SelectTrigger>
                            <SelectContent>
                                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid w-full gap-2">
                        <label className="text-sm font-medium">Select Class</label>
                        <Select onValueChange={setSelectedClassId}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Choose Class" /></SelectTrigger>
                            <SelectContent>
                                {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleGenerate} disabled={loading || !selectedExamId || !selectedClassId} className="md:w-auto w-full">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Generate Result
                    </Button>
                </CardContent>
            </Card>

            {/* Results View */}
            {generated && (
                <GazetteView 
                    data={reportData} 
                    examName={exams.find(e => e.id === selectedExamId)?.name} 
                    className={allClasses.find(c => c.id === selectedClassId)?.name}
                />
            )}
        </div>
    );
}