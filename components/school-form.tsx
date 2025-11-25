'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const schoolSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    initials: z.string().min(1, 'Initials are required'),
    address: z.string().min(1, 'Address is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    logoPath: z.string().optional(),
});

export default function SchoolForm() {
    const router = useRouter();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrors({ ...errors, logo: 'Please select an image file' });
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setErrors({ ...errors, logo: 'File size must be less than 5MB' });
                return;
            }

            setLogoFile(file);
            setErrors({ ...errors, logo: '' });

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            let logoPath = '';

            // Upload logo if file is selected
            if (logoFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', logoFile);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData,
                });

                if (!uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    throw new Error(uploadResult.error || 'Failed to upload logo');
                }

                const uploadResult = await uploadResponse.json();
                logoPath = uploadResult.path;
            }

            // Add logoPath to data
            const schoolData = {
                ...data,
                logoPath: logoPath || undefined,
            };

            const validatedData = schoolSchema.parse(schoolData);

            const response = await fetch('/api/schools', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(validatedData),
            });

            if (!response.ok) {
                const result = await response.json();
                if (result.errors) {
                    // Map Zod issues to error object
                    const fieldErrors: Record<string, string> = {};
                    result.errors.forEach((issue: any) => {
                        fieldErrors[issue.path[0]] = issue.message;
                    });
                    setErrors(fieldErrors);
                    return;
                }
                throw new Error('Failed to create school');
            }

            router.push('/');
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
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" name="name" id="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
                <label htmlFor="initials" className="block text-sm font-medium text-gray-700">Initials</label>
                <input type="text" name="initials" id="initials" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                {errors.initials && <p className="text-red-500 text-xs mt-1">{errors.initials}</p>}
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" name="address" id="address" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" id="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="text" name="phone" id="phone" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
                <label htmlFor="logo" className="block text-sm font-medium text-gray-700">School Logo (Optional)</label>
                <input
                    type="file"
                    name="logo"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {errors.logo && <p className="text-red-500 text-xs mt-1">{errors.logo}</p>}

                {logoPreview && (
                    <div className="mt-2">
                        <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-24 w-24 object-contain border border-gray-300 rounded-md p-2"
                        />
                    </div>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {isSubmitting ? 'Saving...' : 'Add School'}
            </button>
        </form>
    );
}
