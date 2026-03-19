"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface CampaignAnalytics {
  id: string;
  name: string;
  status: string;
  budget: number;
  spent: number;
  costPerConversion: number;
  conversionRate: string;
  roi: string;
  _count: { leads: number; conversions: number };
}

function BarChart({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .getLeadAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading analytics...</div>;

  const totalLeads = data.reduce((s, c) => s + c._count.leads, 0);
  const totalConversions = data.reduce((s, c) => s + c._count.conversions, 0);
  const totalSpent = data.reduce((s, c) => s + c.spent, 0);
  const overallRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : "0";
  const maxLeads = Math.max(...data.map((c) => c._count.leads), 1);
  const maxConversions = Math.max(...data.map((c) => c._count.conversions), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Leads & Conversions Analytics</h1>
      <p className="text-sm text-gray-500 mb-6">Funnel performance and ROI by campaign</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total Leads</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalLeads}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total Conversions</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalConversions}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Overall Conversion Rate</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{overallRate}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total Spend</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">${totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* Per-Campaign Breakdown */}
      {data.length === 0 ? (
        <p className="text-gray-500">No campaign data yet.</p>
      ) : (
        <div className="space-y-4">
          {data.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === "ACTIVE" ? "bg-green-100 text-green-700" : c.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Cost per conversion</p>
                  <p className="font-mono font-medium">${c.costPerConversion.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Leads ({c._count.leads})</p>
                  <BarChart value={c._count.leads} max={maxLeads} color="bg-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Conversions ({c._count.conversions})</p>
                  <BarChart value={c._count.conversions} max={maxConversions} color="bg-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conv. Rate</p>
                  <p className={`text-lg font-bold ${parseFloat(c.conversionRate) > 10 ? "text-green-600" : parseFloat(c.conversionRate) > 5 ? "text-yellow-600" : "text-red-500"}`}>
                    {c.conversionRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Budget / Spent</p>
                  <p className="text-sm font-mono">${c.spent.toFixed(2)} / ${c.budget.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ROI</p>
                  <p className={`text-lg font-bold ${parseFloat(c.roi) > 0 ? "text-green-600" : "text-red-500"}`}>
                    {c.roi}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
