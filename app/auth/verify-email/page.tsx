import { Suspense } from 'react'
import Link from 'next/link'
import { CardContent, CardFooter } from '@/components/ui/card'
import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailForm } from './verify-email-form'

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify your email" description="Enter the code we emailed you to activate your account.">
      <Suspense
        fallback={
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">Loading…</p>
          </CardContent>
        }
      >
        <VerifyEmailForm />
      </Suspense>
      <CardFooter className="justify-center pb-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </AuthShell>
  )
}
