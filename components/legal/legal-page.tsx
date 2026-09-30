import Link from 'next/link';
import { ArrowLeft, CalendarCheck2 } from 'lucide-react';

type LegalSection = { title: string; paragraphs: string[] };

export function LegalPage({ title, summary, sections }: { title: string; summary: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#172033]">
      <header className="border-b border-[#DFE3EA] bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5146D8] text-white">
              <CalendarCheck2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            Calora
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-[#526078] hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5146D8]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <dl className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-[#526078]">
          <div className="flex items-center gap-1.5">
            <dt className="font-semibold text-[#172033]">Effective date:</dt>
            <dd>September 30, 2026</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="font-semibold text-[#172033]">Last updated:</dt>
            <dd>September 30, 2026</dd>
          </div>
        </dl>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#526078]">{summary}</p>
        <div className="mt-12 space-y-10">
          {sections.map((section) => {
            const id = section.title.replaceAll(' ', '-').toLowerCase();
            return (
              <section key={section.title} aria-labelledby={id}>
                <h2 id={id} className="text-xl font-bold tracking-[-0.02em]">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#526078] sm:text-base">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
