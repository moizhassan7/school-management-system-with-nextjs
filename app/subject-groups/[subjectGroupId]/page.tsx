'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Plus, 
    ArrowLeft, 
    Trash2, 
    BookCopy 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

// --- Types ---
interface SubjectItem { id: string; name: string; }

export default function SubjectGroupDetailPage() {
    const params = useParams();
    const subjectGroupId = params.subjectGroupId as string;
    
    // Data State
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [catalog, setCatalog] = useState<SubjectItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    const loadSubjects = async () => {
        const [groupRes, catalogRes] = await Promise.all([
            fetch(`/api/subject-groups/${subjectGroupId}/subjects`),
            fetch('/api/subjects'),
        ]);
        const groupData = groupRes.ok ? await groupRes.json() : [];
        const catalogData = catalogRes.ok ? await catalogRes.json() : [];
        setSubjects(Array.isArray(groupData) ? groupData : []);
        setCatalog(Array.isArray(catalogData) ? catalogData : []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (subjectGroupId) {
            loadSubjects();
        }
    }, [subjectGroupId]);

    // --- Handlers ---

    const available = catalog.filter((item) => !subjects.some((subject) => subject.id === item.id));

    const handleAttachSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId) return;
        const res = await fetch(`/api/subject-groups/${subjectGroupId}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectId: selectedSubjectId }),
        });
        if (res.ok) {
            setSelectedSubjectId('');
            await loadSubjects();
        }
    };

    const handleRemoveSubject = async (id: string) => {
        if (!confirm('Remove this subject from the group? It stays in the school subject list.')) return;
        const res = await fetch(`/api/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subjectGroupId: null }),
        });
        if (res.ok) {
            setSubjects(subjects.filter((subject) => subject.id !== id));
        }
    };

    return (
        <div className="container max-w-6xl mx-auto py-10 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href="/configuration?tab=subject-groups">
                    <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Configuration
                    </Button>
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Subject Group</h1>
                        <p className="text-muted-foreground">Attach subjects from the school list to this stream.</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 animate-pulse">Loading...</div>
            ) : (
                <Tabs defaultValue="subjects" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-1">
                        <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    </TabsList>

                    <TabsContent value="subjects" className="space-y-4 mt-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Subjects in this group</h2>
                                <p className="text-sm text-muted-foreground">
                                    New subjects are added in Configuration → Subjects.
                                </p>
                            </div>
                            <form onSubmit={handleAttachSubject} className="flex gap-2">
                                <Select value={selectedSubjectId || undefined} onValueChange={setSelectedSubjectId}>
                                    <SelectTrigger className="w-56">
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {available.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="submit" size="sm" disabled={!selectedSubjectId}>
                                    <Plus className="h-4 w-4 mr-2" /> Add
                                </Button>
                            </form>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {subjects.map((sub) => (
                                <Card key={sub.id} className="group">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Subject</CardTitle>
                                        <BookCopy className="h-4 w-4 text-indigo-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center">
                                            <div className="text-xl font-bold">{sub.name}</div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveSubject(sub.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {subjects.length === 0 && (
                            <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50">
                                <BookCopy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <h3 className="font-semibold text-lg">No subjects in this group</h3>
                                <p className="text-muted-foreground mb-4">Add subjects in Configuration, then attach them here.</p>
                                <Link href="/configuration?tab=subjects">
                                    <Button variant="outline">Open Subjects</Button>
                                </Link>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
