'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSidebar } from '@/contexts/SidebarContext';

interface ClassGroupFormProps {
    schoolId: string;
    campusId: string;
    initialData?: {
        id: string;
        name: string;
        description?: string | null;
    };
}

export function ClassGroupForm({ schoolId, campusId, initialData }: ClassGroupFormProps) {
    const router = useRouter();
    const { refreshData } = useSidebar();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const url = initialData
                ? `/api/campuses/${campusId}/class-groups/${initialData.id}`
                : `/api/campuses/${campusId}/class-groups`;

            const method = initialData ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save class group');
            }

            await refreshData();
            router.push(`/schools/${schoolId}/campuses/${campusId}`);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>{initialData ? 'Edit Class Group' : 'Create New Class Group'}</CardTitle>
                <CardDescription>
                    {initialData
                        ? 'Update the class group information'
                        : 'Add a new class group to this campus (e.g., Primary, Middle, 9th Class with Bio)'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Class Group Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Primary, Middle, 9th Class with Bio"
                            required
                        />
                        <p className="text-sm text-gray-500">
                            Examples: Primary, Middle, 9th Class with Bio, 9th Class with Computer
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Additional information about this class group"
                            rows={4}
                        />
                    </div>

                    <div className="flex gap-4 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : initialData ? 'Update Class Group' : 'Create Class Group'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
