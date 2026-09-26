'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSidebar } from '@/contexts/SidebarContext';
import { Plus, Save, ArrowRight, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FinanceConfigPage() {
  const { schools } = useSidebar();
  const [activeTab, setActiveTab] = useState('accounts');

  const [accountHeads, setAccountHeads] = useState<any[]>([]);
  const [accountSubHeads, setAccountSubHeads] = useState<any[]>([]);
  const [feeHeads, setFeeHeads] = useState<any[]>([]);

  const [newAccountHead, setNewAccountHead] = useState('');
  const [newSubHeadName, setNewSubHeadName] = useState('');
  const [selectedHeadId, setSelectedHeadId] = useState('');

  const [newFeeHeadName, setNewFeeHeadName] = useState('');
  const [newFeeHeadType, setNewFeeHeadType] = useState<'MONTHLY' | 'ONE_TIME'>('MONTHLY');
  const [selectedSubHeadId, setSelectedSubHeadId] = useState('');

  const [selectedClassId, setSelectedClassId] = useState('');
  const [feeStructures, setFeeStructures] = useState<Record<string, number>>({});
  const [selectedStructureHeadIds, setSelectedStructureHeadIds] = useState<string[]>([]);
  const [selectedStructureHeadToAdd, setSelectedStructureHeadToAdd] = useState('');

  const allClasses = schools.flatMap((school) =>
    school.campuses.flatMap((campus) => campus.classGroups.flatMap((group) => group.classes || []))
  );

  const refreshData = () => {
    fetch('/api/finance/account-heads')
      .then((res) => res.json())
      .then(setAccountHeads);
    fetch('/api/finance/account-subheads')
      .then((res) => res.json())
      .then(setAccountSubHeads);
    fetch('/api/finance/fee-heads')
      .then((res) => res.json())
      .then(setFeeHeads);
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
      .then((res) => res.json())
      .then((data) => {
        const mapping: Record<string, number> = {};
        data.forEach((fs: any) => (mapping[fs.feeHeadId] = fs.amount));
        setFeeStructures(mapping);
        setSelectedStructureHeadIds(data.map((fs: any) => fs.feeHeadId));
      });
  }, [selectedClassId]);

  const handleCreateAccountHead = async () => {
    if (!newAccountHead) return;
    await fetch('/api/finance/account-heads', {
      method: 'POST',
      body: JSON.stringify({ name: newAccountHead, schoolId: schools[0]?.id }),
    });
    setNewAccountHead('');
    refreshData();
  };

  const handleCreateSubHead = async () => {
    if (!newSubHeadName || !selectedHeadId) return;
    await fetch('/api/finance/account-subheads', {
      method: 'POST',
      body: JSON.stringify({ name: newSubHeadName, headId: selectedHeadId, schoolId: schools[0]?.id }),
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
        type: newFeeHeadType,
        accountSubHeadId: selectedSubHeadId,
      }),
    });
    setNewFeeHeadName('');
    setNewFeeHeadType('MONTHLY');
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
          schoolId: schools[0]?.id,
        }),
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
    <div className="page-content mx-auto w-full max-w-[1400px] space-y-6">
      <div>
        <h1 className="font-heading flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Settings2 className="h-7 w-7" />
          </span>
          Finance Configuration
        </h1>
        <p className="mt-1 text-muted-foreground">
          Set up account hierarchy, fee heads, and class fee structures.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-3">
          <TabsTrigger value="accounts" className="cursor-pointer rounded-lg">
            1. Accounts Hierarchy
          </TabsTrigger>
          <TabsTrigger value="feeheads" className="cursor-pointer rounded-lg">
            2. Fee Heads
          </TabsTrigger>
          <TabsTrigger value="structure" className="cursor-pointer rounded-lg">
            3. Fee Structure
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bento-tile space-y-4 p-5">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Major Account Heads</h2>
                <p className="text-sm text-muted-foreground">e.g. Assets, Income, Expense</p>
              </div>
              <div className="flex gap-2">
                <Input
                  className="rounded-xl bg-muted/50"
                  placeholder="Name (e.g. INCOME)"
                  value={newAccountHead}
                  onChange={(e) => setNewAccountHead(e.target.value)}
                />
                <Button onClick={handleCreateAccountHead} className="cursor-pointer rounded-xl">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {accountHeads.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
                    No account heads yet. Create one above.
                  </p>
                ) : (
                  accountHeads.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm font-medium text-foreground"
                    >
                      {h.name}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bento-tile space-y-4 p-5">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Account Subheads</h2>
                <p className="text-sm text-muted-foreground">e.g. Academic Fees, Transport Fees</p>
              </div>
              <div className="space-y-2">
                <Label>Parent Head</Label>
                <Select onValueChange={setSelectedHeadId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select Head" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountHeads.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  className="rounded-xl bg-muted/50"
                  placeholder="Subhead Name"
                  value={newSubHeadName}
                  onChange={(e) => setNewSubHeadName(e.target.value)}
                />
                <Button onClick={handleCreateSubHead} disabled={!selectedHeadId} className="cursor-pointer rounded-xl">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {accountSubHeads.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
                    No subheads yet. Select a parent head and add one.
                  </p>
                ) : (
                  accountSubHeads.map((sh) => (
                    <div
                      key={sh.id}
                      className="flex justify-between rounded-xl border border-border/70 bg-muted/30 p-3 text-sm"
                    >
                      <span className="font-medium text-foreground">{sh.name}</span>
                      <span className="rounded-lg border border-border/70 bg-card px-2 py-0.5 text-xs text-muted-foreground">
                        {sh.head?.name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab('feeheads')} className="cursor-pointer rounded-xl gap-2">
              Next: Create Fee Heads <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="feeheads" className="space-y-6">
          <div className="bento-tile space-y-6 p-5">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Fee Heads</h2>
              <p className="text-sm text-muted-foreground">Create specific fees and link them to an Account Subhead.</p>
            </div>

            <div className="flex flex-col items-end gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 md:flex-row">
              <div className="w-full space-y-2 md:w-1/3">
                <Label>Fee Name</Label>
                <Input
                  className="rounded-xl bg-card"
                  placeholder="e.g. Monthly Tuition"
                  value={newFeeHeadName}
                  onChange={(e) => setNewFeeHeadName(e.target.value)}
                />
              </div>
              <div className="w-full space-y-2 md:w-1/4">
                <Label>Charge type</Label>
                <Select value={newFeeHeadType} onValueChange={(value) => setNewFeeHeadType(value as 'MONTHLY' | 'ONE_TIME')}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly fee</SelectItem>
                    <SelectItem value="ONE_TIME">One-time charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full space-y-2 md:w-1/3">
                <Label>Link to Account Subhead</Label>
                <Select onValueChange={setSelectedSubHeadId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountSubHeads.map((sh) => (
                      <SelectItem key={sh.id} value={sh.id}>
                        {sh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateFeeHead}
                disabled={!selectedSubHeadId || !newFeeHeadName}
                className="cursor-pointer rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" /> Create Fee Head
              </Button>
            </div>

            {feeHeads.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 py-12 text-center text-muted-foreground">
                No fee heads yet. Create one using the form above.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {feeHeads.map((head) => (
                  <div key={head.id} className="rounded-xl border border-border/70 bg-muted/20 p-4 transition-shadow hover:shadow-sm">
                    <div className="font-heading font-semibold text-foreground">{head.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {head.type === 'ONE_TIME' ? 'One-time charge' : 'Monthly fee'}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      Linked to:{' '}
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                        {head.accountSubHead?.name || 'Unlinked'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab('structure')} className="cursor-pointer rounded-xl gap-2">
              Next: Assign Amounts <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="structure">
          <div className="bento-tile space-y-6 p-5">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Class Fee Mapping</h2>
              <p className="text-sm text-muted-foreground">Assign amounts to fee heads for specific classes.</p>
            </div>

            <div className="max-w-md space-y-2">
              <Label>Select Class</Label>
              <Select onValueChange={setSelectedClassId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose Class..." />
                </SelectTrigger>
                <SelectContent>
                  {allClasses.length > 0 ? (
                    allClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No Classes Found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedClassId ? (
              <div className="space-y-4">
                <div className="flex max-w-xl gap-2">
                  <Select value={selectedStructureHeadToAdd} onValueChange={setSelectedStructureHeadToAdd}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Add fee head to this class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {feeHeads
                        .filter((head) => !selectedStructureHeadIds.includes(head.id))
                        .map((head) => (
                          <SelectItem key={head.id} value={head.id}>
                            {head.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddStructureHead}
                    disabled={!selectedStructureHeadToAdd}
                    className="cursor-pointer rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                {selectedStructureHeadIds.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 py-12 text-center text-muted-foreground">
                    No fee heads assigned to this class yet. Add one above.
                  </p>
                ) : (
                  <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/30 p-5">
                    {selectedStructureHeadIds.map((headId) => {
                      const head = feeHeads.find((item) => item.id === headId);
                      if (!head) return null;
                      return (
                        <div
                          key={head.id}
                          className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3"
                        >
                          <Label className="w-1/3 cursor-pointer font-medium text-foreground">{head.name}</Label>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-muted-foreground">Rs.</span>
                            <Input
                              type="number"
                              className="w-32 rounded-xl text-right"
                              placeholder="0"
                              value={feeStructures[head.id] || ''}
                              onChange={(e) =>
                                setFeeStructures((prev) => ({ ...prev, [head.id]: Number(e.target.value) }))
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveStructureHead(head.id)}
                              className="cursor-pointer rounded-xl"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveStructure} className="w-40 cursor-pointer rounded-xl gap-2">
                    <Save className="h-4 w-4" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border/70 py-12 text-center text-muted-foreground">
                Select a class to configure fee amounts.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
