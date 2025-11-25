import { notFound } from 'next/navigation';
import { ClassGroupForm } from '@/components/class-group-form';
import { prisma } from '@/lib/prisma';

export default async function EditClassGroupPage({
    params,
}: {
    params: Promise<{ schoolId: string; campusId: string; classGroupId: string }>;
}) {
    const { schoolId, campusId, classGroupId } = await params;
    const classGroup = await prisma.classGroup.findFirst({
        where: {
            id: classGroupId,
            campusId: campusId,
        },
    });

    if (!classGroup) {
        notFound();
    }

    return (
        <div className="container mx-auto py-8">
            <ClassGroupForm
                schoolId={schoolId}
                campusId={campusId}
                initialData={classGroup}
            />
        </div>
    );
}
