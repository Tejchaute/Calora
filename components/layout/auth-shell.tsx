'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-gradient-to-b from-primary/[0.08] via-primary/[0.025] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/[0.055] blur-3xl"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex justify-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            aria-label="Calora home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-elevation-1 transition-transform group-hover:-translate-y-px">
              <Calendar className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">Calora</span>
          </Link>
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.24 }}
            className="w-full rounded-2xl border border-border/75 bg-card/65 p-5 shadow-elevation-2 sm:p-8"
          >
            {children}
          </motion.div>
        </main>

        <footer className="text-center">
          <p className="text-xs text-muted-foreground">
            Simple scheduling for modern businesses
          </p>
          <p className="mt-1.5 text-[0.68rem] text-muted-foreground/70">
            © 2026 Calora
          </p>
        </footer>
      </div>
    </div>
  );
}
