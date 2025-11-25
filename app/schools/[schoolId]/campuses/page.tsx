'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !school) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-red-600">{error || 'School not found'}</p>
                    <Link href="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
                        Go back to home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-indigo-600 hover:text-indigo-500 text-sm mb-2 inline-block">
                        ← Back to Schools
                    </Link>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900">{school.name} - Campuses</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Manage all campuses for {school.initials}
                            </p>
                        </div>
                        <Link
                            href={`/schools/${schoolId}/campuses/new`}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Add Campus
                        </Link>
                    </div>
                </div>

                {/* Campus List */}
                {campuses.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <p className="text-gray-600 mb-4">No campuses found for this school.</p>
                        <Link
                            href={`/schools/${schoolId}/campuses/new`}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Add First Campus
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {campuses.map((campus) => (
                                <li key={campus.id} className="p-6 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{campus.name}</h3>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Address:</span> {campus.address}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Phone:</span> {campus.phone}
                                                </p>
                                                {campus.email && (
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Email:</span> {campus.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Link
                                                href={`/schools/${schoolId}/campuses/${campus.id}/edit`}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(campus.id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
