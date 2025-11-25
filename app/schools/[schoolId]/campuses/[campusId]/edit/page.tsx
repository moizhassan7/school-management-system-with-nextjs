'use client';

import { useState, useEffect, use } from 'react';
import CampusForm from '@/components/campus-form';

interface Campus {
    id: string;
    name: string;
    address: string;
    phone: string;
    email?: string;
}

export default function EditCampusPage({
    params
}: {
    params: Promise<{ schoolId: string; campusId: string }>
}) {
    const { schoolId, campusId } = use(params);
    const [campus, setCampus] = useState<Campus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCampus();
    }, [schoolId, campusId]);

    const fetchCampus = async () => {
        try {
            const response = await fetch(`/api/schools/${schoolId}/campuses/${campusId}`);
            if (!response.ok) {
                throw new Error('Campus not found');
            }
            const data = await response.json();
            setCampus(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto text-center">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !campus) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto text-center">
                    <p className="text-red-600">{error || 'Campus not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">Edit Campus</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Update the campus details below.
                    </p>
                </div>
                <CampusForm
                    schoolId={schoolId}
                    campusId={campusId}
                    initialData={campus}
                />
            </div>
        </div>
    );
}
