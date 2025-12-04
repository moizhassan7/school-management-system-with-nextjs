'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Plus, 
    ArrowLeft, 
    Save, 
    X, 
    Trash2, 
    BookCopy 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';

// --- Types ---
interface SubjectItem { id: string; name: string; }

export default function SubjectGroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const subjectGroupId = params.subjectGroupId as string;
    
    // Data State
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Add Forms State
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        if (subjectGroupId) {
            fetch(`/api/subject-groups/${subjectGroupId}/subjects`).then(res => res.json()).then((subjectData) => {
                setSubjects(subjectData);
                setIsLoading(false);
            });
        }
    }, [subjectGroupId]);

    // --- Handlers ---

    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/subject-groups/${subjectGroupId}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newItemName }),
        });
        if (res.ok) {
            setSubjects([...subjects, await res.json()]);
            setNewItemName('');
            setIsAddingSubject(false);
        }
    };

    const handleDeleteSubject = async (id: string) => {
        if(!confirm("Delete this subject? It will be removed from all exams.")) return;
        const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
        if(res.ok) {
            setSubjects(subjects.filter(s => s.id !== id));
        }
    };

    return (
        <div className="container max-w-6xl mx-auto py-10 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href="/subject-groups">
                    <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
                    </Button>
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Subject Group</h1>
                        <p className="text-muted-foreground">Define subjects available in this stream.</p>
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
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Curriculum Subjects</h2>
                            <Button onClick={() => setIsAddingSubject(!isAddingSubject)} size="sm">
                                {isAddingSubject ? <X className="h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
                                {isAddingSubject ? 'Cancel' : 'Add Subject'}
                            </Button>
                        </div>

                        {isAddingSubject && (
                            <Card className="border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <CardContent className="pt-6">
                                    <form onSubmit={handleAddSubject} className="flex gap-4">
                                        <Input 
                                            placeholder="Subject Name (e.g. Mathematics, Physics)" 
                                            value={newItemName} 
                                            onChange={e => setNewItemName(e.target.value)} 
                                            autoFocus 
                                        />
                                        <Button type="submit">Save</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

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
                                                onClick={() => handleDeleteSubject(sub.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {subjects.length === 0 && !isAddingSubject && (
                            <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50">
                                <BookCopy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <h3 className="font-semibold text-lg">No Subjects Added</h3>
                                <p className="text-muted-foreground mb-4">Add subjects here to make them available for Exams.</p>
                                <Button variant="outline" onClick={() => setIsAddingSubject(true)}>Add First Subject</Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
