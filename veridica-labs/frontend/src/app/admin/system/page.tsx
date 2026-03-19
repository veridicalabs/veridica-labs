"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SystemHealth {
  status: string;
  database: { connected: boolean; latencyMs: number };
  tables: { campaigns: number; leads: number; conversions: number; conversations: number };
  uptime: number;
  memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number };
  nodeVersion: string;
  recentEvents: {
    id: string;
    type: string;
    message: string;
    metadata?: unknown;
    createdAt: string;
  }[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

const eventTypeColors: Record<string, string> = {
  API_REQUEST: "bg-blue-100 text-blue-700",
  ERROR: "bg-red-100 text-red-700",
  ESCROW_DEPOSIT: "bg-green-100 text-green-700",
  ESCROW_RELEASE: "bg-emerald-100 text-emerald-700",
  AGENT_CALL: "bg-purple-100 text-purple-700",
};

export default function SystemPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    api.admin.getSystemHealth().then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  if (loading && !data) return <div className="text-gray-500">Loading system health...</div>;
  if (!data) return <div className="text-red-500">Failed to load system health</div>;

  const heapPct = data.memoryUsage.heapTotal > 0 ? (data.memoryUsage.heapUsed / data.memoryUsage.heapTotal) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">Backend infrastructure, database, and event logs</p>
        </div>
        <button onClick={refresh} className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${
        data.status === "healthy" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
      }`}>
        <span className={`inline-block w-3 h-3 rounded-full ${data.status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
        <span className={`font-semibold ${data.status === "healthy" ? "text-green-700" : "text-red-700"}`}>
          System is {data.status}
        </span>
        <span className="text-sm text-gray-500 ml-auto">Node {data.nodeVersion} &middot; Uptime: {formatUptime(data.uptime)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Database */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Database (PostgreSQL)</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Connection</span>
              <span className={`text-sm font-medium ${data.database.connected ? "text-green-600" : "text-red-600"}`}>
                {data.database.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Latency</span>
              <span className="text-sm font-mono">{data.database.latencyMs}ms</span>
            </div>
            <hr className="border-gray-100" />
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data.tables).map(([table, count]) => (
                <div key={table} className="flex justify-between">
                  <span className="text-xs text-gray-500 capitalize">{table}</span>
                  <span className="text-xs font-mono font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Memory Usage</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Heap Used / Total</span>
                <span>{formatBytes(data.memoryUsage.heapUsed)} / {formatBytes(data.memoryUsage.heapTotal)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${heapPct > 85 ? "bg-red-500" : heapPct > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${heapPct}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">RSS</span>
              <span className="text-sm font-mono">{formatBytes(data.memoryUsage.rss)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">External</span>
              <span className="text-sm font-mono">{formatBytes(data.memoryUsage.external)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Events */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Recent System Events</h3>
        </div>
        {data.recentEvents.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No system events recorded yet. Events will appear here as the platform processes requests.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {data.recentEvents.map((event: any) => (
              <div key={event.id} className="px-6 py-3 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eventTypeColors[event.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {event.type}
                    </span>
                    <span className="text-sm text-gray-700">{event.message}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
