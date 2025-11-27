import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
export default function Home() {
    return (
     <main>
          <h1 className="text-2xl font-bold p-4">Welcome to School Management System</h1>
          <p className="text-gray-500 p-4">Search for schools, campuses, classes, and students</p>
          <div className="flex items-center gap-2 p-4">
            <Input placeholder="Search" className="flex-1" />
            <Search className="w-6 h-6" />
          </div>
     </main>
    );
}
