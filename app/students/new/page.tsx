import StudentForm from '@/components/student-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewStudentPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/students">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">New Student Admission</h1>
                        <p className="text-sm text-muted-foreground">
                            Create a student profile, academic record, and assign initial session.
                        </p>
                    </div>
                </div>
                
                <StudentForm />
            </div>
        </div>
    );
}