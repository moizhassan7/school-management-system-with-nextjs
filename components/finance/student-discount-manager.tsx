'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StudentDiscountManagerProps {
    studentId: string;
    studentName: string;
}

export default function StudentDiscountManager({ studentId, studentName }: StudentDiscountManagerProps) {
    const [assigned, setAssigned] = useState<any[]>([]);
    const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
    const [selectedDiscount, setSelectedDiscount] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [assignedRes, availableRes] = await Promise.all([
                fetch(`/api/students/${studentId}/discounts`),
                fetch(`/api/finance/discounts`)
            ]);
            
            if (assignedRes.ok) setAssigned(await assignedRes.json());
            if (availableRes.ok) setAvailableDiscounts(await availableRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) loadData();
    }, [open, studentId]);

    const handleAssign = async () => {
        if (!selectedDiscount) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/students/${studentId}/discounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountId: selectedDiscount })
            });
            
            if (res.ok) {
                await loadData(); // Refresh list
                setSelectedDiscount('');
            } else {
                toast.error("Failed to assign discount");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm("Remove this discount?")) return;
        try {
            await fetch(`/api/students/${studentId}/discounts?id=${id}`, { method: 'DELETE' });
            setAssigned(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-2">
                    <Tag className="mr-2 h-4 w-4" /> Manage Discounts
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Discounts for {studentName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Active Discounts List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Active Discounts</h4>
                        {loading ? (
                            <div className="text-center text-xs text-muted-foreground">Loading...</div>
                        ) : assigned.length === 0 ? (
                            <div className="p-4 border border-dashed rounded-md text-center text-sm text-muted-foreground">
                                No discounts assigned.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assigned.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded-md">
                                        <div>
                                            <p className="font-medium text-sm">{item.discount.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.discount.type === 'PERCENTAGE' ? `${item.discount.value}%` : `$${item.discount.value}`} off {item.discount.feeHead.name}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assign New */}
                    <div className="space-y-3 pt-4 border-t">
                        <Label>Assign New Discount</Label>
                        <div className="flex gap-2">
                            <Select value={selectedDiscount} onValueChange={setSelectedDiscount}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a discount rule..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableDiscounts.map(d => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : `$${d.value}`})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAssign} disabled={isSubmitting || !selectedDiscount}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}