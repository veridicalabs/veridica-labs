const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Campaigns
  getCampaigns: () => fetchAPI("/campaign"),
  getCampaign: (id: string) => fetchAPI(`/campaign/${id}`),
  createCampaign: (data: {
    name: string;
    description: string;
    budget: number;
    costPerConversion: number;
  }) => fetchAPI("/campaign", { method: "POST", body: JSON.stringify(data) }),

  // Leads
  simulateLead: (data: {
    campaignId: string;
    name: string;
    email: string;
    message: string;
  }) => fetchAPI("/lead", { method: "POST", body: JSON.stringify(data) }),
  getLeads: (campaignId: string) => fetchAPI(`/lead/campaign/${campaignId}`),

  // Conversions
  confirmConversion: (campaignId: string, leadId: string) =>
    fetchAPI("/conversion", {
      method: "POST",
      body: JSON.stringify({ campaignId, leadId }),
    }),
  getConversions: (campaignId: string) =>
    fetchAPI(`/conversion/campaign/${campaignId}`),

  // Escrow
  deposit: (campaignId: string, amount: number) =>
    fetchAPI("/escrow/deposit", {
      method: "POST",
      body: JSON.stringify({ campaignId, amount }),
    }),

  // Admin
  admin: {
    getMetrics: () => fetchAPI("/admin/metrics"),
    getCampaigns: (filters?: { status?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.search) params.set("search", filters.search);
      const qs = params.toString();
      return fetchAPI(`/admin/campaigns${qs ? `?${qs}` : ""}`);
    },
    updateCampaignStatus: (id: string, status: string) =>
      fetchAPI(`/admin/campaigns/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    deleteCampaign: (id: string) =>
      fetchAPI(`/admin/campaigns/${id}`, { method: "DELETE" }),
    getLeadAnalytics: () => fetchAPI("/admin/analytics/leads"),
    getAIUsage: () => fetchAPI("/admin/ai-usage"),
    getFinancialOverview: () => fetchAPI("/admin/financial"),
    getSystemHealth: () => fetchAPI("/admin/health"),
  },
};
