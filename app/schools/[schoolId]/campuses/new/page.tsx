import CampusForm from '@/components/campus-form';
import { use } from 'react';

export default function NewCampusPage({ params }: { params: Promise<{ schoolId: string }> }) {
    const { schoolId } = use(params);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">Add New Campus</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter the details of the campus you want to add.
                    </p>
                </div>
                <CampusForm schoolId={schoolId} />
            </div>
        </div>
    );
}
