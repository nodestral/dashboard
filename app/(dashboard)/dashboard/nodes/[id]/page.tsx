'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { nodes } from '@/lib/api';
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Globe, Clock } from 'lucide-react';

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

function Bar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 80 ? 'var(--danger)' : pct > 60 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-8" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-10 text-right tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{value.toFixed(1)}%</span>
    </div>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)}MB`;
  return `${(b / 1073741824).toFixed(1)}GB`;
}

export default function NodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-10 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>;
  if (error || !node) return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error || 'Node not found'}</p>
      <Link href="/dashboard" className="text-[13px] mt-2 inline-block">Back to nodes</Link>
    </div>
  );

  const statusColor = node.last_heartbeat ? (() => {
    const s = (Date.now() - new Date(node.last_heartbeat!).getTime()) / 1000;
    if (s > 120) return 'var(--danger)';
    if (s > 60) return 'var(--warning)';
    return 'var(--success)';
  })() : 'var(--danger)';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/dashboard" className="text-[13px] flex items-center gap-1 mb-6" style={{ color: 'var(--text-tertiary)' }}>
        <ArrowLeft size={14} /> Back to nodes
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor }} />
          <h1 className="text-lg font-semibold">{node.hostname}</h1>
          {node.provider && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
              {node.provider} · {node.region}
            </span>
          )}
        </div>
        {node.last_heartbeat && (
          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <Clock size={12} /> Last heartbeat: {new Date(node.last_heartbeat).toLocaleString()}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        {(['overview', 'metrics', 'discovery'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-[13px] font-medium py-2 rounded-md transition"
            style={tab === t ? { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' } : { background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid transparent' }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Specs */}
          <div className="card">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>System</h3>
            <div className="space-y-2.5 text-[13px]">
              {[
                ['OS', node.os],
                ['Kernel', node.kernel],
                ['Architecture', node.arch],
                ['Public IP', node.public_ip || '-'],
                ['Private IP', node.private_ip || '-'],
                ['CPU', `${node.cpu_cores} cores`],
                ['RAM', `${node.ram_mb} MB (${(node.ram_mb / 1024).toFixed(1)} GB)`],
                ['Disk', `${node.disk_gb} GB`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'var(--text-tertiary)' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Current metrics */}
          <div className="card">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Current Metrics</h3>
            {metrics ? (
              <div className="space-y-3">
                <Bar label="CPU" value={metrics.cpu_percent} />
                <Bar label="RAM" value={metrics.ram_percent} />
                <Bar label="Disk" value={metrics.disk_percent} />
                <div className="pt-2 mt-2 space-y-1.5 text-[11px]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Load (1m / 5m)</span>
                    <span>{metrics.load_1m.toFixed(2)} / {metrics.load_5m.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>RAM used</span>
                    <span>{metrics.ram_used_mb} MB</span>
                  </div>
                  <div className="flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Network (rx/tx)</span>
                    <span>{formatBytes(metrics.net_rx_bytes)} / {formatBytes(metrics.net_tx_bytes)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No metrics yet. Waiting for heartbeat...</p>
            )}
          </div>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="card">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Last Hour ({metricsHistory.length} data points)
          </h3>
          {metricsHistory.length > 0 ? (
            <div className="space-y-3">
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
                    <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{label}</span>
                      <span>Current: {latest.toFixed(1)}% · Avg: {avg.toFixed(1)}% · Max: {max.toFixed(1)}%</span>
                    </div>
                    {/* Simple sparkline */}
                    <div className="h-8 flex items-end gap-px">
                      {[...values].reverse().slice(-60).map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm min-w-0"
                          style={{
                            height: `${Math.max(v, 1)}%`,
                            background: v > 80 ? 'var(--danger)' : v > 60 ? 'var(--warning)' : 'var(--accent)',
                            opacity: 0.6 + (i / 60) * 0.4,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No metric history yet.</p>
          )}
        </div>
      )}

      {tab === 'discovery' && (
        <div className="card">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>System Discovery</h3>
          {discovery ? (
            <div className="space-y-4 text-[13px]">
              {discovery.services && (() => {
                try { const s = JSON.parse(discovery.services); return s.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Services</h4>
                    <div className="space-y-1">
                      {s.map((svc: any, i: number) => (
                        <div key={i} className="flex justify-between text-[12px]">
                          <span>{svc.name}</span>
                          <span className="flex items-center gap-2">
                            <span style={{ color: 'var(--text-tertiary)' }}>{svc.version || ''}</span>
                            <span className={`status-dot ${svc.status === 'running' ? 'status-dot-online' : 'status-dot-offline'}`} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ); } catch { return null; }
              })()}
              {discovery.ports && (() => {
                try { const p = JSON.parse(discovery.ports); return p.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Listening Ports</h4>
                    <div className="space-y-1 text-[12px]">
                      {p.map((port: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>:{port.port}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{port.process}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ); } catch { return null; }
              })()}
              {discovery.packages && (() => {
                try { const pkgs = JSON.parse(discovery.packages); return pkgs.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Notable Packages</h4>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {pkgs.map((pkg: any, i: number) => (
                        <span key={i} className="px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {pkg.name} {pkg.version}
                        </span>
                      ))}
                    </div>
                  </div>
                ); } catch { return null; }
              })()}
              {!discovery.services && !discovery.ports && !discovery.packages && (
                <p style={{ color: 'var(--text-tertiary)' }}>No discovery data yet. The agent scans every 5 minutes.</p>
              )}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No discovery data yet. The agent scans every 5 minutes.</p>
          )}
        </div>
      )}
    </div>
  );
}
