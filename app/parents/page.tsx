'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, Search, ChevronRight, Baby, Phone, CreditCard, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ParentsPage() {
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/parents/financial-overview')
      .then((res) => res.json())
      .then((data) => {
        setParents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setParents([]);
        setLoading(false);
      });
  }, []);

  const filteredParents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(searchQuery) ||
        p.email?.toLowerCase().includes(q) ||
        p.cnic?.includes(searchQuery)
    );
  }, [parents, searchQuery]);

  const totalOutstanding = useMemo(
    () => parents.reduce((sum, p) => sum + (Number(p.totalFamilyDue) || 0), 0),
    [parents]
  );

  return (
    <div className="page-content mx-auto w-full max-w-[1600px] space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <Users className="h-7 w-7" />
            </span>
            Parent Directory
          </h1>
          <p className="mt-1 text-muted-foreground">Manage parents, kinship, and family accounts.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, CNIC..."
            className="rounded-xl bg-muted/50 pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured flex flex-col justify-between p-5">
          <Users className="h-5 w-5 text-white/80" />
          <div>
            <p className="text-sm text-teal-100">Total Parents</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-white">
              {loading ? '—' : parents.length}
            </h3>
          </div>
        </div>
        <div className="bento-tile flex flex-col justify-between p-5">
          <CreditCard className="h-5 w-5 text-cta" />
          <div>
            <p className="text-sm text-muted-foreground">Total Outstanding (Family)</p>
            <h3 className="mt-1 font-heading text-2xl font-bold text-destructive">
              {loading ? '—' : `Rs. ${totalOutstanding.toLocaleString()}`}
            </h3>
          </div>
        </div>
      </div>

      <div className="bento-tile overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Parents</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `Showing ${filteredParents.length} of ${parents.length} records`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filteredParents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {parents.length === 0
                      ? 'No parents found.'
                      : 'No parents match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredParents.map((parent) => (
                  <TableRow key={parent.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground">{parent.name ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{parent.cnic || 'No CNIC'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1 text-foreground">
                          <Phone className="h-3 w-3" /> {parent.phone ?? '—'}
                        </span>
                        <span className="text-muted-foreground">{parent.email ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex w-fit items-center gap-1 rounded-lg">
                        <Baby className="h-3 w-3" /> {parent.childrenCount ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(parent.totalFamilyDue ?? 0) > 0 ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1 rounded-lg">
                          <CreditCard className="h-3 w-3" /> Rs. {(parent.totalFamilyDue ?? 0).toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          Cleared
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/parents/${parent.id}`}>
                        <Button size="sm" variant="ghost" className="cursor-pointer rounded-xl">
                          View <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
