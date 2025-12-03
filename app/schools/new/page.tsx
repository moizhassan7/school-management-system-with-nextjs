import SchoolForm from '@/components/school-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewSchoolPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-extrabold text-gray-900">
                        Add New School
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Enter the details of the school you want to add to the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SchoolForm />
                </CardContent>
            </Card>
        </div>
    );
}