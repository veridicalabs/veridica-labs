"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Metrics {
  campaigns: { total: number; active: number };
  leads: { total: number };
  conversions: { total: number; paid: number; rate: number };
  financial: { totalBudget: number; totalDeposited: number; totalSpent: number; remaining: number };
  ai: { totalCalls: number };
  recentActivity: {
    leads: string[];
    conversions: { date: string; amount: number }[];
  };
}

function KPICard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ActivityItem({ label, time }: { label: string; time: string }) {
  const date = new Date(time);
  const ago = getTimeAgo(date);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-xs text-gray-400">{ago}</span>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AdminOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading metrics...</div>;
  if (!metrics) return <div className="text-red-500">Failed to load metrics</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time platform metrics and activity</p>
        </div>
        <button
          onClick={() => { setLoading(true); api.admin.getMetrics().then(setMetrics).finally(() => setLoading(false)); }}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Active Campaigns" value={metrics.campaigns.active} subtitle={`${metrics.campaigns.total} total`} color="text-indigo-600" />
        <KPICard title="Total Leads" value={metrics.leads.total} color="text-blue-600" />
        <KPICard title="Conversions" value={metrics.conversions.total} subtitle={`${metrics.conversions.rate}% rate`} color="text-green-600" />
        <KPICard title="Revenue (Paid)" value={`$${metrics.financial.totalSpent.toFixed(2)}`} subtitle={`$${metrics.financial.remaining.toFixed(2)} remaining`} color="text-emerald-600" />
      </div>

      {/* Financial Summary + AI Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Budget</p>
              <p className="text-lg font-bold text-gray-900">${metrics.financial.totalBudget.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deposited</p>
              <p className="text-lg font-bold text-blue-600">${metrics.financial.totalDeposited.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Spent</p>
              <p className="text-lg font-bold text-orange-600">${metrics.financial.totalSpent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-lg font-bold text-green-600">${metrics.financial.remaining.toFixed(2)}</p>
            </div>
          </div>
          {/* Budget utilization bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Budget Utilization</span>
              <span>{metrics.financial.totalBudget > 0 ? ((metrics.financial.totalSpent / metrics.financial.totalBudget) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${metrics.financial.totalBudget > 0 ? Math.min((metrics.financial.totalSpent / metrics.financial.totalBudget) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">AI Agent (OpenClaw)</h3>
          <p className="text-3xl font-bold text-purple-600">{metrics.ai.totalCalls}</p>
          <p className="text-xs text-gray-500 mt-1">Total AI calls</p>
          <div className="mt-4">
            <Link href="/admin/ai-usage" className="text-xs text-primary hover:underline">
              View detailed usage &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Leads</h3>
          {metrics.recentActivity.leads.length === 0 ? (
            <p className="text-sm text-gray-400">No recent leads</p>
          ) : (
            <div>
              {metrics.recentActivity.leads.slice(0, 8).map((date, i) => (
                <ActivityItem key={i} label={`New lead captured`} time={date} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Conversions</h3>
          {metrics.recentActivity.conversions.length === 0 ? (
            <p className="text-sm text-gray-400">No recent conversions</p>
          ) : (
            <div>
              {metrics.recentActivity.conversions.slice(0, 8).map((c, i) => (
                <ActivityItem key={i} label={`Conversion: $${c.amount.toFixed(2)}`} time={c.date} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Manage Campaigns", href: "/admin/campaigns", bg: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
          { label: "View Analytics", href: "/admin/analytics", bg: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
          { label: "AI Usage", href: "/admin/ai-usage", bg: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
          { label: "System Health", href: "/admin/system", bg: "bg-green-50 text-green-700 hover:bg-green-100" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className={`p-4 rounded-lg text-sm font-medium text-center transition ${link.bg}`}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
