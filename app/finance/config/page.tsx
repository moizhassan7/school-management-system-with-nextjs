'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSidebar } from '@/contexts/SidebarContext';
import { Plus, Save } from 'lucide-react';

export default function FinanceConfigPage() {
  const { classGroups, schools } = useSidebar();
  const [feeHeads, setFeeHeads] = useState<any[]>([]);
  const [newHeadName, setNewHeadName] = useState('');
  
  // Structure State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [feeStructures, setFeeStructures] = useState<Record<string, number>>({});

  // 1. Fetch Fee Heads
  useEffect(() => {
    fetch('/api/finance/fee-heads').then(res => res.json()).then(setFeeHeads);
  }, []);

  // 2. Fetch Structure when Class Selected
  useEffect(() => {
    if (!selectedClassId) return;
    fetch(`/api/finance/fee-structures?classId=${selectedClassId}`)
      .then(res => res.json())
      .then(data => {
        const mapping: Record<string, number> = {};
        data.forEach((fs: any) => mapping[fs.feeHeadId] = fs.amount);
        setFeeStructures(mapping);
      });
  }, [selectedClassId]);

  const createFeeHead = async () => {
    await fetch('/api/finance/fee-heads', {
      method: 'POST',
      body: JSON.stringify({ name: newHeadName, schoolId: schools[0]?.id, type: 'MONTHLY' })
    });
    setNewHeadName('');
    // Refresh heads...
    fetch('/api/finance/fee-heads').then(res => res.json()).then(setFeeHeads);
  };

  const saveStructure = async () => {
    // Loop through local state and save (in real app, use bulk upsert API)
    for (const [headId, amount] of Object.entries(feeStructures)) {
      await fetch('/api/finance/fee-structures', {
        method: 'POST',
        body: JSON.stringify({
          classId: selectedClassId,
          feeHeadId: headId,
          amount: Number(amount),
          schoolId: schools[0]?.id
        })
      });
    }
    alert('Saved!');
  };

  // Flatten classes for dropdown
  const allClasses = classGroups.flatMap(cg => cg.classes || []);

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Finance Configuration</h1>
      
      <Tabs defaultValue="heads">
        <TabsList>
          <TabsTrigger value="heads">Fee Heads</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: FEE HEADS --- */}
        <TabsContent value="heads">
          <Card>
            <CardHeader><CardTitle>Manage Fee Types</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="New Fee Head (e.g. Lab Charges)" value={newHeadName} onChange={e => setNewHeadName(e.target.value)} />
                <Button onClick={createFeeHead}><Plus className="mr-2 h-4 w-4"/> Add</Button>
              </div>
              <div className="grid gap-2">
                {feeHeads.map(head => (
                  <div key={head.id} className="p-3 border rounded bg-slate-50 font-medium">
                    {head.name} <span className="text-xs text-muted-foreground ml-2">({head.type})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: FEE STRUCTURE --- */}
        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Class Fee Mapping</CardTitle>
              <CardDescription>Assign amounts to fee heads for a specific class.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select Class</Label>
                <Select onValueChange={setSelectedClassId}>
                  <SelectTrigger><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                  <SelectContent>
                    {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassId && (
                <div className="space-y-4 border p-4 rounded-lg">
                  {feeHeads.map(head => (
                    <div key={head.id} className="flex items-center justify-between">
                      <Label className="w-1/3">{head.name}</Label>
                      <Input 
                        type="number" 
                        className="w-40" 
                        placeholder="0.00"
                        value={feeStructures[head.id] || ''}
                        onChange={(e) => setFeeStructures(prev => ({ ...prev, [head.id]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                  <Button onClick={saveStructure} className="w-full"><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
