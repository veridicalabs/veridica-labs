"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface Lead {
  id: string;
  name: string;
  email: string;
  conversations: { id: string; messages: { role: string; content: string }[] }[];
}

interface Conversion {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  leadId?: string;
  lead?: { name: string };
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  deposited: number;
  spent: number;
  status: string;
  leads: Lead[];
  conversions: Conversion[];
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [depositAmount, setDepositAmount] = useState(5);
  const [depositing, setDepositing] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = () => api.getCampaign(id).then(setCampaign).catch(console.error);

  useEffect(() => { load(); }, [id]);

  const handleDeposit = async () => {
    setDepositing(true);
    setMessage("");
    try {
      await api.deposit(id, depositAmount);
      setMessage("Deposit confirmed on-chain!");
      load();
    } catch (e) {
      setMessage("Deposit failed. Check balance.");
    } finally {
      setDepositing(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    setConverting(leadId);
    setMessage("");
    try {
      await api.confirmConversion(id, leadId);
      setMessage("Conversion confirmed on-chain!");
      load();
    } catch (e) {
      setMessage("Conversion failed.");
    } finally {
      setConverting(null);
    }
  };

  if (!campaign) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{campaign.name}</h1>
      <p className="text-gray-500 mb-6">{campaign.description}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          ["Presupuesto", `${campaign.budget} tSYS`],
          ["Depositado", `${campaign.deposited} tSYS`],
          ["Gastado", `${campaign.spent} tSYS`],
          ["Restante", `${campaign.deposited - campaign.spent} tSYS`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded border mb-8">
        <h2 className="font-semibold mb-2">Simular depósito</h2>
        <div className="flex gap-2">
          <input
            type="number"
            className="border rounded px-3 py-1 w-32"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
          />
          <button
            onClick={handleDeposit}
            disabled={depositing}
            className="bg-primary text-white px-4 py-1 rounded hover:bg-primary-dark disabled:opacity-50"
          >
            {depositing ? "Procesando..." : "Depósito"}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      </div>

      <h2 className="text-lg font-semibold mb-3">
        Clientes potenciales ({campaign.leads.length})
      </h2>
      {campaign.leads.length === 0 ? (
        <p className="text-gray-500 text-sm mb-8">
          Aún no hay clientes potenciales. Usa el simulador de clientes potenciales para enviar uno.
        </p>
      ) : (
        <div className="space-y-3 mb-8">
          {campaign.leads.map((lead) => (
            <div key={lead.id} className="bg-white p-4 rounded border">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-gray-500">{lead.email}</p>
                </div>
                <button
                  onClick={() => handleConvert(lead.id)}
                  disabled={converting === lead.id}
                  className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {converting === lead.id ? "Procesando..." : "Confirmar conversión"}
                </button>
              </div>
              {lead.conversations[0] && (
                <div className="mt-3 space-y-1">
                  {(lead.conversations[0].messages as { role: string; content: string }[]).map(
                    (msg, i) => (
                      <p key={i} className="text-sm">
                        <span
                          className={`font-medium ${
                            msg.role === "agent" ? "text-primary" : "text-gray-700"
                          }`}
                        >
                          {msg.role === "agent" ? "Vera" : "Lead"}:
                        </span>{" "}
                        {msg.content}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">
        Conversions ({campaign.conversions.length})
      </h2>
      {campaign.conversions.length === 0 ? (
        <p className="text-gray-500 text-sm">Aún no hay conversiones.</p>
      ) : (
        <div className="space-y-2">
          {campaign.conversions.map((conv) => (
            <div
              key={conv.id}
              className="bg-white p-3 rounded border flex justify-between items-center"
            >
              <span className="text-sm">{conv.lead?.name || conv.leadId || "Lead"}</span>
              <span className="text-sm font-medium text-green-600">
                ${conv.amount} - {conv.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
