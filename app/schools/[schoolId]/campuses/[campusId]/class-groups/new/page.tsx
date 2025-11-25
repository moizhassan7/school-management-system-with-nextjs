import { ClassGroupForm } from '@/components/class-group-form';

export default async function NewClassGroupPage({
    params,
}: {
    params: Promise<{ schoolId: string; campusId: string }>;
}) {
    const { schoolId, campusId } = await params;
    return (
        <div className="container mx-auto py-8">
            <ClassGroupForm schoolId={schoolId} campusId={campusId} />
        </div>
    );
}
