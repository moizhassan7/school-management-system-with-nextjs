'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Plus, 
    Search, 
    Filter, 
    MoreVertical, 
    Phone, 
    Users, 
    UserPlus, 
    GraduationCap, 
    TrendingUp, 
    CheckCircle2, 
    FileUp 
} from 'lucide-react';
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
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Page Heading & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Student Directory</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-base font-normal">Manage student profiles, academic records, and enrollment status.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50 gap-2 font-bold">
                        <FileUp className="h-4 w-4" /> Import
                    </Button>
                    <Link href="/students/new">
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-blue-500/20 font-bold gap-2">
                            <Plus className="h-4 w-4" /> Add New Student
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
                    <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Students</p>
                            <div className="p-1.5 rounded-md bg-blue-50 text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-bold text-slate-900">{students.length}</p>
                            <span className="text-green-600 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" /> 12%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
                    <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Active Enrollment</p>
                            <div className="p-1.5 rounded-md bg-green-50 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-bold text-slate-900">{students.filter(s => !s.suspended).length}</p>
                            <span className="text-green-600 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" /> 5%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
                    <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Graduated</p>
                            <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-bold text-slate-900">45</p>
                            <span className="text-green-600 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" /> 2%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
                    <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">New Admissions</p>
                            <div className="p-1.5 rounded-md bg-orange-50 text-orange-600">
                                <UserPlus className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-bold text-slate-900">12</p>
                            <span className="text-green-600 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" /> 8%
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search className="h-5 w-5" />
                    </div>
                    <Input 
                        placeholder="Search by name, ID, or email..." 
                        className="pl-10 h-10 bg-[#f6f7f8] border-transparent focus:bg-white transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                    <Button variant="outline" className="h-10 bg-white border-slate-200 text-slate-700 gap-2">
                        <Filter className="h-4 w-4 text-slate-500" /> Filters
                    </Button>
                    <div className="h-6 w-px bg-slate-300 mx-1"></div>
                    <Button variant="secondary" className="h-10 bg-primary/10 text-primary hover:bg-primary/20 font-medium">All Students</Button>
                    <Button variant="ghost" className="h-10 text-slate-600 hover:bg-slate-100">Grade 9</Button>
                    <Button variant="ghost" className="h-10 text-slate-600 hover:bg-slate-100">Grade 10</Button>
                    <Button variant="ghost" className="h-10 text-slate-600 hover:bg-slate-100">Grade 11</Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-2 text-sm text-slate-500">Loading directory...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        No students found matching your criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow className="border-b border-slate-200 hover:bg-transparent">
                                    <TableHead className="w-12 p-4"><input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" /></TableHead>
                                    <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</TableHead>
                                    <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</TableHead>
                                    <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Grade</TableHead>
                                    <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Contact</TableHead>
                                    <TableHead className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {filteredStudents.map((student) => {
                                    const record = student.studentRecord;
                                    return (
                                        <TableRow key={student.id} className="group hover:bg-gray-50 transition-colors border-0">
                                            <TableCell className="p-4"><input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" /></TableCell>
                                            <TableCell className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors cursor-pointer">{student.name}</span>
                                                        <span className="text-xs text-slate-500">{student.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4 text-sm text-slate-900 font-medium font-mono">{record?.admissionNumber || 'N/A'}</TableCell>
                                            <TableCell className="p-4 text-sm text-slate-600">
                                                {record?.myClass ? `${record.myClass.name} ${record.section ? `(${record.section.name})` : ''}` : '-'}
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${student.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${student.suspended ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                                    {student.suspended ? 'Suspended' : 'Active'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="p-4 text-sm text-slate-500 hidden sm:table-cell">
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {student.phone || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-gray-100">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
                
                {/* Pagination (Static for now) */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-gray-50/50">
                    <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">1-{filteredStudents.length}</span> of <span className="font-bold text-slate-900">{students.length}</span> students</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600" disabled>Previous</Button>
                        <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600" disabled>Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}