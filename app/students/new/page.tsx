import StudentForm from '@/components/student-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewStudentPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900">New Student Admission</h1>
                        <p className="text-sm text-muted-foreground">Complete the form below to enroll a new student.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/students">
                            <Button variant="outline">Cancel</Button>
                        </Link>
                        <Button type="submit" form="student-admission-form">Submit Admission</Button>
                    </div>
                </div>
                
                <StudentForm />
            </div>
        </div>
    );
}
