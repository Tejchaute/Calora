import { Calendar } from 'lucide-react';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Schedora</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">
            Smart appointment booking for every business.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Manage appointments, customers, and staff — all in one beautiful dashboard.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <div>
              <div className="text-2xl font-bold text-white">2,000+</div>
              <div className="text-sm text-slate-500">Businesses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">1M+</div>
              <div className="text-sm text-slate-500">Appointments booked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-sm text-slate-500">Uptime</div>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-500">© 2025 Schedora. All rights reserved.</p>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
