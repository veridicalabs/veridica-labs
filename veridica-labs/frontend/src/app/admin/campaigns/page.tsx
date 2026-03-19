"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AdminCampaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  costPerConversion: number;
  deposited: number;
  spent: number;
  status: string;
  createdAt: string;
  _count: { leads: number; conversions: number; conversations: number };
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCampaigns = () => {
    setLoading(true);
    api.admin
      .getCampaigns({ status: filter || undefined, search: search || undefined })
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCampaigns(); }, [filter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      await api.admin.updateCampaignStatus(id, newStatus);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}" and all its data? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      await api.admin.deleteCampaign(id);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Campaign Management</h1>
      <p className="text-sm text-gray-500 mb-6">Manage, filter, and control all campaigns</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchCampaigns()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <button
          onClick={fetchCampaigns}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition"
        >
          Search
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <p className="text-gray-500">No campaigns found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Budget</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Deposited</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Spent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Leads</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Conversions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Rate</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const rate = c._count.leads > 0 ? ((c._count.conversions / c._count.leads) * 100).toFixed(1) : "0";
                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{c.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">${c.budget.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">${c.deposited.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">${c.spent.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{c._count.leads}</td>
                      <td className="px-4 py-3 text-right">{c._count.conversions}</td>
                      <td className="px-4 py-3 text-right">{rate}%</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {actionLoading === c.id ? (
                            <span className="text-xs text-gray-400">Processing...</span>
                          ) : (
                            <>
                              {c.status === "ACTIVE" && (
                                <button onClick={() => handleStatusChange(c.id, "PAUSED")} className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition">
                                  Pause
                                </button>
                              )}
                              {c.status === "PAUSED" && (
                                <button onClick={() => handleStatusChange(c.id, "ACTIVE")} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition">
                                  Resume
                                </button>
                              )}
                              {c.status !== "COMPLETED" && (
                                <button onClick={() => handleStatusChange(c.id, "COMPLETED")} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition">
                                  Complete
                                </button>
                              )}
                              <button onClick={() => handleDelete(c.id, c.name)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {campaigns.length > 0 && (
        <div className="mt-4 flex gap-6 text-xs text-gray-500">
          <span>{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</span>
          <span>Total budget: ${campaigns.reduce((s, c) => s + c.budget, 0).toFixed(2)}</span>
          <span>Total leads: {campaigns.reduce((s, c) => s + c._count.leads, 0)}</span>
          <span>Total conversions: {campaigns.reduce((s, c) => s + c._count.conversions, 0)}</span>
        </div>
      )}
    </div>
  );
}
