'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
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

interface Stop { name: string; order: number; lat?: number; lng?: number }
interface Route {
  _id: string
  routeNumber: string
  name: string
  startPoint: string
  endPoint: string
  fare: number
  distanceKm: number
  estimatedMinutes: number
  status: 'active' | 'inactive'
  stops: Stop[]
}

const emptyForm = {
  routeNumber: '',
  name: '',
  startPoint: '',
  endPoint: '',
  fare: 0,
  distanceKm: 0,
  estimatedMinutes: 0,
  status: 'active' as Route['status'],
  stopsText: '',
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editRoute, setEditRoute] = useState<Route | null>(null)
  const [viewRoute, setViewRoute] = useState<Route | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function loadRoutes() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/routes')
      const data = await res.json()
      setRoutes(data.data ?? [])
    } catch { toast.error('Failed to load routes') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRoutes() }, [])

  function routeToForm(r: Route) {
    return {
      routeNumber: r.routeNumber,
      name: r.name,
      startPoint: r.startPoint,
      endPoint: r.endPoint,
      fare: r.fare,
      distanceKm: r.distanceKm,
      estimatedMinutes: r.estimatedMinutes,
      status: r.status,
      stopsText: r.stops.sort((a, b) => a.order - b.order).map((s) => s.name).join('\n'),
    }
  }

  function parseStops(text: string): Stop[] {
    return text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({ name, order: idx + 1 }))
  }

  function openAdd() { setForm(emptyForm); setAddOpen(true) }
  function openEdit(r: Route) { setForm(routeToForm(r)); setEditRoute(r) }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    const numFields = ['fare', 'distanceKm', 'estimatedMinutes']
    setForm((p) => ({ ...p, [name]: numFields.includes(name) ? Number(value) : value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = { ...form, stops: parseStops(form.stopsText) }
      const { stopsText: _, ...body } = payload as any
      const url = editRoute ? `/api/admin/routes/${editRoute._id}` : '/api/admin/routes'
      const method = editRoute ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      toast.success(editRoute ? 'Route updated' : 'Route added')
      setAddOpen(false); setEditRoute(null)
      loadRoutes()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Delete failed'); return }
      toast.success('Route deleted')
      loadRoutes()
    } catch { toast.error('Delete failed') }
  }

  const FormBody = (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Route Number</Label>
          <Input name="routeNumber" value={form.routeNumber} onChange={handleChange} placeholder="R-001" />
        </div>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="City Centre Express" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Start Point</Label>
          <Input name="startPoint" value={form.startPoint} onChange={handleChange} placeholder="Colombo Fort" />
        </div>
        <div className="space-y-1.5">
          <Label>End Point</Label>
          <Input name="endPoint" value={form.endPoint} onChange={handleChange} placeholder="Kandy" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Fare (LKR)</Label>
          <Input name="fare" type="number" value={form.fare} onChange={handleChange} />
        </div>
        <div className="space-y-1.5">
          <Label>Distance (km)</Label>
          <Input name="distanceKm" type="number" value={form.distanceKm} onChange={handleChange} />
        </div>
        <div className="space-y-1.5">
          <Label>Est. Minutes</Label>
          <Input name="estimatedMinutes" type="number" value={form.estimatedMinutes} onChange={handleChange} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as Route['status'] }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Stops (one per line, in order)</Label>
        <textarea
          name="stopsText"
          value={form.stopsText}
          onChange={handleChange}
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          placeholder={"Colombo Fort\nPettah\nDematagoda\nKandy"}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage bus routes</p>
        </div>
        <Button onClick={openAdd}><Plus size={16} className="mr-2" /> Add Route</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Routes ({routes.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : routes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No routes found</TableCell></TableRow>
              ) : (
                routes.map((r) => (
                  <React.Fragment key={r._id}>
                    <TableRow>
                      <TableCell className="font-medium">{r.routeNumber}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-sm">{r.startPoint} → {r.endPoint}</TableCell>
                      <TableCell className="text-sm">{r.fare != null ? `LKR ${r.fare}` : '—'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {(r.stops ?? []).length} stops
                          {expandedId === r._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'active' ? 'success' : 'secondary'}>
                          {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                                <Trash2 size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Route</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete route <strong>{r.routeNumber} — {r.name}</strong>? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(r._id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === r._id && (
                      <TableRow className="bg-muted">
                        <TableCell colSpan={7} className="py-3 px-6">
                          <div className="flex flex-wrap gap-2">
                            {(r.stops ?? [])
                              .sort((a, b) => a.order - b.order)
                              .map((s, i, arr) => (
                                <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin size={11} className="text-primary" />
                                  <span>{s.name}</span>
                                  {i < arr.length - 1 && <span className="text-muted-foreground ml-1">›</span>}
                                </div>
                              ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Route</DialogTitle></DialogHeader>
          {FormBody}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Add Route'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRoute} onOpenChange={(o) => { if (!o) setEditRoute(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Route — {editRoute?.routeNumber}</DialogTitle></DialogHeader>
          {FormBody}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoute(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
