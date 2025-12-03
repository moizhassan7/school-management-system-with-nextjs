import { ClassGroupForm } from '@/components/class-group-form';
import { Card } from '@/components/ui/card'; // Import Card component

export default async function NewClassGroupPage({
    params,
}: {
    params: Promise<{ schoolId: string; campusId: string }>;
}) {
    const { schoolId, campusId } = await params;
    return (
        // Layout adjusted to vertically center the Card, similar to other new forms
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* The ClassGroupForm already contains the Card structure internally, 
                but wrapping it ensures the page layout is correctly centered. 
                If ClassGroupForm was a simple form, you'd wrap it in CardHeader/Content here.
            */}
            <div className="w-full max-w-2xl">
                <ClassGroupForm schoolId={schoolId} campusId={campusId} />
            </div>
        </div>
    );
}