"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewCampaign() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    budget: 1000,
    costPerConversion: 10,
  });
  const [adCopy, setAdCopy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.createCampaign(form);
      setAdCopy(result.adCopy);
      setTimeout(() => router.push(`/campaigns/${result.campaign.id}`), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Create Campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Campaign Name</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            required
            className="w-full border rounded px-3 py-2"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Budget ($)</label>
            <input
              type="number"
              required
              min={1}
              className="w-full border rounded px-3 py-2"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cost/Conversion ($)</label>
            <input
              type="number"
              required
              min={1}
              className="w-full border rounded px-3 py-2"
              value={form.costPerConversion}
              onChange={(e) =>
                setForm({ ...form, costPerConversion: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Campaign"}
        </button>
      </form>

      {adCopy && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium text-green-800 mb-1">
            Vera generated ad copy:
          </p>
          <p className="text-sm text-green-700">{adCopy}</p>
        </div>
      )}
    </div>
  );
}
