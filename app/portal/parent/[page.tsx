'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, BookOpen, Calendar } from 'lucide-react';

interface Child {
    id: string; // Kinship ID
    relationship: string;
    studentRecord: {
        admissionNumber: string;
        user: {
            name: string;
            email: string;
            profilePath?: string;
        };
        myClass: {
            name: string;
        };
        section?: {
            name: string;
        };
    };
}

export default function ParentDashboard() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);

    // In a real app, you'd get the logged-in user's parentId from the session
    // For demo, we might need to hardcode or fetch based on a "me" endpoint
    useEffect(() => {
        const fetchChildren = async () => {
            try {
                // Assuming you have an endpoint that gets the current user's parent record ID
                // const userRes = await fetch('/api/auth/me'); 
                // const user = await userRes.json();
                
                // Demo: Fetching for a specific known parentId or using a query param for testing
                // Replace 'PARENT_ID_HERE' with actual logic
                const parentId = 'cm3...'; 
                
                const res = await fetch(`/api/parents/${parentId}/students`);
                if (res.ok) {
                    setChildren(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchChildren();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading children...</div>;

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-2">Parent Portal</h1>
            <p className="text-muted-foreground mb-8">Welcome back. Here is an overview of your children.</p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((kinship) => {
                    const student = kinship.studentRecord;
                    return (
                        <Card key={kinship.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                            {student.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{student.user.name}</CardTitle>
                                            <CardDescription>{student.admissionNumber}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline">{kinship.relationship}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <BookOpen className="h-4 w-4" />
                                        <span>
                                            {student.myClass?.name || 'No Class'} 
                                            {student.section ? ` - ${student.section.name}` : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>2024-2025</span>
                                    </div>
                                </div>
                                
                                <div className="pt-2">
                                    <Button className="w-full" variant="secondary">View Report Card</Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}