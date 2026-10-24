'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Download,
  FileUp,
  GraduationCap,
  Loader2,
  Megaphone,
  Paperclip,
  Search,
  Send,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { useSidebar } from '@/contexts/SidebarContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListPagination } from '@/components/list-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Audience = 'EVERYONE' | 'STUDENTS_AND_PARENTS' | 'CLASS' | 'STUDENT';

type StudentOption = {
  id: string;
  name: string;
  schoolId: string;
  studentRecord?: {
    admissionNumber?: string | null;
    classId?: string | null;
    myClass?: { name: string } | null;
  } | null;
};

type InboxNotification = {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  audience: Audience;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
  readAt?: string | null;
  createdBy: { name: string };
  myClass?: { name: string } | null;
  targetStudent?: { name: string } | null;
};

type SentNotification = Omit<InboxNotification, 'recipientId' | 'readAt' | 'createdBy'> & {
  createdBy: { id: string; name: string };
  school: { id: string; name: string };
  recipientCount: number;
  readCount: number;
};

type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount?: number;
};

const audienceOptions: Array<{
  value: Audience;
  title: string;
  description: string;
  icon: typeof Bell;
}> = [
  {
    value: 'EVERYONE',
    title: 'Everyone',
    description: 'Every active login in this school',
    icon: Megaphone,
  },
  {
    value: 'STUDENTS_AND_PARENTS',
    title: 'Students & parents',
    description: 'All student and parent logins',
    icon: UsersRound,
  },
  {
    value: 'CLASS',
    title: 'One class',
    description: 'Students in a class and their parents',
    icon: GraduationCap,
  },
  {
    value: 'STUDENT',
    title: 'One student',
    description: 'One student and linked parents',
    icon: UserRound,
  },
];

const attachmentAccept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx';

function audienceLabel(notification: Pick<InboxNotification, 'audience' | 'myClass' | 'targetStudent'>) {
  if (notification.audience === 'EVERYONE') return 'Everyone';
  if (notification.audience === 'STUDENTS_AND_PARENTS') return 'Students & parents';
  if (notification.audience === 'CLASS') return notification.myClass?.name || 'Class';
  return notification.targetStudent?.name || 'Student & parents';
}

function fileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotificationCenter({
  canManage,
  currentSchoolId,
  userRole,
}: {
  canManage: boolean;
  currentSchoolId: string;
  userRole: string;
}) {
  const { schools } = useSidebar();
  const [activeTab, setActiveTab] = useState(canManage ? 'compose' : 'inbox');
  const [selectedSchoolId, setSelectedSchoolId] = useState(currentSchoolId);
  const [audience, setAudience] = useState<Audience>('STUDENTS_AND_PARENTS');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inbox, setInbox] = useState<InboxNotification[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const [sent, setSent] = useState<SentNotification[]>([]);
  const [sentLoading, setSentLoading] = useState(canManage);
  const [sentPage, setSentPage] = useState(1);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentSearch, setSentSearch] = useState('');
  const [debouncedSentSearch, setDebouncedSentSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<SentNotification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 12;

  const effectiveSchoolId = selectedSchoolId || currentSchoolId || schools[0]?.id || '';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const selectedSchool = schools.find((school) => school.id === effectiveSchoolId);
  const classes = useMemo(
    () =>
      (selectedSchool?.campuses || []).flatMap((campus) =>
        campus.classGroups.flatMap((group) =>
          (group.classes || []).map((item) => ({
            ...item,
            groupName: group.name,
          }))
        )
      ),
    [selectedSchool]
  );

  const selectedClass = classes.find((item) => item.id === classId);
  const selectedStudent = students.find((student) => student.id === studentId);
  const filteredStudents = classId
    ? students.filter((student) => student.studentRecord?.classId === classId)
    : students;

  const deliverySummary =
    audience === 'EVERYONE'
      ? `Every active login at ${selectedSchool?.name || 'the selected school'}`
      : audience === 'STUDENTS_AND_PARENTS'
        ? `All students and parents at ${selectedSchool?.name || 'the selected school'}`
        : audience === 'CLASS'
          ? selectedClass
            ? `${selectedClass.name} students and their linked parents`
            : 'Choose the class that should receive this notice'
          : selectedStudent
            ? `${selectedStudent.name} and linked parent logins`
            : 'Choose a student and their parents will be included';

  const fetchInbox = useCallback(async () => {
    const response = await fetch(`/api/notifications?page=${inboxPage}&pageSize=${pageSize}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load notifications');
    return payload as Paginated<InboxNotification>;
  }, [inboxPage]);

  const fetchSent = useCallback(async () => {
    const params = new URLSearchParams({
      manage: '1',
      page: String(sentPage),
      pageSize: String(pageSize),
    });
    if (effectiveSchoolId) params.set('schoolId', effectiveSchoolId);
    if (debouncedSentSearch) params.set('q', debouncedSentSearch);
    const response = await fetch(`/api/notifications?${params}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load sent notifications');
    return payload as Paginated<SentNotification>;
  }, [debouncedSentSearch, effectiveSchoolId, sentPage]);

  useEffect(() => {
    let ignore = false;
    void fetchInbox()
      .then((payload) => {
        if (ignore) return;
        setInbox(payload.data);
        setInboxTotal(payload.total);
        setUnreadCount(payload.unreadCount || 0);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Failed to load notifications');
      })
      .finally(() => {
        if (!ignore) setInboxLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [fetchInbox]);

  useEffect(() => {
    if (!canManage) return;
    let ignore = false;
    void fetchSent()
      .then((payload) => {
        if (ignore) return;
        setSent(payload.data);
        setSentTotal(payload.total);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Failed to load sent notifications');
      })
      .finally(() => {
        if (!ignore) setSentLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canManage, fetchSent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSentSearch(sentSearch.trim());
      setSentPage(1);
      setSentLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [sentSearch]);

  useEffect(() => {
    if (!canManage || audience !== 'STUDENT' || !effectiveSchoolId) return;
    let ignore = false;
    void fetch(`/api/notifications/targets?schoolId=${encodeURIComponent(effectiveSchoolId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Failed to load students');
        return (Array.isArray(payload.data) ? payload.data : []) as StudentOption[];
      })
      .then((items) => {
        if (!ignore) setStudents(items.filter((student) => student.schoolId === effectiveSchoolId));
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Failed to load students');
      })
      .finally(() => {
        if (!ignore) setStudentsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [audience, canManage, effectiveSchoolId]);

  const reloadSent = async () => {
    setSentLoading(true);
    try {
      const payload = await fetchSent();
      setSent(payload.data);
      setSentTotal(payload.total);
    } finally {
      setSentLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!effectiveSchoolId) return toast.error('Select a school');
    if (!title.trim()) return toast.error('Enter a notification title');
    if (!message.trim()) return toast.error('Enter a message');
    if (audience === 'CLASS' && !classId) return toast.error('Select a class');
    if (audience === 'STUDENT' && !studentId) return toast.error('Select a student');

    setSending(true);
    try {
      const body = new FormData();
      body.set('schoolId', effectiveSchoolId);
      body.set('audience', audience);
      body.set('title', title.trim());
      body.set('message', message.trim());
      if (audience === 'CLASS') body.set('classId', classId);
      if (audience === 'STUDENT') body.set('targetStudentId', studentId);
      if (attachment) body.set('attachment', attachment);

      const response = await fetch('/api/notifications', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to send notification');

      toast.success(payload.message || 'Notification sent');
      setTitle('');
      setMessage('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await reloadSent();
      setActiveTab('sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const markRead = async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
    if (!response.ok) return;
    setInbox((items) =>
      items.map((item) =>
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark notifications as read');
      setInbox((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/notifications/${pendingDelete.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to delete notification');
      toast.success('Notification deleted');
      setPendingDelete(null);
      await reloadSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content mx-auto w-full max-w-[1500px] space-y-6">
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the notification from every recipient&apos;s inbox and deletes its attachment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep notification</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteNotification();
              }}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleting ? 'Deleting…' : 'Delete notification'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-primary px-6 py-7 text-primary-foreground shadow-lg shadow-primary/10">
        <div className="absolute -right-8 -top-14 h-40 w-40 rounded-full border-[28px] border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <BellRing className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">School dispatch</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
              {canManage
                ? 'Send one clear update to the right school community and track who received it.'
                : 'Important school updates, class notices, and attachments arrive here.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
            <p className="text-xs text-primary-foreground/70">Unread in your inbox</p>
            <p className="font-heading text-3xl font-bold">{unreadCount}</p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid h-auto w-full rounded-xl bg-muted/70 p-1 ${canManage ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {canManage && (
            <TabsTrigger value="compose" className="cursor-pointer gap-2 rounded-lg">
              <Send className="h-4 w-4" /> Compose
            </TabsTrigger>
          )}
          {canManage && (
            <TabsTrigger value="sent" className="cursor-pointer gap-2 rounded-lg">
              <Megaphone className="h-4 w-4" /> Sent
            </TabsTrigger>
          )}
          <TabsTrigger value="inbox" className="cursor-pointer gap-2 rounded-lg">
            <Bell className="h-4 w-4" /> Inbox
            {unreadCount > 0 && <Badge className="ml-1 h-5 min-w-5 justify-center px-1.5">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {canManage && (
          <TabsContent value="compose" className="mt-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <Card className="gap-5">
                <CardHeader>
                  <CardTitle>Write the notice</CardTitle>
                  <CardDescription>Keep the title scannable and put the action or deadline in the message.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {isSuperAdmin && (
                    <div className="space-y-2">
                      <Label>School</Label>
                      <Select
                        value={effectiveSchoolId}
                        onValueChange={(value) => {
                          setSelectedSchoolId(value);
                          setClassId('');
                          setStudentId('');
                          if (audience === 'STUDENT') setStudentsLoading(true);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                        <SelectContent>
                          {schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notification-title">Title</Label>
                    <Input
                      id="notification-title"
                      maxLength={120}
                      placeholder="e.g. Winter break schedule"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                    <p className="text-right text-xs text-muted-foreground">{title.length}/120</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-message">Message</Label>
                    <Textarea
                      id="notification-message"
                      maxLength={5000}
                      className="min-h-44 resize-y"
                      placeholder="Write the complete announcement, date, and next step…"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                    <p className="text-right text-xs text-muted-foreground">{message.length}/5000</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-attachment">Attachment <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <label
                      htmlFor="notification-attachment"
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-muted/35 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="rounded-lg bg-card p-2 text-primary shadow-sm"><FileUp className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{attachment?.name || 'Choose a file'}</span>
                          <span className="block text-xs text-muted-foreground">PDF, image, Word, or Excel · max 8 MB</span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-primary">Browse</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="notification-attachment"
                      type="file"
                      accept={attachmentAccept}
                      className="sr-only"
                      onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <Card className="gap-4">
                  <CardHeader>
                    <CardTitle>Choose recipients</CardTitle>
                    <CardDescription>Parent logins are automatically included for class and student notices.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {audienceOptions.map((option) => {
                      const Icon = option.icon;
                      const selected = audience === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setAudience(option.value);
                            setStudentId('');
                            if (option.value === 'STUDENT') setStudentsLoading(true);
                          }}
                          className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                            selected ? 'border-primary bg-primary/8 ring-2 ring-primary/10' : 'border-border hover:bg-muted/60'
                          }`}
                        >
                          <span className={`mt-0.5 rounded-lg p-2 ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{option.title}</span>
                            <span className="block text-xs leading-5 text-muted-foreground">{option.description}</span>
                          </span>
                          {selected && <Check className="mt-2 h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}

                    {(audience === 'CLASS' || audience === 'STUDENT') && (
                      <div className="space-y-2 pt-2">
                        <Label>Class {audience === 'STUDENT' && <span className="font-normal text-muted-foreground">(filter)</span>}</Label>
                        <Select
                          value={audience === 'STUDENT' ? classId || 'ALL' : classId}
                          onValueChange={(value) => { setClassId(value === 'ALL' ? '' : value); setStudentId(''); }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                          <SelectContent>
                            {audience === 'STUDENT' && <SelectItem value="ALL">All classes</SelectItem>}
                            {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {audience === 'STUDENT' && (
                      <div className="space-y-2">
                        <Label>Student</Label>
                        <Select value={studentId} onValueChange={setStudentId} disabled={studentsLoading}>
                          <SelectTrigger><SelectValue placeholder={studentsLoading ? 'Loading students…' : 'Select student'} /></SelectTrigger>
                          <SelectContent>
                            {filteredStudents.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name}{student.studentRecord?.myClass?.name ? ` · ${student.studentRecord.myClass.name}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="rounded-2xl bg-foreground p-5 text-background shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/55">Delivery route</p>
                  <p className="mt-2 font-heading text-lg font-semibold leading-snug">{deliverySummary}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-background/65">
                    <CheckCheck className="h-4 w-4" /> Read status will be tracked per login
                  </div>
                </div>

                <Button className="h-11 w-full gap-2" disabled={sending} onClick={() => void sendNotification()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send notification'}
                </Button>
              </div>
            </div>
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="sent" className="mt-5 space-y-4">
            <Card className="gap-0 overflow-hidden py-0">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Sent notifications</h2>
                  <p className="text-sm text-muted-foreground">{sentTotal} notification{sentTotal === 1 ? '' : 's'} sent</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search sent notifications…" value={sentSearch} onChange={(event) => setSentSearch(event.target.value)} />
                </div>
              </div>
              <div className="divide-y divide-border">
                {sentLoading ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">Loading sent notifications…</div>
                ) : sent.length === 0 ? (
                  <EmptyState className="border-0 py-16" title="No notifications sent" description="Compose your first school update to see its delivery status here." />
                ) : sent.map((item) => (
                  <article key={item.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_12rem_8rem_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <Badge variant="outline">{audienceLabel(item)}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">By {item.createdBy.name} · {format(new Date(item.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p className="mt-1 text-sm font-semibold">{item.recipientCount} logins</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Read</p>
                      <p className="mt-1 text-sm font-semibold">{item.readCount} / {item.recipientCount}</p>
                    </div>
                    <div className="flex items-center gap-2 lg:justify-end">
                      {item.attachmentName && (
                        <Button asChild variant="outline" size="icon" title={`Download ${item.attachmentName}`}>
                          <a href={`/api/notifications/${item.id}/attachment`}><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete(item)} title="Delete notification">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
            <ListPagination page={sentPage} pageSize={pageSize} total={sentTotal} onPageChange={(nextPage) => { setSentLoading(true); setSentPage(nextPage); }} disabled={sentLoading} />
          </TabsContent>
        )}

        <TabsContent value="inbox" className="mt-5 space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-semibold">Your inbox</h2>
              <p className="text-sm text-muted-foreground">Updates sent to your login and school groups.</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" className="gap-2" disabled={markingAll} onClick={() => void markAllRead()}>
                {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Mark all as read
              </Button>
            )}
          </div>

          {inboxLoading ? (
            <Card className="py-16 text-center text-sm text-muted-foreground">Loading your inbox…</Card>
          ) : inbox.length === 0 ? (
            <EmptyState title="Your inbox is clear" description="New school and class notifications will appear here." />
          ) : (
            <div className="space-y-3">
              {inbox.map((item) => {
                const unread = !item.readAt;
                return (
                  <article
                    key={item.recipientId}
                    className={`rounded-2xl border p-5 shadow-sm transition-colors ${unread ? 'border-primary/30 bg-primary/[0.045]' : 'border-border bg-card'}`}
                  >
                    <div className="flex gap-4">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
                              {unread && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                              <Badge variant="outline">{audienceLabel(item)}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.createdBy.name} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {unread && (
                            <Button variant="ghost" size="sm" className="shrink-0 gap-2" onClick={() => void markRead(item.id)}>
                              <Check className="h-4 w-4" /> Mark read
                            </Button>
                          )}
                        </div>
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{item.message}</p>
                        {item.attachmentName && (
                          <a
                            href={`/api/notifications/${item.id}/attachment`}
                            className="mt-4 inline-flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                            onClick={() => unread && void markRead(item.id)}
                          >
                            <Paperclip className="h-4 w-4 text-primary" />
                            <span className="font-medium">{item.attachmentName}</span>
                            <span className="text-xs text-muted-foreground">{fileSize(item.attachmentSize)}</span>
                            <Download className="ml-1 h-4 w-4 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <ListPagination page={inboxPage} pageSize={pageSize} total={inboxTotal} onPageChange={(nextPage) => { setInboxLoading(true); setInboxPage(nextPage); }} disabled={inboxLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
