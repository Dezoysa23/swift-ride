'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface SystemSettings {
  appName: string
  currency: string
  defaultFare: number
  maxSeatsPerBooking: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'Swift Ride',
    currency: 'LKR',
    defaultFare: 100,
    maxSeatsPerBooking: 4,
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)

  async function loadSettings() {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin/system-settings')
      const data = await res.json()
      if (res.ok && data.data) setSettings(data.data)
    } catch { toast.error('Failed to load settings') }
    finally { setSettingsLoading(false) }
  }

  useEffect(() => { loadSettings() }, [])

  async function handleSaveSettings() {
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      toast.success('Settings saved')
    } catch { toast.error('Save failed') }
    finally { setSettingsSaving(false) }
  }

  async function handleChangePassword() {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setPwSaving(true)
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Password change failed'); return }
      toast.success('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch { toast.error('Password change failed') }
    finally { setPwSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">System configuration and account settings</p>
      </div>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure general application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {settingsLoading ? (
                <p className="text-sm text-muted-foreground">Loading settings…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="appName">Application Name</Label>
                      <Input
                        id="appName"
                        value={settings.appName}
                        onChange={(e) => setSettings((p) => ({ ...p, appName: e.target.value }))}
                        placeholder="Swift Ride"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={settings.currency}
                        onChange={(e) => setSettings((p) => ({ ...p, currency: e.target.value }))}
                        placeholder="LKR"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="defaultFare">Default Fare</Label>
                      <Input
                        id="defaultFare"
                        type="number"
                        value={settings.defaultFare}
                        onChange={(e) => setSettings((p) => ({ ...p, defaultFare: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="maxSeats">Max Seats Per Booking</Label>
                      <Input
                        id="maxSeats"
                        type="number"
                        value={settings.maxSeatsPerBooking}
                        onChange={(e) => setSettings((p) => ({ ...p, maxSeatsPerBooking: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                      {settingsSaving ? 'Saving…' : 'Save Settings'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your admin account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                />
              </div>
              <div className="pt-2">
                <Button onClick={handleChangePassword} disabled={pwSaving}>
                  {pwSaving ? 'Changing…' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
