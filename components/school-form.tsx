'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSidebar } from '@/contexts/SidebarContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

const schoolSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    initials: z.string().min(1, 'Initials are required'),
    address: z.string().min(1, 'Address is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    logoPath: z.string().optional(),
});

type SchoolFormValues = z.infer<typeof schoolSchema>;

export default function SchoolForm() {
    const router = useRouter();
    const { refreshData } = useSidebar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoError, setLogoError] = useState<string | null>(null);

    // 1. Initialize useForm
    const form = useForm<SchoolFormValues>({
        resolver: zodResolver(schoolSchema),
        defaultValues: {
            name: '',
            initials: '',
            address: '',
            email: '',
            phone: '',
            logoPath: '',
        },
    });

    // 2. Handle File Change Manually (Files are often easier to handle outside RHF's controlled inputs)
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setLogoError(null);

        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setLogoError('Please select an image file');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setLogoError('File size must be less than 5MB');
                return;
            }

            setLogoFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // 3. Define the submit handler
    const onSubmit = async (data: SchoolFormValues) => {
        setIsSubmitting(true);
        setLogoError(null);

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

            // Combine form data with the new logo path
            const payload = {
                ...data,
                logoPath: logoPath || undefined,
            };

            const response = await fetch('/api/schools', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const result = await response.json();
                if (result.errors) {
                    // Set server-side errors to the form
                    Object.entries(result.errors).forEach(([key, message]) => {
                        form.setError(key as keyof SchoolFormValues, { 
                            type: 'server', 
                            message: message as string 
                        });
                    });
                    return;
                }
                throw new Error('Failed to create school');
            }

            await refreshData();
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error(error);
            // Use form's root error or a general alert
            form.setError('root', { 
                message: error instanceof Error ? error.message : 'An error occurred' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Global Error Message */}
                {form.formState.errors.root && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                        {form.formState.errors.root.message}
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="School Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="initials"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Initials</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. ABC" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Input placeholder="123 School St" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="admin@school.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                                <Input placeholder="+1 234 567 890" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* File Input is handled manually but styled to match */}
                <div className="space-y-2">
                    <Label htmlFor="logo">School Logo (Optional)</Label>
                    <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                    />
                    {logoError && (
                        <p className="text-sm font-medium text-destructive">{logoError}</p>
                    )}
                    
                    {logoPreview && (
                        <div className="mt-4">
                            <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="h-24 w-24 object-contain border rounded-md p-2 bg-secondary/10"
                            />
                        </div>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Add School'}
                </Button>
            </form>
        </Form>
    );
}