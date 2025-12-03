'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Layers, Save, X, ArrowRight } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

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

interface SubjectGroup {
    id: string;
    name: string;
}

export default function ClassGroupPage() {
    const params = useParams();
    const classGroupId = params.classGroupId as string;
    const { refreshData } = useSidebar();
    
    const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        if (classGroupId) {
            fetchSubjectGroups();
        }
    }, [classGroupId]);

    const fetchSubjectGroups = async () => {
        try {
            const response = await fetch(`/api/class-groups/${classGroupId}/subject-groups`);
            if (response.ok) {
                const data = await response.json();
                setSubjectGroups(data);
            }
        } catch (error) {
            console.error('Error fetching subject groups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSubjectGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`/api/subject-groups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newGroupName, classGroupId }),
            });

            if (response.ok) {
                setNewGroupName('');
                setIsAdding(false);
                fetchSubjectGroups();
                refreshData(); // Refresh sidebar to show new groups
            }
        } catch (error) {
            console.error('Error adding subject group:', error);
        }
    };

    return (
        <div className="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Subject Groups</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage subject groups (streams) for this class group.
                    </p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {isAdding ? 'Cancel' : 'Add Subject Group'}
                </Button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <Card className="border-indigo-100 shadow-md animate-in fade-in slide-in-from-top-4">
                    <CardHeader>
                        <CardTitle className="text-lg">Create New Subject Group</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddSubjectGroup} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="grid gap-2 flex-1 w-full">
                                <Label htmlFor="groupName">Group Name</Label>
                                <Input
                                    id="groupName"
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Pre-Engineering, Computer Science, Arts"
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" disabled={!newGroupName.trim()}>
                                <Save className="mr-2 h-4 w-4" /> Save Group
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Content List */}
            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground animate-pulse">
                    Loading subject groups...
                </div>
            ) : subjectGroups.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted/50 p-4 mb-4">
                        <Layers className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No subject groups found</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                        Subject groups allow you to organize classes into streams. Get started by adding a new one.
                    </p>
                    <Button variant="outline" onClick={() => setIsAdding(true)}>
                        Create Subject Group
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subjectGroups.map((sg) => (
                        <Link key={sg.id} href={`/subject-groups/${sg.id}`} className="block group">
                            <Card className="h-full hover:shadow-md transition-all hover:border-indigo-500">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                        <Layers className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-lg group-hover:text-indigo-700 transition-colors">
                                            {sg.name}
                                        </CardTitle>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}