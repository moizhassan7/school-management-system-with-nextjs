'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/students')
            .then(res => res.json())
            .then(data => {
                setStudents(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.studentRecord?.admissionNumber.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
                    <p className="text-muted-foreground">View and manage student records and admissions.</p>
                </div>
                <Link href="/students/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Admission
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Students</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or admission no..." 
                                className="pl-8" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10">Loading students...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No students found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Admission No</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Session</TableHead>
                                    <TableHead>School</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => {
                                    const record = student.studentRecord;
                                    const currentSession = record?.academicYearRecords?.[0]?.academicYear;
                                    
                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-mono">{record?.admissionNumber || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{student.name}</span>
                                                    <span className="text-xs text-muted-foreground">{student.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {record?.myClass ? (
                                                    <Badge variant="outline">{record.myClass.name}</Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {currentSession ? (
                                                    <span className="text-sm">
                                                        {currentSession.startYear}-{currentSession.stopYear}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>{student.school?.initials}</TableCell>
                                            <TableCell>
                                                <Badge variant={student.suspended ? "destructive" : "default"} className={student.suspended ? "" : "bg-green-600"}>
                                                    {student.suspended ? 'Suspended' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}