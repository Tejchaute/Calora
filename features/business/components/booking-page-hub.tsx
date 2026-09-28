'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Copy, Download, ExternalLink, Link2, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusiness } from '@/features/business/hooks/use-business';
import { copyBookingPageUrl, getBookingPageUrl } from '@/features/business/utils/booking-page-url';

const COPY_RESET_MS = 2200;

export function BookingPageHub() {
  const { business, settings, loading, error, refresh } = useBusiness();
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL ?? '');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin);
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [origin]);

  const bookingUrl = useMemo(
    () => getBookingPageUrl(settings?.booking_page_slug ?? '', origin),
    [origin, settings?.booking_page_slug]
  );

  const handleCopy = async () => {
    if (!bookingUrl) return;
    try {
      await copyBookingPageUrl(bookingUrl, navigator.clipboard);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error('Unable to copy the link. Select and copy the URL instead.');
    }
  };

  const handleDownload = () => {
    if (!bookingUrl || !qrCanvasRef.current) return;
    const download = document.createElement('a');
    download.href = qrCanvasRef.current.toDataURL('image/png');
    download.download = `${settings?.booking_page_slug ?? 'calora-booking'}-qr.png`;
    download.click();
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading booking page details">
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-foreground">Booking page details unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">We could not load your booking page details. Please try again.</p>
          <Button className="mt-5" onClick={() => void refresh()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!bookingUrl) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your booking page</h1>
          <p className="mt-1 text-sm text-muted-foreground">Give customers a simple way to book appointments with your business.</p>
        </div>
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-start p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
              <Link2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-foreground">Set your booking page address</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Choose a public booking slug in Settings before sharing your page with customers.</p>
            <Button asChild className="mt-5"><Link href="/dashboard/settings">Open settings</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.2 };
  const displayName = settings?.business_name || business?.name || 'Your business';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your booking page</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Give customers a simple way to book appointments with your business.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="h-5 w-5 text-primary" aria-hidden="true" /> Public booking link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer booking URL</p>
            <p className="mt-2 text-sm font-medium text-foreground [overflow-wrap:anywhere] sm:text-base">{bookingUrl}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCopy} className="min-h-11 sm:min-w-32">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={copied ? 'copied' : 'copy'} className="flex items-center" initial={reduceMotion ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -3 }} transition={transition}>
                  {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                  <span aria-live="polite">{copied ? 'Copied' : 'Copy link'}</span>
                </motion.span>
              </AnimatePresence>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />Open booking page</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
          <Card className="h-full">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base font-semibold"><QrCode className="h-5 w-5 text-primary" aria-hidden="true" />Share with a QR code</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <figure className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <QRCodeCanvas ref={qrCanvasRef} value={bookingUrl} size={184} level="M" marginSize={1} aria-label={`QR code for ${displayName} booking page`} />
                <figcaption className="sr-only">Scan to open {bookingUrl}</figcaption>
              </figure>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Customers can scan this code to open your booking page. The code contains only your public booking URL.</p>
              <Button variant="outline" className="mt-5 min-h-11" onClick={handleDownload}><Download className="mr-2 h-4 w-4" aria-hidden="true" />Download QR</Button>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="h-full">
          <CardHeader><CardTitle className="text-base font-semibold">Customer view</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border bg-muted/35 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">{displayName.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0"><p className="truncate font-semibold text-foreground">{displayName}</p><p className="text-xs text-muted-foreground">Online appointment booking</p></div>
              </div>
              <h2 className="mt-6 text-lg font-semibold text-foreground">Book an appointment</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a service and a convenient time. We’ll guide you through the rest.</p>
              <div className="mt-5 flex items-center gap-2" aria-label="Five-step booking process preview">
                {[1, 2, 3, 4, 5].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step === 1 ? 'bg-primary' : 'bg-border'}`} />)}
              </div>
            </div>
            <Button asChild variant="ghost" className="mt-4 w-full justify-between">
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">View customer experience <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
