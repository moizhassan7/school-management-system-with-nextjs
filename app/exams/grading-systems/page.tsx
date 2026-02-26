'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface GradeRange {
  id?: string;
  name: string;
  minPercent: number;
  maxPercent: number;
  gradePoint: number;
  color: string;
}

interface GradingSystem {
  id?: string;
  name: string;
  description?: string;
  ranges: GradeRange[];
  _count?: {
    classGroups: number;
  };
}

export default function GradingSystemsPage() {
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSystem, setEditingSystem] = useState<string | null>(null);
  const [formData, setFormData] = useState<GradingSystem>({
    name: '',
    description: '',
    ranges: []
  });


  useEffect(() => {
    fetchGradingSystems();
  }, []);

  const fetchGradingSystems = async () => {
    try {
      const response = await fetch('/api/exams/grading-systems');
      if (response.ok) {
        const data = await response.json();
        setGradingSystems(data);
      } else {
        toast.error('Failed to fetch grading systems');
      }
    } catch (error) {
      console.error('Error fetching grading systems:', error);
      toast.error('Failed to fetch grading systems');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSystem = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      ranges: [
        { name: 'A+', minPercent: 90, maxPercent: 100, gradePoint: 4.0, color: '#10b981' },
        { name: 'A', minPercent: 80, maxPercent: 89, gradePoint: 3.7, color: '#22c55e' },
        { name: 'B+', minPercent: 70, maxPercent: 79, gradePoint: 3.3, color: '#84cc16' },
        { name: 'B', minPercent: 60, maxPercent: 69, gradePoint: 3.0, color: '#eab308' },
        { name: 'C+', minPercent: 50, maxPercent: 59, gradePoint: 2.7, color: '#f59e0b' },
        { name: 'C', minPercent: 40, maxPercent: 49, gradePoint: 2.3, color: '#f97316' },
        { name: 'D', minPercent: 33, maxPercent: 39, gradePoint: 2.0, color: '#ef4444' },
        { name: 'F', minPercent: 0, maxPercent: 32, gradePoint: 0.0, color: '#dc2626' }
      ]
    });
  };

  const handleSaveSystem = async () => {
    if (!formData.name.trim()) {
      toast.error('Grading system name is required');
      return;
    }

    if (formData.ranges.length === 0) {
      toast.error('At least one grade range is required');
      return;
    }

    // Validate ranges
    for (const range of formData.ranges) {
      if (!range.name.trim() || range.minPercent === undefined || range.maxPercent === undefined) {
        toast.error('All grade range fields are required');
        return;
      }
      if (range.minPercent >= range.maxPercent) {
        toast.error('Min percentage must be less than max percentage');
        return;
      }
    }

    try {
      const url = editingSystem
        ? `/api/exams/grading-systems/${editingSystem}`
        : '/api/exams/grading-systems';

      const method = editingSystem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(`Grading system ${editingSystem ? 'updated' : 'created'} successfully`);
        fetchGradingSystems();
        setIsCreating(false);
        setEditingSystem(null);
        setFormData({ name: '', description: '', ranges: [] });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save grading system');
      }
    } catch (error) {
      console.error('Error saving grading system:', error);
      toast.error('Failed to save grading system');
    }
  };

  const handleDeleteSystem = async (systemId: string) => {
    if (!confirm('Are you sure you want to delete this grading system?')) {
      return;
    }

    try {
      const response = await fetch(`/api/exams/grading-systems/${systemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Grading system deleted successfully');
        fetchGradingSystems();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete grading system');
      }
    } catch (error) {
      console.error('Error deleting grading system:', error);
      toast.error('Failed to delete grading system');
    }
  };

  const handleEditSystem = (system: GradingSystem) => {
    setEditingSystem(system.id!);
    setFormData({
      name: system.name,
      description: system.description || '',
      ranges: [...system.ranges]
    });
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingSystem(null);
    setFormData({ name: '', description: '', ranges: [] });
  };

  const addGradeRange = () => {
    setFormData(prev => ({
      ...prev,
      ranges: [...prev.ranges, { name: '', minPercent: 0, maxPercent: 0, gradePoint: 0, color: '#6b7280' }]
    }));
  };

  const removeGradeRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ranges: prev.ranges.filter((_, i) => i !== index)
    }));
  };

  const updateGradeRange = (index: number, field: keyof GradeRange, value: any) => {
    setFormData(prev => ({
      ...prev,
      ranges: prev.ranges.map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading grading systems...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Grading Systems</h1>
          <p className="text-muted-foreground">Manage grading systems and grade ranges for your school</p>
        </div>
        {!isCreating && (
          <Button onClick={handleCreateSystem}>
            <Plus className="h-4 w-4 mr-2" />
            Create Grading System
          </Button>
        )}
      </div>

      {(isCreating || editingSystem) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSystem ? 'Edit Grading System' : 'Create Grading System'}</CardTitle>
            <CardDescription>
              Define grade ranges with percentages and grade points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="systemName">System Name</Label>
                <Input
                  id="systemName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard High School Grading"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Grade Ranges</Label>
                <Button type="button" variant="outline" size="sm" onClick={addGradeRange}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Range
                </Button>
              </div>

              <div className="space-y-4">
                {formData.ranges.map((range, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div>
                        <Label>Grade</Label>
                        <Input
                          value={range.name}
                          onChange={(e) => updateGradeRange(index, 'name', e.target.value)}
                          placeholder="A+"
                        />
                      </div>
                      <div>
                        <Label>Min %</Label>
                        <Input
                          type="number"
                          value={range.minPercent}
                          onChange={(e) => updateGradeRange(index, 'minPercent', parseFloat(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label>Max %</Label>
                        <Input
                          type="number"
                          value={range.maxPercent}
                          onChange={(e) => updateGradeRange(index, 'maxPercent', parseFloat(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label>Grade Point</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={range.gradePoint}
                          onChange={(e) => updateGradeRange(index, 'gradePoint', parseFloat(e.target.value))}
                          min="0"
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          type="color"
                          value={range.color}
                          onChange={(e) => updateGradeRange(index, 'color', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGradeRange(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveSystem}>
                <Save className="h-4 w-4 mr-2" />
                Save System
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gradingSystems.map((system) => (
          <Card key={system.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{system.name}</CardTitle>
                  <CardDescription>{system.description}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSystem(system)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSystem(system.id!)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {system.ranges.map((range, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: range.color }}
                      />
                      <span className="font-medium">{range.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {range.minPercent}-{range.maxPercent}% (GP: {range.gradePoint})
                    </div>
                  </div>
                ))}
              </div>
              {(system._count?.classGroups ?? 0) > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Badge variant="secondary">
                    Used by {system._count?.classGroups || 0} class group{system._count?.classGroups !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {gradingSystems.length === 0 && !isCreating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">No Grading Systems</h3>
            <p className="text-muted-foreground mb-4">
              Create your first grading system to get started with exam management
            </p>
            <Button onClick={handleCreateSystem}>
              <Plus className="h-4 w-4 mr-2" />
              Create Grading System
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}