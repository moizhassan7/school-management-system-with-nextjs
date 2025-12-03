'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Plus, 
    Pencil, 
    Trash2, 
    ArrowLeft, 
    Building2, 
    MapPin, 
    Phone, 
    Mail 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';

interface Campus {
    id: string;
    name: string;
    address: string;
    phone: string;
    email?: string;
}

interface School {
    id: string;
    name: string;
    initials: string;
}

export default function CampusesPage({ params }: { params: Promise<{ schoolId: string }> }) {
    const { schoolId } = use(params);
    const router = useRouter();
    const [school, setSchool] = useState<School | null>(null);
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [schoolId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch school details
            const schoolResponse = await fetch(`/api/schools/${schoolId}`);
            if (!schoolResponse.ok) {
                throw new Error('School not found');
            }
            const schoolData = await schoolResponse.json();
            setSchool(schoolData);

            // Fetch campuses
            const campusesResponse = await fetch(`/api/schools/${schoolId}/campuses`);
            if (!campusesResponse.ok) {
                throw new Error('Failed to fetch campuses');
            }
            const campusesData = await campusesResponse.json();
            setCampuses(campusesData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (campusId: string) => {
        if (!confirm('Are you sure you want to delete this campus?')) {
            return;
        }

        try {
            const response = await fetch(`/api/schools/${schoolId}/campuses/${campusId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete campus');
            }

            // Refresh the list
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete campus');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Loading school data...</p>
            </div>
        );
    }

    if (error || !school) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <p className="text-destructive font-medium">{error || 'School not found'}</p>
                <Link href="/">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go back to home
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-2">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{school.name}</h1>
                        <p className="text-muted-foreground">Manage campuses for {school.initials}</p>
                    </div>
                    <Link href={`/schools/${schoolId}/campuses/new`}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Campus
                        </Button>
                    </Link>
                </div>

                {/* Content Section */}
                {campuses.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                        <div className="rounded-full bg-muted/50 p-4 mb-4">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No campuses found</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            This school doesn't have any campuses yet. Add a new campus to get started.
                        </p>
                        <Link href={`/schools/${schoolId}/campuses/new`}>
                            <Button>Add First Campus</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {campuses.map((campus) => (
                            <Card key={campus.id} className="flex flex-col hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        {campus.name}
                                    </CardTitle>
                                    <CardDescription className="flex items-start gap-2 pt-1">
                                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> 
                                        {campus.address}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" /> 
                                        {campus.phone}
                                    </div>
                                    {campus.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" /> 
                                            {campus.email}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 pt-4 border-t">
                                    <Link href={`/schools/${schoolId}/campuses/${campus.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                        </Button>
                                    </Link>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleDelete(campus.id)}
                                    >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}