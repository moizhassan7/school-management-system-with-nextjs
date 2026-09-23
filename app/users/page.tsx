'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListPagination } from '@/components/list-pagination';
import { EmptyState } from '@/components/empty-state';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (debouncedSearch) params.set('q', debouncedSearch);
    fetch(`/api/users?${params}`)
      .then((r) => r.json())
      .then((payload) => {
        if (Array.isArray(payload)) {
          setUsers(payload);
          setTotal(payload.length);
        } else {
          setUsers(Array.isArray(payload.data) ? payload.data : []);
          setTotal(Number(payload.total) || 0);
        }
      })
      .catch(() => {
        setUsers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, debouncedSearch]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate and soft-delete this user?')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('User deleted');
    load();
  };

  return (
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Accounts, campus access, and module permissions.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/users/new">
            <Plus className="h-4 w-4" /> Add User
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search name, email, username, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      className="border-0"
                      title={debouncedSearch ? 'No users match your search' : 'No users found'}
                      description={
                        debouncedSearch
                          ? 'Try a different name, email, or role.'
                          : 'Add a user to grant access to the system.'
                      }
                      actionLabel={debouncedSearch ? undefined : 'Add User'}
                      actionHref={debouncedSearch ? undefined : '/users/new'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell>{u.school?.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/users/${u.id}/edit`} aria-label={`Edit ${u.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(u.id)}
                          aria-label={`Delete ${u.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 pb-4">
          <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
