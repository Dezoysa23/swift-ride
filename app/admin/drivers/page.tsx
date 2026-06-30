'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Bus as BusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface Driver {
  _id: string
  name: string
  email: string
  phone?: string
  licenseNumber?: string
  isActive: boolean
  assignedBusId?: { _id: string; busNumber: string; plateNumber: string } | null
}

interface BusOption {
  _id: string
  busNumber: string
  plateNumber: string
  driverId?: string | null
}

const emptyAddForm = { name: '', email: '', password: '', phone: '', licenseNumber: '' }
const emptyEditForm = { name: '', phone: '', licenseNumber: '', isActive: true }

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [buses, setBuses] = useState<BusOption[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [assignDriver, setAssignDriver] = useState<Driver | null>(null)
  const [addForm, setAddForm] = useState(emptyAddForm)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [selectedBusId, setSelectedBusId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function loadDrivers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/drivers')
      const data = await res.json()
      setDrivers(data.data ?? [])
    } catch { toast.error('Failed to load drivers') }
    finally { setLoading(false) }
  }

  async function loadBuses() {
    try {
      const res = await fetch('/api/admin/buses')
      const data = await res.json()
      setBuses(data.data ?? [])
    } catch { toast.error('Failed to load buses') }
  }

  useEffect(() => { loadDrivers(); loadBuses() }, [])

  function openAdd() { setAddForm(emptyAddForm); setAddOpen(true) }
  function openEdit(d: Driver) {
    setEditForm({ name: d.name, phone: d.phone ?? '', licenseNumber: d.licenseNumber ?? '', isActive: d.isActive })
    setEditDriver(d)
  }
  function openAssign(d: Driver) {
    setSelectedBusId(d.assignedBusId?._id ?? '')
    setAssignDriver(d)
  }

  async function handleAdd() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to add driver'); return }
      toast.success('Driver added')
      setAddOpen(false)
      loadDrivers()
    } catch { toast.error('Failed to add driver') }
    finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!editDriver) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/drivers/${editDriver._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Update failed'); return }
      toast.success('Driver updated')
      setEditDriver(null)
      loadDrivers()
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  async function handleToggleActive(driver: Driver) {
    try {
      const res = await fetch(`/api/admin/drivers/${driver._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !driver.isActive }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Update failed'); return }
      toast.success(driver.isActive ? 'Driver deactivated' : 'Driver activated')
      loadDrivers()
    } catch { toast.error('Update failed') }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Delete failed'); return }
      toast.success('Driver removed')
      loadDrivers()
    } catch { toast.error('Delete failed') }
  }

  async function handleAssignBus() {
    if (!assignDriver) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/drivers/${assignDriver._id}/assign-bus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId: selectedBusId || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Assignment failed'); return }
      toast.success('Bus assigned')
      setAssignDriver(null)
      loadDrivers(); loadBuses()
    } catch { toast.error('Assignment failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your drivers</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="mr-2" /> Add Driver</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Drivers ({drivers.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Assigned Bus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : drivers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No drivers found</TableCell></TableRow>
              ) : (
                drivers.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm">{d.email}</TableCell>
                    <TableCell className="text-sm">{d.phone ?? '—'}</TableCell>
                    <TableCell className="text-sm">{d.licenseNumber ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {d.assignedBusId
                        ? <span className="font-medium">{d.assignedBusId.busNumber}</span>
                        : <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.isActive ? 'success' : 'secondary'}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openAssign(d)} title="Assign Bus">
                          <BusIcon size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(d)}
                          className={d.isActive ? 'text-coral' : 'text-teal'}
                        >
                          {d.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Driver</AlertDialogTitle>
                              <AlertDialogDescription>
                                Deactivate driver <strong>{d.name}</strong> and unassign their bus?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d._id)} className="bg-destructive hover:bg-destructive/90">
                                Remove
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
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Driver</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+94 71 000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label>License Number</Label>
                <Input value={addForm.licenseNumber} onChange={(e) => setAddForm((p) => ({ ...p, licenseNumber: e.target.value }))} placeholder="B1234567" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Driver'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDriver} onOpenChange={(o) => { if (!o) setEditDriver(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Driver — {editDriver?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>License Number</Label>
                <Input value={editForm.licenseNumber} onChange={(e) => setEditForm((p) => ({ ...p, licenseNumber: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(v) => setEditForm((p) => ({ ...p, isActive: v }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDriver(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Bus Dialog */}
      <Dialog open={!!assignDriver} onOpenChange={(o) => { if (!o) setAssignDriver(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Bus — {assignDriver?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Bus</Label>
              <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bus or unassign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Unassign —</SelectItem>
                  {buses
                    .filter((b) => !b.driverId || b._id === assignDriver?.assignedBusId?._id)
                    .map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.busNumber} ({b.plateNumber})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDriver(null)}>Cancel</Button>
            <Button onClick={handleAssignBus} disabled={saving}>{saving ? 'Saving…' : 'Assign Bus'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
