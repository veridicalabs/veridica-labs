"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AIUsageData {
  summary: {
    totalCalls: number;
    avgLatencyMs: number;
    totalPromptTokens: number;
    totalOutputTokens: number;
  };
  byAction: { action: string; count: number; avgLatencyMs: number }[];
  recentErrors: { id: string; action: string; error: string; createdAt: string }[];
  recentLogs: {
    id: string;
    action: string;
    model: string;
    promptTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    createdAt: string;
  }[];
}

const actionLabels: Record<string, { label: string; color: string }> = {
  GENERATE_AD: { label: "Ad Generation", color: "bg-purple-100 text-purple-700" },
  RESPOND_LEAD: { label: "Lead Response", color: "bg-blue-100 text-blue-700" },
  CONFIRM_CONVERSION: { label: "Conversion Check", color: "bg-green-100 text-green-700" },
};

export default function AIUsagePage() {
  const [data, setData] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .getAIUsage()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading AI usage data...</div>;
  if (!data) return <div className="text-red-500">Failed to load AI usage data</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">AI / OpenClaw Usage</h1>
      <p className="text-sm text-gray-500 mb-6">Monitor Vera agent performance, token consumption, and errors</p>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Total AI Calls</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{data.summary.totalCalls}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Avg Latency</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{data.summary.avgLatencyMs}ms</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Prompt Tokens</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{data.summary.totalPromptTokens.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500">Output Tokens</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{data.summary.totalOutputTokens.toLocaleString()}</p>
        </div>
      </div>

      {/* By Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Usage by Action</h3>
          {data.byAction.length === 0 ? (
            <p className="text-sm text-gray-400">No AI calls recorded yet</p>
          ) : (
            <div className="space-y-3">
              {data.byAction.map((a) => {
                const info = actionLabels[a.action] ?? { label: a.action, color: "bg-gray-100 text-gray-700" };
                const pct = data.summary.totalCalls > 0 ? (a.count / data.summary.totalCalls) * 100 : 0;
                return (
                  <div key={a.action}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>
                      <span className="text-xs text-gray-500">{a.count} calls ({pct.toFixed(0)}%) &middot; {a.avgLatencyMs}ms avg</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Errors</h3>
          {data.recentErrors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-green-600 font-medium">No errors</p>
              <p className="text-xs text-gray-400 mt-1">All AI calls are succeeding</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recentErrors.map((e) => (
                <div key={e.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-700">{e.action}</span>
                    <span className="text-xs text-red-400">{new Date(e.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1 break-all">{e.error}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Recent AI Calls</h3>
        </div>
        {data.recentLogs.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No AI calls logged yet. Calls will appear here once Vera processes requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Model</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Tokens (in/out)</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Latency</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs.map((log) => {
                  const info = actionLabels[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-600">{log.model}</td>
                      <td className="px-4 py-2 text-right text-xs font-mono">{log.promptTokens} / {log.outputTokens}</td>
                      <td className="px-4 py-2 text-right text-xs font-mono">{log.latencyMs}ms</td>
                      <td className="px-4 py-2 text-center">
                        {log.success ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Success" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Failed" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
