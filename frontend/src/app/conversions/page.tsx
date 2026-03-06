"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
}

export default function ConversionsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCampaign) return;
    api.getLeads(selectedCampaign).then(setLeads).catch(console.error);
    api.getConversions(selectedCampaign).then(setConversions).catch(console.error);
  }, [selectedCampaign]);

  const handleConfirm = async (leadId: string) => {
    try {
      await api.confirmConversion(selectedCampaign, leadId);
      setMessage("Conversion confirmed! Escrow payment released.");
      api.getConversions(selectedCampaign).then(setConversions);
    } catch (err) {
      setMessage("Failed to confirm conversion.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Conversion Panel</h1>
      <p className="text-gray-500 text-sm mb-6">
        Manually confirm conversions. This triggers escrow payment release.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Campaign</label>
        <select
          className="border rounded px-3 py-2 w-64"
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
        >
          <option value="">Select campaign...</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {message}
        </div>
      )}

      {selectedCampaign && (
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="font-semibold mb-3">Leads ({leads.length})</h2>
            {leads.length === 0 ? (
              <p className="text-gray-500 text-sm">No leads for this campaign.</p>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white p-3 rounded border flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                    <button
                      onClick={() => handleConfirm(lead.id)}
                      className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold mb-3">
              Conversions ({conversions.length})
            </h2>
            {conversions.length === 0 ? (
              <p className="text-gray-500 text-sm">No conversions yet.</p>
            ) : (
              <div className="space-y-2">
                {conversions.map((conv: any) => (
                  <div key={conv.id} className="bg-white p-3 rounded border">
                    <div className="flex justify-between">
                      <span className="text-sm">{conv.lead?.name}</span>
                      <span className="text-sm font-medium text-green-600">
                        ${conv.amount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(conv.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
