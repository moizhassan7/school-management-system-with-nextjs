import StudentForm from '@/components/student-form';

export default function NewStudentPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <StudentForm />
            </div>
        </div>
    );
}
