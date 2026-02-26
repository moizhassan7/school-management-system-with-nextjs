'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PrintableChallan from '@/components/finance/printable-challan';
import { useSidebar } from '@/contexts/SidebarContext';

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const { schools } = useSidebar();
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!params?.invoiceId) return;
      const res = await fetch(`/api/finance/invoices/${params.invoiceId}`);
      if (res.ok) {
        setInvoice(await res.json());
      }
      setIsLoading(false);
    };
    loadInvoice();
  }, [params?.invoiceId]);

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <p className="text-red-600">Invoice not found.</p>
        <Link href="/finance/invoices"><Button variant="outline">Back to invoices</Button></Link>
      </div>
    );
  }

  const schoolInfo = schools.find((school: any) => school.id === invoice.schoolId) || schools[0];

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Invoice Detail</h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Badge>{invoice.status}</Badge>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Challan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{invoice.invoiceNo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-semibold">Student:</span> {invoice.student?.name}</p>
          <p><span className="font-semibold">Class:</span> {invoice.student?.studentRecord?.myClass?.name || '-'} {invoice.student?.studentRecord?.section?.name ? `(${invoice.student.studentRecord.section.name})` : ''}</p>
          <p><span className="font-semibold">Due Date:</span> {format(new Date(invoice.dueDate), 'dd MMM yyyy')}</p>
          <p><span className="font-semibold">Billing:</span> {format(new Date(invoice.year, invoice.month - 1), 'MMMM yyyy')}</p>
          <p><span className="font-semibold">Total:</span> Rs. {Number(invoice.totalAmount).toFixed(2)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoice.items?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between border rounded p-2 text-sm">
              <span>{item.feeHead?.name || 'Fee Head'}</span>
              <span className="font-semibold">Rs. {Number(item.amount).toFixed(2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="challan-print-root mt-6 border bg-white p-2 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <PrintableChallan
          invoice={invoice}
          student={invoice.student}
          schoolName={schoolInfo?.name || 'Harvard School Sargodha'}
          schoolAddress={schoolInfo?.address}
        />
      </div>
    </div>
  );
}
