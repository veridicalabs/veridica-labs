"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
}

export default function LeadsSimulator() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({
    campaignId: "",
    name: "",
    email: "",
    message: "",
  });
  const [result, setResult] = useState<{ lead: any; agentReply: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCampaigns().then(setCampaigns).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.simulateLead(form);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Leads Simulator</h1>
      <p className="text-gray-500 text-sm mb-6">
        Simulate incoming leads (replaces Meta Ads / WhatsApp webhook).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Campaign</label>
          <select
            required
            className="w-full border rounded px-3 py-2"
            value={form.campaignId}
            onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
          >
            <option value="">Select campaign...</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lead Name</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lead Email</label>
          <input
            type="email"
            required
            className="w-full border rounded px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            required
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Hi, I'm interested in your product..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send Lead"}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="p-4 bg-gray-50 border rounded">
            <p className="text-sm font-medium text-gray-600">Lead Message:</p>
            <p className="text-sm">{form.message}</p>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
            <p className="text-sm font-medium text-primary">Vera responded:</p>
            <p className="text-sm">{result.agentReply}</p>
          </div>
        </div>
      )}
    </div>
  );
}
