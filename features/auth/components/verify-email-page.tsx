  'use client';

  import { useState } from 'react';
  import Link from 'next/link';
  import { useSearchParams } from 'next/navigation';
  import { MailCheck, MailWarning, ArrowRight } from 'lucide-react';
  import { toast } from 'sonner';

  import { Button } from '@/components/ui/button';
  import { LoadingButton } from '@/components/shared/loading-button';
  import { InlineAlert } from '@/components/shared/inline-alert';
  import { resendVerificationEmail } from '../services/auth.service';
  import { AuthError } from '@/lib/auth/errors';
  import { AUTH_ROUTES } from '@/lib/auth/redirects';

  export function VerifyEmailPage() {
    const params = useSearchParams();
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
        await resendVerificationEmail(email, `${window.location.origin}${AUTH_ROUTES.dashboard}`);
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
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            isVerified ? 'bg-success/15' : 'bg-warning/15'
          }`}
        >
          {isVerified ? (
            <MailCheck className="h-6 w-6 text-success" />
          ) : (
            <MailWarning className="h-6 w-6 text-warning" />
          )}
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
          {isVerified ? 'Email verified' : 'Verify your email'}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
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
              <Button className="h-12 w-full rounded-xl">
                Go to dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <LoadingButton
                onClick={handleResend}
                loading={resending}
                className="h-12 w-full rounded-xl"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
                {!resending && <ArrowRight className="ml-2 h-4 w-4" />}
              </LoadingButton>
              <Link href="/login">
                <Button variant="outline" className="h-12 w-full rounded-xl">
                  Back to sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }
