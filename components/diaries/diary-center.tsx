'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookCheck,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileUp,
  GraduationCap,
  Loader2,
  NotebookPen,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserCheck,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

type DiaryStatus = 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED';

type Assignment = {
  classId: string;
  subjectId: string;
  myClass: { id: string; name: string };
  subject: { id: string; name: string; code?: string | null };
};

type Diary = {
  id: string;
  title: string;
  message: string;
  diaryDate: string;
  dueDate?: string | null;
  status: DiaryStatus;
  rejectionReason?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
  school: { id: string; name: string };
  myClass: { id: string; name: string };
  subject: { id: string; name: string; code?: string | null };
};

type DiaryResponse = {
  data: Diary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const attachmentAccept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx';

function statusBadge(status: DiaryStatus) {
  if (status === 'PUBLISHED') {
    return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 shadow-none"><CheckCircle2 className="mr-1 h-3 w-3" />Published</Badge>;
  }
  if (status === 'REJECTED') {
    return <Badge className="border-red-200 bg-red-100 text-red-700 shadow-none"><XCircle className="mr-1 h-3 w-3" />Changes requested</Badge>;
  }
  return <Badge className="border-amber-200 bg-amber-100 text-amber-700 shadow-none"><Clock3 className="mr-1 h-3 w-3" />Awaiting approval</Badge>;
}

function fileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DiaryCard({
  diary,
  canApprove,
  canDelete,
  userRole,
  reviewing,
  onPublish,
  onReject,
  onDelete,
}: {
  diary: Diary;
  canApprove: boolean;
  canDelete: boolean;
  userRole: string;
  reviewing: boolean;
  onPublish: (diary: Diary) => void;
  onReject: (diary: Diary) => void;
  onDelete: (diary: Diary) => void;
}) {
  const diaryDate = new Date(diary.diaryDate);
  const teacherMayDelete = userRole === 'TEACHER' && diary.status !== 'PUBLISHED';
  const showDelete = canDelete && (userRole !== 'TEACHER' || teacherMayDelete);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid md:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="flex items-center gap-3 border-b border-border bg-primary/7 px-5 py-4 md:flex-col md:justify-center md:border-b-0 md:border-r md:text-center">
          <span className="font-heading text-3xl font-bold text-primary">{format(diaryDate, 'dd')}</span>
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">{format(diaryDate, 'MMM yyyy')}</span>
        </div>
        <div className="p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-lg font-semibold text-foreground">{diary.title}</h3>
                {statusBadge(diary.status)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{diary.myClass.name}</span>
                <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{diary.subject.name}</span>
                <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />{diary.createdBy.name}</span>
                {diary.dueDate && <span className="inline-flex items-center gap-1.5 font-medium text-foreground"><CalendarDays className="h-3.5 w-3.5" />Due {format(new Date(diary.dueDate), 'MMM d')}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {diary.attachmentName && (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={`/api/diaries/${diary.id}/attachment`}><Download className="h-4 w-4" />Attachment</a>
                </Button>
              )}
              {canApprove && diary.status !== 'PUBLISHED' && (
                <>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={reviewing} onClick={() => onReject(diary)}>
                    <RotateCcw className="h-4 w-4" />Request changes
                  </Button>
                  <Button size="sm" className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700" disabled={reviewing} onClick={() => onPublish(diary)}>
                    {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {reviewing ? 'Posting…' : 'Approve & post'}
                  </Button>
                </>
              )}
              {showDelete && (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={reviewing} onClick={() => onDelete(diary)} title="Delete diary">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{diary.message}</p>

          {diary.attachmentName && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">{diary.attachmentName}</span>
              <span>{fileSize(diary.attachmentSize)}</span>
            </div>
          )}

          {diary.status === 'REJECTED' && diary.rejectionReason && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Admin feedback</p>
              <p className="mt-1">{diary.rejectionReason}</p>
            </div>
          )}

          {diary.status === 'PUBLISHED' && diary.approvedBy && (
            <p className="mt-4 text-xs text-muted-foreground">Approved by {diary.approvedBy.name}{diary.publishedAt ? ` · ${format(new Date(diary.publishedAt), 'MMM d, yyyy · h:mm a')}` : ''}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function DiaryCenter({
  userRole,
  canCreate,
  canApprove,
  canDelete,
}: {
  userRole: string;
  canCreate: boolean;
  canApprove: boolean;
  canDelete: boolean;
}) {
  const teacherView = userRole === 'TEACHER';
  const adminView = canApprove;
  const familyView = ['STUDENT', 'PARENT'].includes(userRole);
  const initialTab = teacherView ? 'compose' : adminView ? 'pending' : 'feed';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(teacherView);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [diaryDate, setDiaryDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<Diary | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Diary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 12;

  const classes = useMemo(() => {
    const byId = new Map<string, Assignment['myClass']>();
    for (const assignment of assignments) byId.set(assignment.classId, assignment.myClass);
    return [...byId.values()];
  }, [assignments]);
  const subjects = assignments.filter((assignment) => assignment.classId === classId);

  const statusFilter = adminView
    ? activeTab === 'pending' ? 'PENDING_APPROVAL' : activeTab === 'published' ? 'PUBLISHED' : 'ALL'
    : teacherView && activeTab === 'submissions' ? 'ALL' : familyView ? 'PUBLISHED' : 'ALL';

  const fetchDiaries = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status: statusFilter,
    });
    if (debouncedSearch) params.set('q', debouncedSearch);
    const response = await fetch(`/api/diaries?${params}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Failed to load diaries');
    return payload as DiaryResponse;
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    if (!teacherView || !canCreate) return;
    let ignore = false;
    void fetch('/api/diaries/assignments', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Failed to load assignments');
        return (Array.isArray(payload.data) ? payload.data : []) as Assignment[];
      })
      .then((items) => {
        if (!ignore) setAssignments(items);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Failed to load assignments');
      })
      .finally(() => {
        if (!ignore) setAssignmentsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canCreate, teacherView]);

  useEffect(() => {
    if (teacherView && activeTab === 'compose') return;
    let ignore = false;
    void fetchDiaries()
      .then((payload) => {
        if (ignore) return;
        setDiaries(payload.data);
        setTotal(payload.total);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Failed to load diaries');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activeTab, fetchDiaries, teacherView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
      setLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const reloadDiaries = async () => {
    setLoading(true);
    try {
      const payload = await fetchDiaries();
      setDiaries(payload.data);
      setTotal(payload.total);
    } finally {
      setLoading(false);
    }
  };

  const submitDiary = async () => {
    if (!classId || !subjectId) return toast.error('Select your assigned class and subject');
    if (!title.trim()) return toast.error('Enter a diary title');
    if (!message.trim()) return toast.error('Enter the homework details');
    if (dueDate && dueDate < diaryDate) return toast.error('Due date cannot be before the diary date');

    setSubmitting(true);
    try {
      const body = new FormData();
      body.set('classId', classId);
      body.set('subjectId', subjectId);
      body.set('title', title.trim());
      body.set('message', message.trim());
      body.set('diaryDate', diaryDate);
      body.set('dueDate', dueDate);
      if (attachment) body.set('attachment', attachment);

      const response = await fetch('/api/diaries', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to submit diary');
      toast.success(payload.message || 'Diary submitted for approval');
      setTitle('');
      setMessage('');
      setDueDate('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('submissions');
      setLoading(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit diary');
    } finally {
      setSubmitting(false);
    }
  };

  const publishDiary = async (diary: Diary) => {
    setReviewingId(diary.id);
    try {
      const response = await fetch(`/api/diaries/${diary.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PUBLISH' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to publish diary');
      toast.success(payload.message || 'Diary approved and posted');
      await reloadDiaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish diary');
    } finally {
      setReviewingId(null);
    }
  };

  const rejectDiary = async () => {
    if (!pendingReject || rejectionReason.trim().length < 3) return;
    setReviewingId(pendingReject.id);
    try {
      const response = await fetch(`/api/diaries/${pendingReject.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: rejectionReason.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to return diary');
      toast.success(payload.message || 'Diary returned to teacher');
      setPendingReject(null);
      setRejectionReason('');
      await reloadDiaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to return diary');
    } finally {
      setReviewingId(null);
    }
  };

  const deleteDiary = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/diaries/${pendingDelete.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to delete diary');
      toast.success('Diary deleted');
      setPendingDelete(null);
      await reloadDiaries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete diary');
    } finally {
      setDeleting(false);
    }
  };

  const listContent = (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-semibold">
            {adminView && activeTab === 'pending' ? 'Waiting for approval' : adminView && activeTab === 'published' ? 'Published diaries' : teacherView ? 'My submissions' : 'Class homework'}
          </h2>
          <p className="text-sm text-muted-foreground">{total} diar{total === 1 ? 'y' : 'ies'}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search homework…" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {loading ? (
        <Card className="py-16 text-center text-sm text-muted-foreground">Loading diaries…</Card>
      ) : diaries.length === 0 ? (
        <EmptyState
          title={adminView && activeTab === 'pending' ? 'Approval queue is clear' : 'No homework diaries found'}
          description={adminView && activeTab === 'pending' ? 'New teacher submissions will appear here.' : 'There are no diary entries matching this view yet.'}
        />
      ) : (
        <div className="space-y-3">
          {diaries.map((diary) => (
            <DiaryCard
              key={diary.id}
              diary={diary}
              canApprove={canApprove}
              canDelete={canDelete}
              userRole={userRole}
              reviewing={reviewingId === diary.id}
              onPublish={(item) => void publishDiary(item)}
              onReject={(item) => { setPendingReject(item); setRejectionReason(''); }}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}
      <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={(nextPage) => { setPage(nextPage); setLoading(true); }} disabled={loading} />
    </div>
  );

  return (
    <div className="page-content mx-auto w-full max-w-[1500px] space-y-6">
      <AlertDialog open={Boolean(pendingReject)} onOpenChange={(open) => !open && !reviewingId && setPendingReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request changes from {pendingReject?.createdBy.name}?</AlertDialogTitle>
            <AlertDialogDescription>Explain what needs to be corrected before this diary can be posted.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea className="min-h-28" placeholder="Write clear feedback for the teacher…" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(reviewingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(reviewingId) || rejectionReason.trim().length < 3}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); void rejectDiary(); }}
            >
              {reviewingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Return to teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.status === 'PUBLISHED'
                ? 'This also removes the posted notification from every student and parent inbox.'
                : 'This permanently removes the diary submission and its attachment.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep diary</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); void deleteDiary(); }}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleting ? 'Deleting…' : 'Delete diary'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-[linear-gradient(120deg,hsl(var(--card)),hsl(var(--secondary)))] px-6 py-7 shadow-sm">
        <div className="absolute -right-8 top-0 h-full w-40 rotate-6 border-l border-amber-300/30 bg-[repeating-linear-gradient(0deg,transparent,transparent_23px,rgba(217,119,6,0.08)_24px)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700">
              <NotebookPen className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Home learning ledger</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-foreground">Homework diary</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {teacherView
                ? 'Write homework only for the classes and subjects assigned to you. Admin approval publishes it to families.'
                : adminView
                  ? 'Review teacher submissions, then approve and post to every student and linked parent in one step.'
                  : 'Daily homework and teacher instructions for your class are collected here.'}
            </p>
          </div>
          {(teacherView || adminView) && (
            <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 rounded-2xl border border-border bg-card/85 p-3 text-xs shadow-sm backdrop-blur-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-bold text-primary">1</span><span>Teacher submits</span>
              <span className="h-px bg-border" />
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-bold text-primary">2</span><span>Admin posts</span>
              <span className="col-start-3 h-px bg-border" />
              <span className="col-start-4 flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-bold text-primary">3</span><span>Families receive</span>
            </div>
          )}
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setPage(1); setLoading(true); }}>
        {teacherView && (
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="compose" className="cursor-pointer gap-2 rounded-lg"><NotebookPen className="h-4 w-4" />Write diary</TabsTrigger>
            <TabsTrigger value="submissions" className="cursor-pointer gap-2 rounded-lg"><Clock3 className="h-4 w-4" />My submissions</TabsTrigger>
          </TabsList>
        )}
        {adminView && (
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="pending" className="cursor-pointer gap-2 rounded-lg"><Clock3 className="h-4 w-4" />Approval queue</TabsTrigger>
            <TabsTrigger value="published" className="cursor-pointer gap-2 rounded-lg"><BookCheck className="h-4 w-4" />Published</TabsTrigger>
            <TabsTrigger value="history" className="cursor-pointer gap-2 rounded-lg"><BookOpen className="h-4 w-4" />All diaries</TabsTrigger>
          </TabsList>
        )}

        {teacherView && (
          <TabsContent value="compose" className="mt-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <Card className="gap-5">
                <CardHeader>
                  <CardTitle>Today&apos;s class work</CardTitle>
                  <CardDescription>Choose one of your assigned class-subject pairs and write the work clearly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {assignmentsLoading ? (
                    <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Loading your assignments…</div>
                  ) : assignments.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No class-subject assignment is linked to your staff profile. Ask an administrator to add one first.</div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select value={classId} onValueChange={(value) => { setClassId(value); setSubjectId(''); }}>
                          <SelectTrigger><SelectValue placeholder="Select assigned class" /></SelectTrigger>
                          <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
                          <SelectTrigger><SelectValue placeholder="Select assigned subject" /></SelectTrigger>
                          <SelectContent>{subjects.map((item) => <SelectItem key={item.subjectId} value={item.subjectId}>{item.subject.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="diary-date">Diary date</Label>
                      <Input id="diary-date" type="date" value={diaryDate} onChange={(event) => setDiaryDate(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due date <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Input id="due-date" type="date" min={diaryDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diary-title">Title</Label>
                    <Input id="diary-title" maxLength={120} placeholder="e.g. Chapter 6 practice questions" value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diary-message">Homework instructions</Label>
                    <Textarea id="diary-message" maxLength={5000} className="min-h-48 resize-y" placeholder="Write page numbers, questions, preparation notes, and any materials students need…" value={message} onChange={(event) => setMessage(event.target.value)} />
                    <p className="text-right text-xs text-muted-foreground">{message.length}/5000</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diary-attachment">Worksheet or reference <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <label htmlFor="diary-attachment" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-muted/35 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="rounded-lg bg-card p-2 text-primary shadow-sm"><FileUp className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{attachment?.name || 'Choose a file'}</span><span className="block text-xs text-muted-foreground">PDF, image, Word, or Excel · max 8 MB</span></span>
                      </span>
                      <span className="text-sm font-semibold text-primary">Browse</span>
                    </label>
                    <input ref={fileInputRef} id="diary-attachment" type="file" accept={attachmentAccept} className="sr-only" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <div className="rounded-2xl bg-foreground p-5 text-background shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/55">Selected lesson</p>
                  <p className="mt-2 font-heading text-lg font-semibold">{classes.find((item) => item.id === classId)?.name || 'Choose a class'}</p>
                  <p className="mt-1 text-sm text-background/65">{subjects.find((item) => item.subjectId === subjectId)?.subject.name || 'Then choose your subject'}</p>
                  <div className="mt-5 space-y-2 border-t border-background/15 pt-4 text-xs text-background/65">
                    <p className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Admin reviews before families see it</p>
                    <p className="flex items-center gap-2"><UsersRound className="h-4 w-4" />Posting includes students and parents</p>
                  </div>
                </div>
                <Button className="h-11 w-full gap-2" disabled={submitting || assignments.length === 0} onClick={() => void submitDiary()}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Submitting…' : 'Submit for approval'}
                </Button>
              </div>
            </div>
          </TabsContent>
        )}

        {teacherView && <TabsContent value="submissions" className="mt-5">{listContent}</TabsContent>}
        {adminView && <TabsContent value="pending" className="mt-5">{listContent}</TabsContent>}
        {adminView && <TabsContent value="published" className="mt-5">{listContent}</TabsContent>}
        {adminView && <TabsContent value="history" className="mt-5">{listContent}</TabsContent>}
        {familyView && <TabsContent value="feed" className="mt-0">{listContent}</TabsContent>}
      </Tabs>
    </div>
  );
}
