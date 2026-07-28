import { AuthShell } from '@/components/layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
