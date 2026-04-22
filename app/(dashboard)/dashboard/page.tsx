'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { nodes } from '@/lib/api';
import { Server, RefreshCw, AlertCircle } from 'lucide-react';

interface Node {
  id: string;
  hostname: string;
  os: string;
  provider: string;
  region: string;
  status: string;
  last_heartbeat: string | null;
  cpu_cores: number;
  ram_mb: number;
  disk_gb: number;
}

export default function DashboardPage() {
  const [nodeList, setNodeList] = useState<Node[]>([]);
  const [unclaimed, setUnclaimed] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [nodesRes, unclaimedRes] = await Promise.all([
        nodes.list(token),
        nodes.unclaimed(token),
      ]);
      setNodeList(nodesRes.nodes || []);
      setUnclaimed(unclaimedRes.nodes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const claim = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setClaiming(id);
    try {
      await nodes.claim(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(null);
    }
  };

  const timeAgo = (date: string | null) => {
    if (!date) return 'never';
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const statusColor = (status: string, hb: string | null) => {
    if (!hb) return 'status-dot-offline';
    const s = (Date.now() - new Date(hb).getTime()) / 1000;
    if (s > 120) return 'status-dot-offline';
    if (s > 60) return 'status-dot-warning';
    return 'status-dot-online';
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Nodes</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            {nodeList.length} registered · {unclaimed.length} unclaimed
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary text-[13px]">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-[13px] flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {unclaimed.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Unclaimed Nodes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unclaimed.map(n => (
              <div key={n.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`status-dot ${statusColor(n.status, n.last_heartbeat)}`} />
                  <div>
                    <div className="text-[13px] font-medium">{n.hostname}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {n.provider || 'unknown'} · {n.os}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => claim(n.id)}
                  className="btn btn-primary text-[12px] px-3 py-1.5"
                  disabled={claiming === n.id}
                >
                  {claiming === n.id ? '...' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {nodeList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nodeList.map(n => (
            <Link key={n.id} href={`/dashboard/nodes/${n.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card hover:border-[var(--accent)] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`status-dot ${statusColor(n.status, n.last_heartbeat)}`} />
                    <span className="text-[13px] font-medium">{n.hostname}</span>
                  </div>
                  {n.provider && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                      {n.provider}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  <div><span className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{n.cpu_cores}</span>CPU cores</div>
                  <div><span className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{Math.round(n.ram_mb / 1024)}GB</span>RAM</div>
                  <div><span className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{n.disk_gb}GB</span>Disk</div>
                </div>
                <div className="mt-3 pt-2 text-[11px] flex justify-between" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                  <span>{n.os}</span>
                  <span>Last seen: {timeAgo(n.last_heartbeat)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Server size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            {unclaimed.length > 0 ? 'Claim your nodes above to get started' : 'No nodes yet. Install the agent on a server.'}
          </p>
        </div>
      )}
    </div>
  );
}
