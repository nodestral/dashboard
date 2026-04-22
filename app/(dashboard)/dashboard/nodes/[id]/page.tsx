'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { nodes } from '@/lib/api';
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Globe, Clock, Package, Shield } from 'lucide-react';

interface NodeDetail {
  id: string;
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  cpu_cores: number;
  ram_mb: number;
  disk_gb: number;
  provider: string;
  region: string;
  public_ip: string;
  private_ip: string;
  status: string;
  last_heartbeat: string | null;
}

interface Metrics {
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  disk_percent: number;
  disk_used_gb: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  load_1m: number;
  load_5m: number;
  time: string;
}

// Helpers
const NOISY_SERVICES = new Set([
  'dbus', 'getty@tty1', 'serial-getty@ttyS0', 'polkit', 'rsyslog',
  'snapd', 'systemd-journald', 'systemd-logind', 'systemd-networkd',
  'systemd-resolved', 'systemd-udevd', 'multipathd', 'udisks2',
  'upower', 'ModemManager', 'networkd-dispatcher', 'fwupd',
  'unattended-upgrades', 'cron', 'ssh',
]);
const NOTABLE_SERVICES = new Set([
  'nginx', 'mariadb', 'mysql', 'postgresql', 'redis', 'docker',
  'nodestral-api', 'nodestral-web', 'openclaw-gatewa',
]);

function filterServices(services: any[]): any[] {
  return services
    .filter((s: any) => NOTABLE_SERVICES.has(s.name) || s.version || !NOISY_SERVICES.has(s.name))
    .slice(0, 20);
}

function dedupPorts(ports: any[]): any[] {
  const seen = new Set<number>();
  return ports.filter((p: any) => { if (seen.has(p.port)) return false; seen.add(p.port); return true; });
}

function certDaysLeft(cert: any): number {
  try {
    return Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86400000);
  } catch { return 999; }
}

