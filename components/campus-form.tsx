'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const campusSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

interface CampusFormProps {
    schoolId: string;
    campusId?: string;
    initialData?: {
        name: string;
        address: string;
        phone: string;
        email?: string;
    };
}

export default function CampusForm({ schoolId, campusId, initialData }: CampusFormProps) {
    const router = useRouter();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const validatedData = campusSchema.parse(data);

            const url = campusId
                ? `/api/schools/${schoolId}/campuses/${campusId}`
                : `/api/schools/${schoolId}/campuses`;

            const method = campusId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(validatedData),
            });

            if (!response.ok) {
                const result = await response.json();
                if (result.errors) {
                    const fieldErrors: Record<string, string> = {};
                    result.errors.forEach((issue: any) => {
                        fieldErrors[issue.path[0]] = issue.message;
                    });
                    setErrors(fieldErrors);
                    return;
                }
                throw new Error(result.error || 'Failed to save campus');
            }

            router.push(`/schools/${schoolId}/campuses`);
            router.refresh();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((err) => {
                    if (err.path) {
                        fieldErrors[err.path[0] as string] = err.message;
                    }
                });
                setErrors(fieldErrors);
            } else {
                console.error(error);
                alert(error instanceof Error ? error.message : 'An error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Campus Name</label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    defaultValue={initialData?.name}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                <input
                    type="text"
                    name="address"
                    id="address"
                    defaultValue={initialData?.address}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>

            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                    type="text"
                    name="phone"
                    id="phone"
                    defaultValue={initialData?.phone}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={initialData?.email}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : campusId ? 'Update Campus' : 'Add Campus'}
                </button>
                <button
                    type="button"
                    onClick={() => router.push(`/schools/${schoolId}/campuses`)}
                    className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
