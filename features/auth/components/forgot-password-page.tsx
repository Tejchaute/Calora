'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { resetPassword } from '../services/auth.service';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email, `${window.location.origin}/reset-password`);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-slate-900">Schedora</span>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-slate-600">
            {"We've sent a password reset link to "}
            <span className="font-medium text-slate-900">{email}</span>.
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            {"Enter your email and we'll send you a link to reset your password."}
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            Remember your password?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
