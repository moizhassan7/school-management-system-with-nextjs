import { GraduationCap } from "lucide-react";

interface ReportCardProps {
    student: any;
    examName: string;
    className: string;
}

export default function PrintableReportCard({ student, examName, className }: ReportCardProps) {
    return (
        <div className="p-8 bg-white text-black print:p-0" id="report-card">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex justify-center mb-2">
                    <GraduationCap className="h-12 w-12" />
                </div>
                <h1 className="text-3xl font-bold uppercase tracking-widest">Moiz School System</h1>
                <p className="text-sm text-gray-600">Excellence in Education</p>
                <div className="mt-4 bg-gray-900 text-white py-1 w-full max-w-xs mx-auto rounded-full">
                    <h2 className="text-lg font-semibold">{examName} Result Card</h2>
                </div>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm mb-8">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-bold text-gray-500">Student Name:</span>
                    <span className="font-semibold">{student.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-bold text-gray-500">Admission No:</span>
                    <span className="font-mono">{student.admissionNo}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-bold text-gray-500">Class:</span>
                    <span>{className}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                    <span className="font-bold text-gray-500">Date:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Marks Table */}
            <table className="w-full text-sm mb-8 border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Subject</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Max Marks</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Pass Marks</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Obtained</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {student.subjects.map((sub: any, i: number) => (
                        <tr key={i}>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{sub.subjectName}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{sub.maxMarks}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{sub.passMarks}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center font-bold">{sub.obtained}</td>
                            <td className={`border border-gray-300 px-4 py-2 text-center font-bold ${sub.status === 'FAIL' ? 'text-red-600' : 'text-green-600'}`}>
                                {sub.status}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-50 font-bold">
                        <td className="border border-gray-300 px-4 py-2">TOTAL</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.summary.totalMax}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.summary.totalObtained}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{student.summary.percentage}%</td>
                    </tr>
                </tfoot>
            </table>

            {/* Footer Summary */}
            <div className="flex justify-between items-end mt-12">
                <div className="text-center">
                    <div className="text-4xl font-bold mb-1">{student.summary.grade}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Final Grade</div>
                </div>
                
                <div className="flex gap-12">
                    <div className="text-center">
                        <div className="w-32 border-b border-gray-400 mb-1"></div>
                        <div className="text-xs text-gray-500">Class Teacher</div>
                    </div>
                    <div className="text-center">
                        <div className="w-32 border-b border-gray-400 mb-1"></div>
                        <div className="text-xs text-gray-500">Principal</div>
                    </div>
                </div>
            </div>
        </div>
    );
}