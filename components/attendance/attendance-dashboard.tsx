'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Clock, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getSectionStudents, getAttendanceByDate, saveAttendance } from '@/lib/actions/attendance';
import { AttendanceStatus } from '@prisma/client';

interface AttendanceDashboardProps {
  initialSections: any[];
  userId: string;
}

interface StudentAttendance {
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
  user: {
    id: string;
    name: string;
    profilePath: string | null;
  };
}

export default function AttendanceDashboard({ initialSections, userId }: AttendanceDashboardProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSections.length > 0 ? initialSections[0].id : ''
  );
  const [date, setDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });
  const [isToday, setIsToday] = useState<boolean>(true);

  useEffect(() => {
    if (selectedSectionId) {
      fetchData();
    }
  }, [selectedSectionId, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const isSelectedDateToday = date.toDateString() === today.toDateString();
      setIsToday(isSelectedDateToday);

      const [fetchedStudents, fetchedAttendance] = await Promise.all([
        getSectionStudents(selectedSectionId),
        getAttendanceByDate(selectedSectionId, date),
      ]);

      const mergedData = fetchedStudents.map((student) => {
        const record = fetchedAttendance.find((a) => a.studentId === student.userId);
        return {
          studentId: student.userId,
          status: record ? record.status : AttendanceStatus.PRESENT, // Default to Present
          remarks: record ? record.remarks || '' : '',
          user: student.user,
        };
      });

      setStudents(mergedData);
      calculateStats(mergedData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: StudentAttendance[]) => {
    const counts = data.reduce(
      (acc, curr) => {
        acc[curr.status.toLowerCase() as keyof typeof acc]++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
    setStats(counts);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    const updated = students.map((s) =>
      s.studentId === studentId ? { ...s, status } : s
    );
    setStudents(updated);
    calculateStats(updated);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    const updated = students.map((s) =>
      s.studentId === studentId ? { ...s, remarks } : s
    );
    setStudents(updated);
  };

  const markAllPresent = () => {
    const updated = students.map((s) => ({ ...s, status: AttendanceStatus.PRESENT }));
    setStudents(updated);
    calculateStats(updated);
  };

  const handleSave = async () => {
    if (!isToday) {
      toast.error('Cannot save attendance for past dates. You can only mark attendance for today.');
      return;
    }

    try {
      const records = students.map((s) => ({
        studentId: s.studentId,
        status: s.status,
        remarks: s.remarks,
      }));
      await saveAttendance(selectedSectionId, date, records, userId);
      toast.success('Attendance saved successfully');
    } catch (error) {
      toast.error('Failed to save attendance');
    }
  };

  if (initialSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold">No Classes Found</h2>
        <p className="text-gray-500">You are not in charge of any classes.</p>
      </div>
    );
  }

  const selectedSection = initialSections.find((s) => s.id === selectedSectionId);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-500">
            Record and monitor student attendance for{' '}
            <span className="font-semibold text-gray-900">
              {selectedSection?.myClass?.name} ({selectedSection?.name})
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {initialSections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.myClass.name} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!isToday}>
            <Save className="mr-2 h-4 w-4" /> Save Attendance
          </Button>
        </div>
      </div>

      {!isToday && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Viewing Past Attendance</p>
                <p className="text-sm text-orange-600">You can only mark attendance for today's date. Select today's date to save attendance.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards & Student List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500">Present</div>
                <div className="text-3xl font-bold text-green-600">{stats.present}</div>
                <div className="text-xs text-gray-400 mt-1">
                    {students.length > 0 ? Math.round((stats.present / students.length) * 100) : 0}% of class
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500">Absent</div>
                <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500">Late</div>
                <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Student List ({students.length})</CardTitle>
              <Button variant="ghost" className="text-blue-600 hover:text-blue-800 text-sm" onClick={markAllPresent}>
                Mark All Present
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                 <div className="flex justify-center p-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div
                      key={student.studentId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={student.user.profilePath || ''} />
                          <AvatarFallback>{student.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{student.user.name}</p>
                          <p className="text-sm text-gray-500">ID: {student.studentId.slice(-6)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-md ${
                              student.status === AttendanceStatus.PRESENT
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            onClick={() => handleStatusChange(student.studentId, AttendanceStatus.PRESENT)}
                            title="Present"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-md ${
                              student.status === AttendanceStatus.ABSENT
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            onClick={() => handleStatusChange(student.studentId, AttendanceStatus.ABSENT)}
                            title="Absent"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-md ${
                              student.status === AttendanceStatus.LATE
                                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            onClick={() => handleStatusChange(student.studentId, AttendanceStatus.LATE)}
                            title="Late"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Add a note..."
                          value={student.remarks}
                          onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                          className="w-[200px] text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                className="rounded-md border"
              />
              <div className="mt-4 text-center">
                 <Button variant="link" className="text-blue-600">View Full Calendar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-600 text-white">
             <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">Next Class</h3>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <p className="font-medium">{selectedSection?.myClass?.name} - {selectedSection?.name}</p>
                        <p className="text-sm text-blue-100">Grade {selectedSection?.myClass?.name}</p>
                    </div>
                </div>
                 <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">
                    View Roster
                 </Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
