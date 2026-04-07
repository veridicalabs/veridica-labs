"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { api } from "@/lib/api";
import {
  ESCROW_CONTRACT_ADDRESS,
  ESCROW_ABI,
  ZKSYS_CHAIN_CONFIG,
  campaignIdToBytes32,
  connectWallet,
} from "@/lib/contract";

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
  txHash?: string;
  leadId?: string;
  lead?: { name: string };
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  costPerConversion: number;
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
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("");

  const load = () => api.getCampaign(id).then(setCampaign).catch(console.error);

  useEffect(() => {
    load();
  }, [id]);

  const handleConnectWallet = async () => {
    try {
      const provider = await connectWallet();
      if (!provider) return;
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      setWalletAddress(address);
      setWalletBalance(ethers.formatEther(balance));
    } catch (e: any) {
      showMessage("Error conectando wallet: " + e.message, "error");
    }
  };

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setMessageType(type);
  };

  const handleDeposit = async () => {
    if (!campaign) return;
    setDepositing(true);
    setMessage("");

    try {
      const provider = await connectWallet();
      if (!provider) {
        setDepositing(false);
        return;
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      const campaignBytes32 = campaignIdToBytes32(id);
      const costPerConversion = ethers.parseEther(campaign.costPerConversion.toString());
      const value = ethers.parseEther(depositAmount.toString());

      showMessage("Firmando transaccion en tu wallet...");
      const tx = await contract.deposit(campaignBytes32, costPerConversion, { value });

      showMessage("Transaccion enviada. Esperando confirmacion...");
      const receipt = await tx.wait();

      // Update backend DB
      await api.deposit(id, depositAmount);

      const addr = await signer.getAddress();
      const newBalance = await provider.getBalance(addr);
      setWalletBalance(ethers.formatEther(newBalance));

      showMessage(
        `Deposito confirmado on-chain! TX: ${receipt.hash.slice(0, 10)}...${receipt.hash.slice(-8)}`
      );
      load();
    } catch (e: any) {
      const msg = e.reason || e.shortMessage || e.message || "Error desconocido";
      showMessage("Deposito fallido: " + msg, "error");
    } finally {
      setDepositing(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    setConverting(leadId);
    setMessage("");
    try {
      await api.confirmConversion(id, leadId);
      showMessage("Conversion confirmada on-chain!");
      load();
    } catch (e: any) {
      showMessage("Conversion fallida: " + (e.message || "Error"), "error");
    } finally {
      setConverting(null);
    }
  };

  if (!campaign) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{campaign.name}</h1>
      <p className="text-gray-500 mb-6">{campaign.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          ["Presupuesto", `${campaign.budget} tSYS`],
          ["Depositado", `${campaign.deposited} tSYS`],
          ["Gastado", `${campaign.spent} tSYS`],
          ["Restante", `${campaign.deposited - campaign.spent} tSYS`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Wallet + Deposit Section */}
      <div className="bg-white p-6 rounded-lg border mb-8">
        <h2 className="font-semibold text-lg mb-4">Depositar fondos al Escrow</h2>

        {/* Contract Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-gray-500">Contrato Escrow</p>
              <a
                href={`${ZKSYS_CHAIN_CONFIG.blockExplorerUrls[0]}/address/${ESCROW_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono text-xs"
              >
                {ESCROW_CONTRACT_ADDRESS}
              </a>
            </div>
            <div>
              <p className="text-gray-500">Red</p>
              <p className="font-medium">{ZKSYS_CHAIN_CONFIG.chainName}</p>
            </div>
          </div>
        </div>

        {/* Wallet Connection */}
        {!walletAddress ? (
          <button
            onClick={handleConnectWallet}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5" />
              <circle cx="18" cy="16" r="1" />
            </svg>
            Conectar Wallet (MetaMask / Pali)
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-green-700 font-medium">Wallet conectada</p>
                <p className="text-xs font-mono text-green-600">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700 font-medium">Balance</p>
                <p className="text-sm font-semibold text-green-800">
                  {parseFloat(walletBalance).toFixed(4)} tSYS
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Form */}
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto (tSYS)
            </label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className="border rounded-lg px-3 py-2 w-40"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
          </div>
          <button
            onClick={handleDeposit}
            disabled={depositing}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {depositing ? "Procesando..." : "Depositar al Escrow"}
          </button>
        </div>

        {/* Fluyez info */}
        <p className="text-xs text-gray-400 mt-3">
          ¿No tienes tSYS? Compra SYS con Yape en{" "}
          <a href="https://fluyez.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Fluyez
          </a>
          {" "}y deposita directamente desde tu wallet.
        </p>

        {/* Status Message */}
        {message && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              messageType === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Leads */}
      <h2 className="text-lg font-semibold mb-3">
        Clientes potenciales ({campaign.leads.length})
      </h2>
      {campaign.leads.length === 0 ? (
        <p className="text-gray-500 text-sm mb-8">
          Aun no hay clientes potenciales. Usa el simulador de clientes potenciales para enviar uno.
        </p>
      ) : (
        <div className="space-y-3 mb-8">
          {campaign.leads.map((lead) => (
            <div key={lead.id} className="bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-gray-500">{lead.email}</p>
                </div>
                <button
                  onClick={() => handleConvert(lead.id)}
                  disabled={converting === lead.id}
                  className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {converting === lead.id ? "Procesando..." : "Confirmar conversion"}
                </button>
              </div>
              {lead.conversations[0] && (
                <div className="mt-3 space-y-1 bg-gray-50 rounded p-3">
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

      {/* Conversions */}
      <h2 className="text-lg font-semibold mb-3">
        Conversiones ({campaign.conversions.length})
      </h2>
      {campaign.conversions.length === 0 ? (
        <p className="text-gray-500 text-sm">Aun no hay conversiones.</p>
      ) : (
        <div className="space-y-2">
          {campaign.conversions.map((conv) => (
            <div
              key={conv.id}
              className="bg-white p-3 rounded-lg border flex justify-between items-center"
            >
              <div>
                <span className="text-sm font-medium">{conv.lead?.name || "Lead"}</span>
                {conv.txHash && (
                  <a
                    href={`${ZKSYS_CHAIN_CONFIG.blockExplorerUrls[0]}/tx/${conv.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-primary hover:underline"
                  >
                    Ver TX
                  </a>
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  conv.status === "CONFIRMED" ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {conv.amount} tSYS - {conv.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
