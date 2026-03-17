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

  // Chat with Vera
  chatWithVera: (message: string, campaignContext?: string) =>
    fetchAPI("/lead/respond", {
      method: "POST",
      body: JSON.stringify({ message, campaignContext }),
    }),
};
