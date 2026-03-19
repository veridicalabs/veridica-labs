"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface FinancialData {
  totals: { budget: number; deposited: number; spent: number; remaining: number };
  campaigns: {
    id: string;
    name: string;
    budget: number;
    deposited: number;
    spent: number;
    status: string;
    costPerConversion: number;
    _count: { conversions: number };
  }[];
  recentConversions: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    campaign: { name: string };
    lead: { name: string };
  }[];
}

export default function FinancialPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .getFinancialOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading financial data...</div>;
  if (!data) return <div className="text-red-500">Failed to load financial data</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Financial Overview</h1>
      <p className="text-sm text-gray-500 mb-6">Escrow balances, payments, and campaign economics</p>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${data.totals.budget.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total Deposited</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">${data.totals.deposited.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">${data.totals.spent.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Remaining in Escrow</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${data.totals.remaining.toFixed(2)}</p>
        </div>
      </div>

      {/* Campaign Financial Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Campaign Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Campaign</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Budget</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Deposited</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Spent</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Remaining</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Conversions</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">CPC</th>
                <th className="px-4 py-2 font-medium text-gray-600">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => {
                const remaining = c.deposited - c.spent;
                const utilization = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "ACTIVE" ? "bg-green-100 text-green-700" : c.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">${c.budget.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${c.deposited.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${c.spent.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${remaining.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{c._count.conversions}</td>
                    <td className="px-4 py-3 text-right font-mono">${c.costPerConversion.toFixed(2)}</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${utilization > 80 ? "bg-red-500" : utilization > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{utilization.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Conversions */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Recent Conversion Payments</h3>
        </div>
        {data.recentConversions.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No conversions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Campaign</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Lead</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentConversions.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-700">{c.campaign.name}</td>
                    <td className="px-4 py-2 text-gray-700">{c.lead.name}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">${c.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
