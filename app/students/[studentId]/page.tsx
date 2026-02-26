    'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    ArrowLeft, User, Phone, Mail, MapPin, Calendar, 
    BookOpen, GraduationCap, Users, Shield, Edit, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
    const { studentId } = use(params);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reassignMode, setReassignMode] = useState<'KEEP_EXISTING' | 'SWITCH_TO_CLASS_DEFAULT'>('KEEP_EXISTING');
    const [isUpdatingFeeStructure, setIsUpdatingFeeStructure] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/users/${studentId}`)
            .then(res => {
                if(!res.ok) throw new Error("Student not found");
                return res.json();
            })
            .then(data => {
                setStudent(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    }, [studentId]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    if (error || !student) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h2 className="text-xl font-semibold text-red-600">Student not found</h2>
            <Link href="/students">
                <Button variant="outline">Back to Directory</Button>
            </Link>
        </div>
    );

    const record = student.studentRecord;
    const parents = record?.parents || [];
    const currentFeeItems = record?.feeStructure?.items || [];

    const handleFeeStructureReassign = async () => {
        setIsUpdatingFeeStructure(true);
        try {
            const res = await fetch(`/api/students/${student.id}/fee-structure`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: reassignMode,
                    classId: record?.classId,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update fee structure');
            }

            toast.success(data.message || 'Fee structure updated');
            const refreshed = await fetch(`/api/users/${student.id}`);
            if (refreshed.ok) {
                setStudent(await refreshed.json());
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update fee structure');
        } finally {
            setIsUpdatingFeeStructure(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/students">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
                <div className="ml-auto flex gap-2">
                    <Link href={`/users/${student.id}/edit`}>
                         <Button variant="outline"><Edit className="mr-2 h-4 w-4"/> Edit Profile</Button>
                    </Link>
                </div>
            </div>

            {/* Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border-t-4 border-t-primary shadow-sm">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="h-28 w-28 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border-4 border-white shadow-lg">
                            {student.profilePath ? (
                                <img src={student.profilePath} alt={student.name} className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <User className="h-12 w-12" />
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
                        <p className="text-slate-500 text-sm mb-4">{student.email}</p>
                        
                        <div className="flex gap-2 mb-6">
                            <Badge variant={student.suspended ? "destructive" : "default"} className="uppercase">
                                {student.suspended ? "Suspended" : "Active"}
                            </Badge>
                            <Badge variant="outline" className="font-mono">
                                {record?.admissionNumber || 'NO ID'}
                            </Badge>
                        </div>

                        <div className="w-full space-y-3 text-left bg-slate-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><BookOpen className="h-4 w-4"/> Class</span>
                                <span className="font-semibold text-slate-900">{record?.myClass?.name || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><Users className="h-4 w-4"/> Section</span>
                                <span className="font-semibold text-slate-900">{record?.section?.name || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-2"><Calendar className="h-4 w-4"/> Admitted</span>
                                <span className="font-semibold text-slate-900">
                                    {record?.admissionDate ? format(new Date(record.admissionDate), 'dd MMM yyyy') : '-'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1">Personal Details</TabsTrigger>
                            <TabsTrigger value="parents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1">Parents & Guardians</TabsTrigger>
                            <TabsTrigger value="academics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1">Academic History</TabsTrigger>
                            <TabsTrigger value="fees" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1">Fee Structure</TabsTrigger>
                        </TabsList>

                        {/* 1. Personal Details Tab */}
                        <TabsContent value="details" className="pt-6 space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Phone Number</label>
                                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                                            <Phone className="h-4 w-4 text-slate-400"/> {student.phone || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Address</label>
                                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                                            <MapPin className="h-4 w-4 text-slate-400"/> {student.address || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Gender</label>
                                        <div className="text-slate-900 font-medium">{student.gender}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Religion</label>
                                        <div className="text-slate-900 font-medium">{student.religion || 'N/A'}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 2. Parents Tab */}
                        <TabsContent value="parents" className="pt-6">
                            {parents.length === 0 ? (
                                <Card className="bg-slate-50 border-dashed">
                                    <CardContent className="py-12 text-center text-slate-500">
                                        No parent or guardian linked to this profile.
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {parents.map((p: any) => (
                                        <Card key={p.id} className="overflow-hidden">
                                            <CardContent className="p-6 flex items-start justify-between">
                                                <div className="flex gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                                        <Shield className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-lg">{p.parentRecord.user.name}</h4>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="secondary" className="text-xs">{p.relationship}</Badge>
                                                            {p.isPrimary && <Badge className="bg-green-600 text-xs">Primary Contact</Badge>}
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-slate-600">
                                                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/> {p.parentRecord.user.phone}</span>
                                                            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/> {p.parentRecord.user.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link href={`/parents/${p.parentRecord.id}`}>
                                                    <Button variant="outline" size="sm">View Profile</Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* 3. Academics Tab */}
                        <TabsContent value="academics" className="pt-6">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Session History</CardTitle></CardHeader>
                                <CardContent>
                                    {record?.academicYearRecords?.length > 0 ? (
                                        <div className="space-y-3">
                                            {record.academicYearRecords.map((yr: any) => (
                                                <div key={yr.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div>
                                                        <p className="font-bold text-slate-900">{yr.academicYear.startYear} - {yr.academicYear.stopYear}</p>
                                                        <p className="text-sm text-slate-500 mt-0.5">Class {yr.myClass?.name} {yr.section ? `(${yr.section.name})` : ''}</p>
                                                    </div>
                                                    <Badge variant="outline" className="bg-white">Promoted</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 italic">No previous academic records found.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="fees" className="pt-6 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Assigned Student Fee Structure</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {currentFeeItems.length === 0 ? (
                                        <p className="text-sm text-slate-500">No student-specific fee snapshot found yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {currentFeeItems.map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between rounded border p-2 bg-slate-50">
                                                    <span className="text-sm font-medium text-slate-800">{item.feeHead?.name || 'Fee Head'}</span>
                                                    <span className="text-sm font-semibold text-slate-900">Rs. {Number(item.amount).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Reassign Fee Structure</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-slate-600">Choose what to do when reassigning this student's fee structure.</p>
                                    <Select
                                        value={reassignMode}
                                        onValueChange={(value) => setReassignMode(value as 'KEEP_EXISTING' | 'SWITCH_TO_CLASS_DEFAULT')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="KEEP_EXISTING">Keep previous fee structure</SelectItem>
                                            <SelectItem value="SWITCH_TO_CLASS_DEFAULT">Replace with current class fee structure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleFeeStructureReassign} disabled={isUpdatingFeeStructure}>
                                        {isUpdatingFeeStructure ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Apply Selection
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}