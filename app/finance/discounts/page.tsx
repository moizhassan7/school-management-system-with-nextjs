'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Tag, Percent, DollarSign, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useSidebar } from '@/contexts/SidebarContext';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Must be a positive number",
  }),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  feeHeadId: z.string().min(1, 'Fee Head is required'),
  schoolId: z.string().min(1, 'School is required'),
});

export default function DiscountsPage() {
  const { schools } = useSidebar();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [feeHeads, setFeeHeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      value: '',
      type: 'PERCENTAGE',
      feeHeadId: '',
      schoolId: '',
    },
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/discounts').then(res => res.json()),
      fetch('/api/finance/fee-heads').then(res => res.json())
    ]).then(([dData, fhData]) => {
      setDiscounts(dData);
      setFeeHeads(fhData);
      setIsLoading(false);
    });
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = { ...values, value: Number(values.value) };
    try {
      const res = await fetch('/api/finance/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newDiscount = await res.json();
        // Since API returns the object, we need to manually attach the feeHead for display
        // or re-fetch. Re-fetching is safer for relations.
        const updatedRes = await fetch('/api/finance/discounts');
        setDiscounts(await updatedRes.json());
        form.reset();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Discount Rules</h1>
          <p className="text-muted-foreground">Manage concessions and scholarships.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create Form */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Create New Discount</CardTitle>
            <CardDescription>Define a new rule.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="schoolId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Sibling Discount" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                          <SelectItem value="FLAT">Flat Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="value" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 50" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="feeHeadId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applies To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Fee Head" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {feeHeads.map(fh => <SelectItem key={fh.id} value={fh.id}>{fh.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Rule
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* List */}
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-dashed border-2 rounded-lg">No active discounts found.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {discounts.map((discount) => (
                <Card key={discount.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{discount.name}</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold flex items-center">
                      {discount.type === 'PERCENTAGE' ? (
                        <><Percent className="mr-1 h-5 w-5" /> {discount.value}%</>
                      ) : (
                        <><DollarSign className="mr-1 h-5 w-5" /> {discount.value}</>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied on: <span className="font-medium text-indigo-600">{discount.feeHead?.name}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}