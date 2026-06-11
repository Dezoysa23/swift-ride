'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Bus {
  _id: string
  busNumber: string
  plateNumber: string
  model: string
  year: number
  capacity: number
  status: 'active' | 'inactive' | 'maintenance'
  driverId?: { _id: string; name: string; email: string } | null
}

const emptyForm = {
  busNumber: '',
  plateNumber: '',
  model: '',
  year: new Date().getFullYear(),
  capacity: 40,
  status: 'active' as Bus['status'],
}

function statusVariant(status: string) {
  if (status === 'active') return 'success'
  if (status === 'maintenance') return 'warning'
  return 'secondary'
}

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editBus, setEditBus] = useState<Bus | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadBuses() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/buses')
      const data = await res.json()
      setBuses(data.data ?? [])
    } catch {
      toast.error('Failed to load buses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBuses() }, [])

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openEdit(bus: Bus) {
    setForm({
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      model: bus.model,
      year: bus.year,
      capacity: bus.capacity,
      status: bus.status,
    })
    setEditBus(bus)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'year' || name === 'capacity' ? Number(value) : value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editBus ? `/api/admin/buses/${editBus._id}` : '/api/admin/buses'
      const method = editBus ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      toast.success(editBus ? 'Bus updated' : 'Bus added')
      setAddOpen(false)
      setEditBus(null)
      loadBuses()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/buses/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Delete failed'); return }
      toast.success('Bus deleted')
      loadBuses()
    } catch {
      toast.error('Delete failed')
    }
  }

  const FormFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="busNumber">Bus Number</Label>
          <Input id="busNumber" name="busNumber" value={form.busNumber} onChange={handleChange} placeholder="BUS-001" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plateNumber">Plate Number</Label>
          <Input id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} placeholder="AB-1234" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="model">Model</Label>
        <Input id="model" name="model" value={form.model} onChange={handleChange} placeholder="Toyota Coaster" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="year">Year</Label>
          <Input id="year" name="year" type="number" value={form.year} onChange={handleChange} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as Bus['status'] }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buses</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your fleet</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-2" /> Add Bus
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet ({buses.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bus No.</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : buses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">No buses found</TableCell>
                </TableRow>
              ) : (
                buses.map((bus) => (
                  <TableRow key={bus._id}>
                    <TableCell className="font-medium">{bus.busNumber}</TableCell>
                    <TableCell>{bus.plateNumber}</TableCell>
                    <TableCell>{bus.model}</TableCell>
                    <TableCell>{bus.year}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(bus.status) as any}>
                        {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{bus.driverId?.name ?? <span className="text-gray-400">Unassigned</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(bus)}>
                          <Pencil size={14} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Bus</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete bus <strong>{bus.busNumber}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(bus._id)} className="bg-red-600 hover:bg-red-700">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bus</DialogTitle>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Add Bus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editBus} onOpenChange={(o) => { if (!o) setEditBus(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bus — {editBus?.busNumber}</DialogTitle>
          </DialogHeader>
          {FormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBus(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
