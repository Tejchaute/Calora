import Link from 'next/link';
import { ArrowLeft, CalendarCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF9F7] px-5 py-16 text-[#172033]">
      <div className="w-full max-w-xl text-center">
        <Link href="/" className="mx-auto inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8] focus-visible:ring-offset-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5146D8] text-white">
            <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-[-0.025em]">Calora</span>
        </Link>
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[#5146D8]">Error 404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Page not found</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#526078]">
          The page may have moved, or the address may be incorrect. Return to Calora to continue.
        </p>
        <Button asChild className="mt-8 bg-[#5146D8] text-white hover:bg-[#3E35B6]">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to homepage
          </Link>
        </Button>
      </div>
    </main>
  );
}
