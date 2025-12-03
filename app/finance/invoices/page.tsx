'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/finance/invoices').then(res => res.json()).then(setInvoices);
  }, []);

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Link href="/finance/invoices/generate">
          <Button><PlusCircle className="mr-2 h-4 w-4" /> Generate Monthly Invoices</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Month/Year</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">{inv.invoiceNo}</TableCell>
                  <TableCell>
                    <div>{inv.student.name}</div>
                    <div className="text-xs text-muted-foreground">{inv.student.email}</div>
                  </TableCell>
                  <TableCell>{inv.month}/{inv.year}</TableCell>
                  <TableCell className="font-bold">${inv.totalAmount}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'PAID' ? 'default' : inv.status === 'OVERDUE' ? 'destructive' : 'outline'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}