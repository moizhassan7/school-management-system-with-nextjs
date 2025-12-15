'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, Building, MapPin, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function ParentDetailPage({ params }: { params: Promise<{ parentId: string }> }) {
    const { parentId } = use(params);
    const [parent, setParent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We can reuse the same API and filter client side, or build a specific one.
        // For simplicity/speed, we reuse the bulk endpoint but in prod you might want a single fetch ID endpoint.
        fetch('/api/parents/financial-overview')
            .then(res => res.json())
            .then(data => {
                const found = data.find((p: any) => p.id === parentId);
                setParent(found);
                setLoading(false);
            });
    }, [parentId]);

    if (loading) return <div className="p-10">Loading...</div>;
    if (!parent) return <div className="p-10">Parent not found</div>;

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            <Link href="/parents">
                <Button variant="ghost" className="pl-0"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Directory</Button>
            </Link>

            {/* Parent Profile Header */}
            <div className="flex flex-col md:flex-row justify-between gap-6 bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
                <div className="flex gap-4">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{parent.name}</h1>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5"/> {parent.phone}</span>
                            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5"/> {parent.email}</span>
                            <span className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5"/> CNIC: {parent.cnic}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500">Total Family Dues</p>
                    <p className={`text-3xl font-bold ${parent.totalFamilyDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${parent.totalFamilyDue.toLocaleString()}
                    </p>
                    <div className="mt-4">
        <Link href={`/parents/${parentId}/collect`}>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                Collect Payment
            </Button>
        </Link>
    </div>
                </div>
            </div>

            <Separator />

            <h2 className="text-xl font-bold">Children & Financial Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {parent.children.map((child: any) => (
                    <Card key={child.studentId} className="overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{child.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <Building className="h-3 w-3" /> Class {child.className}
                                        <span>•</span>
                                        Roll No: {child.rollNumber}
                                    </CardDescription>
                                </div>
                                <Link href={`/students/${child.studentId}`}>
                                    <Button size="sm" variant="outline">Profile</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Invoice Dues</span>
                                    <span className="font-medium">${child.invoiceDue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Challan Dues</span>
                                    <span className="font-medium">${child.challanDue.toLocaleString()}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center pt-1">
                                    <span className="font-bold">Total Payable</span>
                                    <span className={`font-bold ${child.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ${child.totalDue.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}