import CampusForm from '@/components/campus-form';
import { use } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewCampusPage({ params }: { params: Promise<{ schoolId: string }> }) {
    const { schoolId } = use(params);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-extrabold text-gray-900">
                        Add New Campus
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Enter the details of the campus you want to add.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CampusForm schoolId={schoolId} />
                </CardContent>
            </Card>
        </div>
    );
}