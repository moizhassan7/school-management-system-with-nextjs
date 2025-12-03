'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Plus, Users, ArrowLeft, Trash2, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';

interface Section {
    id: string;
    name: string;
    _count?: {
        students: number;
    };
}

interface ClassDetails {
    id: string;
    name: string;
    subjectGroup: {
        id: string;
        name: string;
        classGroup: {
            name: string;
            campus: {
                name: string;
            }
        }
    };
}

export default function SectionsPage({ params }: { params: Promise<{ classId: string }> }) {
    const { classId } = use(params);
    
    const [sections, setSections] = useState<Section[]>([]);
    const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Add Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');

    useEffect(() => {
        if (classId) {
            fetchData();
        }
    }, [classId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [classRes, sectionsRes] = await Promise.all([
                fetch(`/api/classes/${classId}`),
                fetch(`/api/classes/${classId}/sections`)
            ]);

            if (classRes.ok) setClassDetails(await classRes.json());
            if (sectionsRes.ok) setSections(await sectionsRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSectionName.trim()) return;

        try {
            const res = await fetch(`/api/classes/${classId}/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSectionName })
            });

            if (res.ok) {
                setNewSectionName('');
                setIsAdding(false);
                fetchData(); // Refresh list
            }
        } catch (error) {
            console.error('Failed to add section', error);
        }
    };

    const handleDelete = async (sectionId: string) => {
        if (!confirm('Delete this section?')) return;
        try {
            const res = await fetch(`/api/classes/${classId}/sections/${sectionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // Optimistic update
                setSections(sections.filter(s => s.id !== sectionId));
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading && !classDetails) {
        return <div className="p-8 text-center text-muted-foreground">Loading Class Details...</div>;
    }

    return (
        <div className="container max-w-6xl mx-auto py-10 px-4 space-y-8">
            {/* Header with Breadcrumbs Info */}
            <div className="flex flex-col gap-4">
                <Link href={`/subject-groups/${classDetails?.subjectGroup.id}`}>
                    <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> 
                        Back to {classDetails?.subjectGroup.name || 'Subject Group'}
                    </Button>
                </Link>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            {classDetails?.name} <span className="text-muted-foreground font-light">Sections</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Building className="h-3.5 w-3.5" />
                            {classDetails?.subjectGroup.classGroup.campus.name} • {classDetails?.subjectGroup.classGroup.name}
                        </p>
                    </div>
                    <Button onClick={() => setIsAdding(!isAdding)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Section
                    </Button>
                </div>
            </div>

            {/* Add Section Form */}
            {isAdding && (
                <Card className="border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Create New Section</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddSection} className="flex gap-3">
                            <div className="flex-1">
                                <Label htmlFor="name" className="sr-only">Name</Label>
                                <Input 
                                    id="name" 
                                    placeholder="e.g. Section A, Blue, Morning" 
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button type="submit">Save</Button>
                            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Sections Grid */}
            {sections.length === 0 ? (
                <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
                    <div className="bg-muted/50 p-4 rounded-full mb-3">
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No Sections Found</h3>
                    <p className="text-muted-foreground max-w-sm mb-4">
                        Sections divide a class into smaller manageable groups (e.g. 9-A, 9-B).
                    </p>
                    <Button variant="outline" onClick={() => setIsAdding(true)}>Create First Section</Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sections.map((section) => (
                        <Card key={section.id} className="group hover:shadow-md transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl text-indigo-700">
                                        {section.name}
                                    </CardTitle>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(section.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardDescription>
                                    Class {classDetails?.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    <Users className="h-4 w-4" />
                                    <span className="font-medium">{section._count?.students || 0}</span> Students Enrolled
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}