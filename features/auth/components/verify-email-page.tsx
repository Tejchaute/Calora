'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, MailCheck, MailWarning, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { InlineAlert } from '@/components/shared/inline-alert';
import { resendVerificationEmail } from '../services/auth.service';
import { AuthError } from '@/lib/auth/errors';

export function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get('status');
  const email = params.get('email') ?? '';

  const [resending, setResending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const isVerified = status === 'verified';

  const handleResend = async () => {
    if (!email) {
      setAuthError('We don\'t have your email on file. Please sign up again.');
      return;
    }
    setResending(true);
    setAuthError(null);
    try {
      await resendVerificationEmail(email, `${window.location.origin}/dashboard`);
      setResent(true);
      toast.success('Verification email sent.');
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'An unexpected error occurred.';
      setAuthError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Calendar className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground">Calora</span>
      </div>

      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          isVerified ? 'bg-success/15' : 'bg-warning/15'
        }`}
      >
        {isVerified ? (
          <MailCheck className="h-6 w-6 text-success" />
        ) : (
          <MailWarning className="h-6 w-6 text-warning" />
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold text-foreground">
        {isVerified ? 'Email verified' : 'Verify your email'}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isVerified
          ? 'Your email has been verified. You can now access your dashboard.'
          : email
            ? `We sent a verification link to ${email}. Click the link in the email to activate your account.`
            : 'Check your inbox for a verification link from Calora.'}
      </p>

      {authError && (
        <div className="mt-4 text-left">
          <InlineAlert variant="error">{authError}</InlineAlert>
        </div>
      )}

      {resent && !isVerified && (
        <div className="mt-4 text-left">
          <InlineAlert variant="success">Verification email resent. Check your inbox.</InlineAlert>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {isVerified ? (
          <Link href="/dashboard">
            <Button className="w-full">
              Go to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <>
            <LoadingButton
              onClick={handleResend}
              loading={resending}
              className="w-full"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
              {!resending && <ArrowRight className="ml-2 h-4 w-4" />}
            </LoadingButton>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
