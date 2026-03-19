const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchAdminAPI(path: string, options?: RequestInit) {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
    }
    throw new Error("Unauthorized");
  }
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

  // Auth
  auth: {
    login: (password: string) => fetchAPI("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
    verify: () => fetchAdminAPI("/auth/verify"),
    logout: () => {
      if (typeof window !== "undefined") localStorage.removeItem("admin_token");
    },
    setToken: (token: string) => {
      if (typeof window !== "undefined") localStorage.setItem("admin_token", token);
    },
    isLoggedIn: () => !!getAdminToken(),
  },

  // Admin
  admin: {
    getMetrics: () => fetchAdminAPI("/admin/metrics"),
    getCampaigns: (filters?: { status?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.search) params.set("search", filters.search);
      const qs = params.toString();
      return fetchAdminAPI(`/admin/campaigns${qs ? `?${qs}` : ""}`);
    },
    updateCampaignStatus: (id: string, status: string) =>
      fetchAdminAPI(`/admin/campaigns/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    deleteCampaign: (id: string) =>
      fetchAdminAPI(`/admin/campaigns/${id}`, { method: "DELETE" }),
    getLeadAnalytics: () => fetchAdminAPI("/admin/analytics/leads"),
    getAIUsage: () => fetchAdminAPI("/admin/ai-usage"),
    getFinancialOverview: () => fetchAdminAPI("/admin/financial"),
    getSystemHealth: () => fetchAdminAPI("/admin/health"),
  },
};
