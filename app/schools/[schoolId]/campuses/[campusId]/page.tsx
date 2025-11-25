import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

export default async function CampusDetailPage({
    params,
}: {
    params: Promise<{ schoolId: string; campusId: string }>;
}) {
    const { schoolId, campusId } = await params;
    const campus = await prisma.campus.findUnique({
        where: { id: campusId },
        include: {
            school: true,
            classGroups: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!campus) {
        notFound();
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Campus Information */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-3xl">{campus.name}</CardTitle>
                            <CardDescription className="text-lg mt-2">
                                {campus.school.name} ({campus.school.initials})
                            </CardDescription>
                        </div>
                        <Link href={`/schools/${schoolId}/campuses/${campusId}/edit`}>
                            <Button variant="outline">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Campus
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Address</p>
                            <p className="text-base">{campus.address}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Phone</p>
                            <p className="text-base">{campus.phone}</p>
                        </div>
                        {campus.email && (
                            <div>
                                <p className="text-sm font-medium text-gray-500">Email</p>
                                <p className="text-base">{campus.email}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Class Groups Section */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl">Class Groups</CardTitle>
                            <CardDescription className="mt-2">
                                Manage class groups for this campus
                            </CardDescription>
                        </div>
                        <Link href={`/schools/${schoolId}/campuses/${campusId}/class-groups/new`}>
                            <Button>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Class Group
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {campus.classGroups.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 mb-4">No class groups yet</p>
                            <Link href={`/schools/${schoolId}/campuses/${campusId}/class-groups/new`}>
                                <Button>
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Create First Class Group
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {campus.classGroups.map((classGroup) => (
                                <Card key={classGroup.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{classGroup.name}</CardTitle>
                                        {classGroup.description && (
                                            <CardDescription>{classGroup.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/schools/${schoolId}/campuses/${campusId}/class-groups/${classGroup.id}/edit`}
                                                className="flex-1"
                                            >
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <Edit className="h-3 w-3 mr-2" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
