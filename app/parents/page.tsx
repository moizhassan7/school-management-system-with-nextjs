'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Users, Search, ChevronRight, Baby, Phone, CreditCard, Loader2 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

export default function ParentsPage() {
    const [parents, setParents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/parents/financial-overview')
            .then(res => res.json())
            .then(data => {
                setParents(data);
                setLoading(false);
            });
    }, []);

    // Filter Logic
    const filteredParents = parents.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cnic?.includes(searchQuery)
    );

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Parent Directory</h1>
                    <p className="text-slate-500">Manage parents, kinship, and family accounts.</p>
                </div>
                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search name, phone, CNIC..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Parents</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{parents.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Total Outstanding (Family)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ${parents.reduce((sum, p) => sum + p.totalFamilyDue, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Parent Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Children</TableHead>
                            <TableHead>Total Due</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredParents.map((parent) => (
                            <TableRow key={parent.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{parent.name}</span>
                                        <span className="text-xs text-slate-500">{parent.cnic || 'No CNIC'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {parent.phone}</span>
                                        <span className="text-slate-500">{parent.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="flex w-fit items-center gap-1">
                                        <Baby className="h-3 w-3" /> {parent.childrenCount}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {parent.totalFamilyDue > 0 ? (
                                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                            <CreditCard className="h-3 w-3" /> ${parent.totalFamilyDue.toLocaleString()}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Cleared</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/parents/${parent.id}`}>
                                        <Button size="sm" variant="ghost">View <ChevronRight className="ml-1 h-4 w-4" /></Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}