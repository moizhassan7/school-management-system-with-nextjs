import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import {
    Plus,
    Pencil,
    Trash2,
    ArrowLeft,
    Building2,
    MapPin,
    Phone,
    Mail,
    Layers
} from 'lucide-react';

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
        <div className="container max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link href={`/schools/${schoolId}/campuses`}>
                        <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-2">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campuses
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{campus.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{campus.school.name} ({campus.school.initials})</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/schools/${schoolId}/campuses/${campusId}/edit`}>
                        <Button variant="outline">
                            <Pencil className="mr-2 h-4 w-4" /> Edit Campus
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Campus Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Details and contact info for this campus.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Address
                        </p>
                        <p className="text-base font-medium">{campus.address}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-muted-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4" /> Phone
                        </p>
                        <p className="text-base font-medium">{campus.phone}</p>
                    </div>
                    {campus.email && (
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Email
                            </p>
                            <p className="text-base font-medium">{campus.email}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Class Groups Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Class Groups</h2>
                        <p className="text-muted-foreground">Manage academic streams and grade levels.</p>
                    </div>
                    <Link href={`/schools/${schoolId}/campuses/${campusId}/class-groups/new`}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Class Group
                        </Button>
                    </Link>
                </div>

                {campus.classGroups.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                        <div className="rounded-full bg-muted/50 p-4 mb-4">
                            <Layers className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No class groups created</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            Class groups organize students into streams (e.g., Primary, Grade 9-10). Add one to get started.
                        </p>
                        <Link href={`/schools/${schoolId}/campuses/${campusId}/class-groups/new`}>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Create Class Group
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {campus.classGroups.map((classGroup) => (
                            <Card key={classGroup.id} className="flex flex-col hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Layers className="h-5 w-5 text-indigo-600" />
                                            {classGroup.name}
                                        </CardTitle>
                                    </div>
                                    {classGroup.description && (
                                        <CardDescription className="line-clamp-2 mt-2">
                                            {classGroup.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {/* Future stats can go here */}
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex gap-2 justify-end">
                                    <Link 
                                        href={`/schools/${schoolId}/campuses/${campusId}/class-groups/${classGroup.id}/edit`}
                                        className="flex-1"
                                    >
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                        </Button>
                                    </Link>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}