function parseDiscoveryField(raw: any): any[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

function parseDiscoveryObj(raw: any): any {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

function Bar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 80 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <span style={{ width: 32, color: 'var(--text-tertiary)' }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ width: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{value.toFixed(1)}%</span>
    </div>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)}MB`;
  return `${(b / 1073741824).toFixed(1)}GB`;
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'running' || status === 'active' || status === 'Up';
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 10,
      background: isActive ? 'rgba(34,197,94,0.1)' : 'var(--bg-tertiary)',
      color: isActive ? 'var(--success)' : 'var(--text-tertiary)',
    }}>
      {status}
    </span>
  );
}

function SecurityItem({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: status === 'warn' ? 'var(--warning)' : 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

export default function NodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<Metrics[]>([]);
  const [discovery, setDiscovery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'metrics' | 'discovery'>('overview');

  const load = async () => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    try {
      const res = await nodes.get(token, id);
      setNode(res.node);
      setMetrics(res.metrics || null);
      setDiscovery(res.discovery || null);
      const histRes = await nodes.getMetrics(token, id, '1h');
      setMetricsHistory(histRes.metrics || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-10" style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>;
  if (error || !node) return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error || 'Node not found'}</p>
      <Link href="/dashboard" style={{ fontSize: 13 }} className="mt-2 inline-block">Back to nodes</Link>
    </div>
  );

  const isOnline = node.last_heartbeat && (Date.now() - new Date(node.last_heartbeat!).getTime()) < 120000;
  const statusColor = isOnline ? 'var(--success)' : 'var(--danger)';

  // Parse discovery data
  const discServices = filterServices(parseDiscoveryField(discovery?.services));
  const discPackages = parseDiscoveryField(discovery?.packages);
  const discContainers = parseDiscoveryField(discovery?.containers);
  const discPorts = dedupPorts(parseDiscoveryField(discovery?.ports));
  const discCerts = parseDiscoveryField(discovery?.certificates);
  const discSSH = parseDiscoveryField(discovery?.ssh_users);
  const discMonitoring = parseDiscoveryField(discovery?.monitoring_tools);
  const discFirewall = parseDiscoveryObj(discovery?.firewall);
  const discUpdates = parseDiscoveryObj(discovery?.updates);

  const alertCount = (discUpdates?.critical || 0) + discCerts.filter((c: any) => certDaysLeft(c) < 30).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/dashboard" style={{ color: 'var(--text-tertiary)', fontSize: 13 }} className="flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> Back to nodes
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="status-dot" style={{ background: statusColor }} />
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>{node.hostname}</h1>
          {node.provider && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
              {node.provider} · {node.region}
            </span>
          )}
        </div>
        {node.last_heartbeat && (
          <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            <Clock size={12} /> Last heartbeat: {new Date(node.last_heartbeat).toLocaleString()}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1" style={{ borderRadius: 8, background: 'var(--bg-secondary)' }}>
        {(['overview', 'metrics', 'discovery'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1" style={{
              fontSize: 13, fontWeight: 500, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t ? 'var(--bg-card)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              border: tab === t ? '1px solid var(--border-primary)' : '1px solid transparent',
            }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 16 }}>System</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {([
                ['OS', node.os], ['Kernel', node.kernel], ['Architecture', node.arch],
                ['Public IP', node.public_ip || '-'], ['Private IP', node.private_ip || '-'],
                ['CPU', `${node.cpu_cores} cores`], ['RAM', `${node.ram_mb} MB (${(node.ram_mb / 1024).toFixed(1)} GB)`],
                ['Disk', `${node.disk_gb} GB`],
              ] as const).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 16 }}>Current Metrics</h3>
            {metrics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Bar label="CPU" value={metrics.cpu_percent} />
                <Bar label="RAM" value={metrics.ram_percent} />
                <Bar label="Disk" value={metrics.disk_percent} />
                <div style={{ paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                  {([
                    ['Load (1m / 5m)', `${metrics.load_1m.toFixed(2)} / ${metrics.load_5m.toFixed(2)}`],
                    ['RAM used', `${metrics.ram_used_mb} MB`],
                    ['Network (rx/tx)', `${formatBytes(metrics.net_rx_bytes)} / ${formatBytes(metrics.net_tx_bytes)}`],
                  ] as const).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
                      <span>{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No metrics yet. Waiting for heartbeat...</p>
            )}
          </div>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="card">
          <h3 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            Last Hour ({metricsHistory.length} data points)
          </h3>
          {metricsHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'CPU', key: 'cpu_percent' as const },
                { label: 'RAM', key: 'ram_percent' as const },
                { label: 'Disk', key: 'disk_percent' as const },
              ].map(({ label, key }) => {
                const values = metricsHistory.map(m => m[key]);
                const latest = values[0] || 0;
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const max = Math.max(...values);
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-tertiary)' }}>
                      <span>{label}</span>
                      <span>Current: {latest.toFixed(1)}% · Avg: {avg.toFixed(1)}% · Max: {max.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 32, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                      {[...values].reverse().slice(-60).map((v, i) => (
                        <div key={i} style={{
                          flex: 1, borderRadius: '2px 2px 0 0', minWidth: 0,
                          height: `${Math.max(v, 1)}%`,
                          background: v > 80 ? 'var(--danger)' : v > 60 ? 'var(--warning)' : 'var(--accent)',
                          opacity: 0.6 + (i / 60) * 0.4,
                        }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No metric history yet.</p>
          )}
        </div>
      )}

      {tab === 'discovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Security Overview */}
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <SecurityItem label="Firewall"
              value={discFirewall ? `${discFirewall.type} · ${discFirewall.rules} rules` : 'None detected'}
              status={discFirewall?.status === 'active' ? 'ok' : 'warn'} />
            <SecurityItem label="OS Updates"
              value={discUpdates ? `${discUpdates.pending} pending` : 'Unknown'}
              status={(discUpdates?.critical || 0) > 0 ? 'warn' : 'ok'} />
            <SecurityItem label="SSH Users"
              value={discSSH.length.toString()}
              status={discSSH.length > 3 ? 'warn' : 'ok'} />
            <SecurityItem label="Certificates"
              value={discCerts.length.toString()}
              status={discCerts.some((c: any) => certDaysLeft(c) < 30) ? 'warn' : 'ok'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Services */}
            {discServices.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Package size={14} /> Services
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discServices.length}</span>
                </div>
                {discServices.map((s: any) => (
                  <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.version && <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{s.version}</span>}
                      <StatusBadge status={s.status} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Ports */}
            {discPorts.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Globe size={14} /> Listening Ports
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discPorts.length}</span>
                </div>
                {discPorts.map((p: any) => (
                  <div key={p.port} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>:{p.port}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p.process || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Packages */}
            {discPackages.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Package size={14} /> Installed Packages
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discPackages.length}</span>
                </div>
                {discPackages.map((p: any) => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                    <span>{p.name}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{p.version}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Certificates */}
            {discCerts.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Globe size={14} /> Certificates
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discCerts.length}</span>
                </div>
                {discCerts.map((c: any) => {
                  const days = certDaysLeft(c);
                  return (
                    <div key={c.domain} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                      <span>{c.domain}</span>
                      <span style={{ color: days < 30 ? 'var(--danger)' : 'var(--text-tertiary)', fontSize: 11 }}>
                        {days}d left · {c.issuer}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Containers */}
            {discContainers.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Package size={14} /> Containers
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discContainers.length}</span>
                </div>
                {discContainers.map((c: any) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                    <span>{c.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{c.image}</span>
                      <StatusBadge status={c.status} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* SSH Users */}
            {discSSH.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Shield size={14} /> SSH Users
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discSSH.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {discSSH.map((u: string) => (
                    <span key={u} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{u}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Monitoring */}
            {discMonitoring.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <Shield size={14} /> Monitoring
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{discMonitoring.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {discMonitoring.map((t: string) => (
                    <span key={t} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {discServices.length === 0 && discPorts.length === 0 && discPackages.length === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32 }}>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No discovery data yet. The agent scans every 5 minutes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
