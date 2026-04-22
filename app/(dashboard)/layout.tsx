'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../theme-provider';
import { Sun, Moon, Menu, X, Server, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    const e = localStorage.getItem('email');
    if (!t && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    } else if (t) {
      setToken(t);
      setEmail(e || '');
    }
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    router.push('/login');
  };

  const isAuth = pathname === '/login' || pathname === '/register';

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Server size={12} className="text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Nodestral</span>
          </Link>

          {!isAuth && token && (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="hidden md:block text-[13px]" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Nodes
              </Link>
              <button onClick={toggle} className="theme-toggle" aria-label="Toggle theme">
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <span className="hidden md:block text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{email}</span>
              <button onClick={logout} className="theme-toggle" title="Logout"><LogOut size={14} /></button>
              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden theme-toggle" aria-label="Menu">
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          )}

          {isAuth && (
            <button onClick={toggle} className="theme-toggle" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}
        </div>

        {menuOpen && !isAuth && token && (
          <div className="md:hidden p-4 border-t" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}>
            <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="py-2 px-3 rounded-lg" style={{ textDecoration: 'none' }}>Nodes</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className="py-2 px-3 rounded-lg text-left" style={{ color: 'var(--danger)' }}>Logout</button>
            </div>
          </div>
        )}
      </nav>

      <main>{children}</main>
    </div>
  );
}
