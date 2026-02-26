'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSidebar } from '@/contexts/SidebarContext';
import { Plus, Save, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceConfigPage() {
  // FIX 1: We only need 'schools' now, as it contains the full tree
  const { schools } = useSidebar();
  const [activeTab, setActiveTab] = useState("accounts");

  // Data States
  const [accountHeads, setAccountHeads] = useState<any[]>([]);
  const [accountSubHeads, setAccountSubHeads] = useState<any[]>([]);
  const [feeHeads, setFeeHeads] = useState<any[]>([]);
  
  // Form States
  const [newAccountHead, setNewAccountHead] = useState('');
  const [newSubHeadName, setNewSubHeadName] = useState('');
  const [selectedHeadId, setSelectedHeadId] = useState('');
  
  const [newFeeHeadName, setNewFeeHeadName] = useState('');
  const [selectedSubHeadId, setSelectedSubHeadId] = useState('');

  // Structure State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [feeStructures, setFeeStructures] = useState<Record<string, number>>({});
  const [selectedStructureHeadIds, setSelectedStructureHeadIds] = useState<string[]>([]);
  const [selectedStructureHeadToAdd, setSelectedStructureHeadToAdd] = useState('');

  // --- FIX 2: Derive 'allClasses' by flattening the Schools hierarchy ---
  // School -> Campus -> ClassGroup -> Class
  const allClasses = schools.flatMap(school => 
    school.campuses.flatMap(campus => 
      campus.classGroups.flatMap(group => 
        group.classes || []
      )
    )
  );
  // ---------------------------------------------------------------------

  // --- FETCH DATA ---
  const refreshData = () => {
    fetch('/api/finance/account-heads').then(res => res.json()).then(setAccountHeads);
    fetch('/api/finance/account-subheads').then(res => res.json()).then(setAccountSubHeads);
    fetch('/api/finance/fee-heads').then(res => res.json()).then(setFeeHeads);
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setFeeStructures({});
      setSelectedStructureHeadIds([]);
      return;
    }
    fetch(`/api/finance/fee-structures?classId=${selectedClassId}`)
      .then(res => res.json())
      .then(data => {
        const mapping: Record<string, number> = {};
        data.forEach((fs: any) => mapping[fs.feeHeadId] = fs.amount);
        setFeeStructures(mapping);
        setSelectedStructureHeadIds(data.map((fs: any) => fs.feeHeadId));
      });
  }, [selectedClassId]);

  // --- HANDLERS ---

  const handleCreateAccountHead = async () => {
    if (!newAccountHead) return;
    await fetch('/api/finance/account-heads', {
      method: 'POST',
      body: JSON.stringify({ name: newAccountHead, schoolId: schools[0]?.id })
    });
    setNewAccountHead('');
    refreshData();
  };

  const handleCreateSubHead = async () => {
    if (!newSubHeadName || !selectedHeadId) return;
    await fetch('/api/finance/account-subheads', {
      method: 'POST',
      body: JSON.stringify({ name: newSubHeadName, headId: selectedHeadId, schoolId: schools[0]?.id })
    });
    setNewSubHeadName('');
    refreshData();
  };

  const handleCreateFeeHead = async () => {
    if (!newFeeHeadName || !selectedSubHeadId) return;
    await fetch('/api/finance/fee-heads', {
      method: 'POST',
      body: JSON.stringify({ 
        name: newFeeHeadName, 
        schoolId: schools[0]?.id, 
        type: 'MONTHLY',
        accountSubHeadId: selectedSubHeadId 
      })
    });
    setNewFeeHeadName('');
    refreshData();
  };

  const handleSaveStructure = async () => {
    if (!selectedClassId) return;
    const entriesToSave = Object.entries(feeStructures).filter(([headId]) =>
      selectedStructureHeadIds.includes(headId)
    );

    if (entriesToSave.length === 0) {
      toast.error('Please add at least one fee head');
      return;
    }

    for (const [headId, amount] of entriesToSave) {
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
    toast.success('Fee structure saved');
  };

  const handleAddStructureHead = () => {
    if (!selectedStructureHeadToAdd) return;
    setSelectedStructureHeadIds((prev) =>
      prev.includes(selectedStructureHeadToAdd) ? prev : [...prev, selectedStructureHeadToAdd]
    );
    setFeeStructures((prev) => ({
      ...prev,
      [selectedStructureHeadToAdd]: prev[selectedStructureHeadToAdd] ?? 0,
    }));
    setSelectedStructureHeadToAdd('');
  };

  const handleRemoveStructureHead = (headId: string) => {
    setSelectedStructureHeadIds((prev) => prev.filter((id) => id !== headId));
    setFeeStructures((prev) => {
      const next = { ...prev };
      delete next[headId];
      return next;
    });
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <h1 className="text-3xl font-bold">Finance Configuration</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts">1. Accounts Hierarchy</TabsTrigger>
          <TabsTrigger value="feeheads">2. Fee Heads</TabsTrigger>
          <TabsTrigger value="structure">3. Fee Structure</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: ACCOUNTS --- */}
        <TabsContent value="accounts" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Level 1: Account Heads */}
            <Card>
              <CardHeader>
                <CardTitle>Major Account Heads</CardTitle>
                <CardDescription>e.g. Assets, Income, Expense</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Name (e.g. INCOME)" value={newAccountHead} onChange={e => setNewAccountHead(e.target.value)} />
                  <Button onClick={handleCreateAccountHead}><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="space-y-2">
                  {accountHeads.map(h => (
                    <div key={h.id} className="p-2 bg-slate-50 border rounded text-sm font-medium">
                      {h.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Level 2: Subheads */}
            <Card>
              <CardHeader>
                <CardTitle>Account Subheads</CardTitle>
                <CardDescription>e.g. Academic Fees, Transport Fees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Parent Head</Label>
                  <Select onValueChange={setSelectedHeadId}>
                    <SelectTrigger><SelectValue placeholder="Select Head" /></SelectTrigger>
                    <SelectContent>
                      {accountHeads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Subhead Name" value={newSubHeadName} onChange={e => setNewSubHeadName(e.target.value)} />
                  <Button onClick={handleCreateSubHead} disabled={!selectedHeadId}><Plus className="h-4 w-4"/></Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {accountSubHeads.map(sh => (
                    <div key={sh.id} className="p-2 bg-slate-50 border rounded text-sm flex justify-between">
                      <span>{sh.name}</span>
                      <span className="text-xs text-muted-foreground bg-white px-1 rounded border">{sh.head?.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("feeheads")}>Next: Create Fee Heads <ArrowRight className="ml-2 h-4 w-4"/></Button>
          </div>
        </TabsContent>

        {/* --- TAB 2: FEE HEADS --- */}
        <TabsContent value="feeheads">
          <Card>
            <CardHeader>
              <CardTitle>Fee Heads</CardTitle>
              <CardDescription>Create specific fees and link them to an Account Subhead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                <div className="w-full md:w-1/3 space-y-2">
                  <Label>Fee Name</Label>
                  <Input placeholder="e.g. Monthly Tuition" value={newFeeHeadName} onChange={e => setNewFeeHeadName(e.target.value)} />
                </div>
                <div className="w-full md:w-1/3 space-y-2">
                  <Label>Link to Account Subhead</Label>
                  <Select onValueChange={setSelectedSubHeadId}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      {accountSubHeads.map(sh => <SelectItem key={sh.id} value={sh.id}>{sh.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateFeeHead} disabled={!selectedSubHeadId || !newFeeHeadName}>
                  <Plus className="mr-2 h-4 w-4"/> Create Fee Head
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feeHeads.map(head => (
                  <div key={head.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="font-semibold text-lg">{head.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      Linked to: <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{head.accountSubHead?.name || 'Unlinked'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setActiveTab("structure")}>Next: Assign Amounts <ArrowRight className="ml-2 h-4 w-4"/></Button>
          </div>
        </TabsContent>

        {/* --- TAB 3: FEE STRUCTURE --- */}
        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Class Fee Mapping</CardTitle>
              <CardDescription>Assign amounts to fee heads for specific classes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md">
                <Label>Select Class</Label>
                <Select onValueChange={setSelectedClassId}>
                  <SelectTrigger><SelectValue placeholder="Choose Class..." /></SelectTrigger>
                  <SelectContent>
                    {allClasses.length > 0 ? (
                      allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                    ) : (
                       <SelectItem value="none" disabled>No Classes Found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassId ? (
                <div className="space-y-1">
                  <div className="flex gap-2 max-w-xl pb-4">
                    <Select value={selectedStructureHeadToAdd} onValueChange={setSelectedStructureHeadToAdd}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add fee head to this class..." />
                      </SelectTrigger>
                      <SelectContent>
                        {feeHeads
                          .filter((head) => !selectedStructureHeadIds.includes(head.id))
                          .map((head) => (
                            <SelectItem key={head.id} value={head.id}>{head.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={handleAddStructureHead} disabled={!selectedStructureHeadToAdd}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="grid gap-3 border p-6 rounded-lg bg-slate-50/50">
                    {selectedStructureHeadIds.map((headId) => {
                      const head = feeHeads.find((item) => item.id === headId);
                      if (!head) return null;
                      return (
                      <div key={head.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <Label className="w-1/3 cursor-pointer">{head.name}</Label>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-gray-500">$</span>
                          <Input 
                            type="number" 
                            className="w-32 text-right" 
                            placeholder="0"
                            value={feeStructures[head.id] || ''}
                            onChange={(e) => setFeeStructures(prev => ({ ...prev, [head.id]: Number(e.target.value) }))}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveStructureHead(head.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleSaveStructure} className="w-40"><Save className="mr-2 h-4 w-4" /> Save</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  Select a class to configure fee amounts.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}