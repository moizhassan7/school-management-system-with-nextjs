'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import PrintableReportCard from './printable-report-card';
import { FileOutput } from 'lucide-react';

interface GazetteProps {
    data: any[];
    examName: string;
    className: string;
}

export default function GazetteView({ data, examName, className }: GazetteProps) {
    if (data.length === 0) return <div className="text-center py-10">No records found.</div>;

    // Extract subjects dynamically from the first student record
    const subjects = data[0].subjects;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Result Gazette: {className}</h2>
                <Button variant="outline" onClick={() => window.print()}>
                    <FileOutput className="mr-2 h-4 w-4" /> Print Gazette
                </Button>
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100">
                                <TableHead className="font-bold">Roll No</TableHead>
                                <TableHead className="font-bold">Student Name</TableHead>
                                {subjects.map((sub: any, i: number) => (
                                    <TableHead key={i} className="text-center">{sub.subjectName}</TableHead>
                                ))}
                                <TableHead className="text-center font-bold bg-slate-200">Total</TableHead>
                                <TableHead className="text-center font-bold bg-slate-200">%</TableHead>
                                <TableHead className="text-center font-bold bg-slate-200">Grade</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((student) => (
                                <TableRow key={student.studentId}>
                                    <TableCell className="font-mono">{student.admissionNo}</TableCell>
                                    <TableCell className="font-medium">{student.studentName}</TableCell>
                                    
                                    {student.subjects.map((sub: any, i: number) => (
                                        <TableCell key={i} className="text-center">
                                            <span className={sub.status === 'FAIL' ? 'text-red-600 font-bold' : ''}>
                                                {sub.obtained}
                                            </span>
                                        </TableCell>
                                    ))}

                                    <TableCell className="text-center font-bold bg-slate-50">
                                        {student.summary.totalObtained} / {student.summary.totalMax}
                                    </TableCell>
                                    <TableCell className="text-center bg-slate-50">{student.summary.percentage}%</TableCell>
                                    <TableCell className="text-center font-bold bg-slate-50">
                                        <span className={`px-2 py-1 rounded text-xs ${student.summary.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {student.summary.grade}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700">View Card</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                                <PrintableReportCard student={student} examName={examName} className={className} />
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}