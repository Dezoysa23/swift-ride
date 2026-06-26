'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { User, Shield, Lock, Bus, MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface Profile {
  _id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  licenseNumber?: string
  assignedBusId?: {
    _id: string
    busNumber: string
    plateNumber: string
    model: string
  } | null
}

interface ActiveTurn {
  _id: string
  startTime?: string
  routeId?: { name: string; routeNumber: string } | null
  busId?: { busNumber: string } | null
}

export default function DriverProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTurn, setActiveTurn] = useState<ActiveTurn | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingDuty, setTogglingDuty] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Profile form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadProfile()
    loadActiveTurn()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const r = await fetch('/api/driver/profile')
      const d = await r.json()
      if (d.success && d.data) {
        setProfile(d.data)
        setName(d.data.name || '')
        setPhone(d.data.phone || '')
        setLicenseNumber(d.data.licenseNumber || '')
      }
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveTurn() {
    try {
      const r = await fetch('/api/driver/passengers')
      const d = await r.json()
      if (d.success && d.activeTurn) {
        setActiveTurn(d.activeTurn)
      } else {
        setActiveTurn(null)
      }
    } catch {}
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const r = await fetch('/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, licenseNumber }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success('Profile updated')
        setProfile((prev) => (prev ? { ...prev, name, phone, licenseNumber } : prev))
      } else {
        toast.error(d.error || 'Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function toggleDuty() {
    setTogglingDuty(true)
    const newStatus = activeTurn ? 'inactive' : 'active'
    try {
      const r = await fetch('/api/driver/duty-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success(newStatus === 'active' ? 'You are now ON DUTY' : 'You are now OFF DUTY')
        if (newStatus === 'active' && d.data) {
          setActiveTurn(d.data)
        } else {
          setActiveTurn(null)
        }
      } else {
        toast.error(d.error || 'Failed to update duty status')
      }
    } catch {
      toast.error('Failed to update duty status')
    } finally {
      setTogglingDuty(false)
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setChangingPassword(true)
    try {
      const r = await fetch('/api/driver/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(d.error || 'Failed to change password')
      }
    } catch {
      toast.error('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'DR'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and duty settings</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-1.5">
            <User size={14} />
            Profile
          </TabsTrigger>
          <TabsTrigger value="duty" className="gap-1.5">
            <Shield size={14} />
            Duty
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5">
            <Lock size={14} />
            Change Password
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar || ''} alt={profile?.name} />
                  <AvatarFallback className="bg-primary text-white text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{profile?.name}</CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    Driver
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="mt-1 bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="license" className="text-sm">
                    License Number
                  </Label>
                  <Input
                    id="license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="DL-XXXXXXXX"
                    className="mt-1"
                  />
                </div>
              </div>

              {profile?.assignedBusId && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary flex items-center gap-3">
                  <Bus size={16} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-primary font-medium">Assigned Bus</p>
                    <p className="text-sm font-semibold text-primary">
                      {profile.assignedBusId.busNumber} — {profile.assignedBusId.model} (
                      {profile.assignedBusId.plateNumber})
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duty Tab */}
        <TabsContent value="duty">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Duty Status</CardTitle>
              <CardDescription>Toggle your duty status to start or end your shift</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Big toggle */}
              <div
                className={`rounded-xl p-6 border-2 flex items-center justify-between transition-colors ${
                  activeTurn
                    ? 'bg-teal/15 border-teal/40'
                    : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      activeTurn ? 'bg-teal/15' : 'bg-muted'
                    }`}
                  >
                    {activeTurn ? (
                      <CheckCircle2 className="text-teal" size={28} />
                    ) : (
                      <XCircle className="text-muted-foreground" size={28} />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-2xl font-extrabold tracking-wide ${
                        activeTurn ? 'text-teal' : 'text-muted-foreground'
                      }`}
                    >
                      {activeTurn ? 'ON DUTY' : 'OFF DUTY'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activeTurn
                        ? 'Your shift is currently active'
                        : 'Toggle to start your shift'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!activeTurn}
                  onCheckedChange={toggleDuty}
                  disabled={togglingDuty}
                  className="scale-125"
                />
              </div>

              {/* Active turn details */}
              {activeTurn && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Current Turn Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                      <MapPin size={16} className="text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Route</p>
                        <p className="text-sm font-medium text-foreground">
                          {activeTurn.routeId
                            ? `${activeTurn.routeId.routeNumber} — ${activeTurn.routeId.name}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                      <Bus size={16} className="text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bus</p>
                        <p className="text-sm font-medium text-foreground">
                          {activeTurn.busId?.busNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                      <Clock size={16} className="text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Started At</p>
                        <p className="text-sm font-medium text-foreground">
                          {activeTurn.startTime
                            ? new Date(activeTurn.startTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock size={16} className="text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPass" className="text-sm">
                  Current Password
                </Label>
                <Input
                  id="currentPass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newPass" className="text-sm">
                  New Password
                </Label>
                <Input
                  id="newPass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPass" className="text-sm">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={changePassword} disabled={changingPassword}>
                  {changingPassword ? 'Changing…' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
