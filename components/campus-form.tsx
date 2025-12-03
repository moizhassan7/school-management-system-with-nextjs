'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSidebar } from '@/contexts/SidebarContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

const campusSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

type CampusFormValues = z.infer<typeof campusSchema>;

interface CampusFormProps {
    schoolId: string;
    campusId?: string;
    initialData?: {
        name: string;
        address: string;
        phone: string;
        email?: string | null; // Prisma might return null
    };
}

export default function CampusForm({ schoolId, campusId, initialData }: CampusFormProps) {
    const router = useRouter();
    const { refreshData } = useSidebar();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Initialize form
    const form = useForm<CampusFormValues>({
        resolver: zodResolver(campusSchema),
        defaultValues: {
            name: initialData?.name || '',
            address: initialData?.address || '',
            phone: initialData?.phone || '',
            email: initialData?.email || '',
        },
    });

    // 2. Submit Handler
    const onSubmit = async (data: CampusFormValues) => {
        setIsSubmitting(true);
        try {
            const url = campusId
                ? `/api/schools/${schoolId}/campuses/${campusId}`
                : `/api/schools/${schoolId}/campuses`;

            const method = campusId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                if (result.errors) {
                    // Map server-side Zod errors to the form
                    Object.entries(result.errors).forEach(([key, message]) => {
                        // @ts-ignore - dynamic key mapping
                        form.setError(key as keyof CampusFormValues, { 
                            type: 'server', 
                            message: message as string 
                        });
                    });
                    return;
                }
                throw new Error(result.error || 'Failed to save campus');
            }

            await refreshData();
            router.push(`/schools/${schoolId}/campuses`);
            router.refresh();
        } catch (error) {
            console.error(error);
            form.setError('root', {
                message: error instanceof Error ? error.message : 'An error occurred. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md border">
                
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
                            <FormLabel>Campus Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. North Campus" {...field} />
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
                                <Input placeholder="123 Main St" {...field} />
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

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="contact@campus.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-2 pt-2">
                    <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="flex-1"
                    >
                        {isSubmitting ? 'Saving...' : campusId ? 'Update Campus' : 'Add Campus'}
                    </Button>
                    
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/schools/${schoolId}/campuses`)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    );
}