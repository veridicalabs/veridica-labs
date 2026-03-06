"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  description: string;
  budget: number;
  deposited: number;
  spent: number;
  status: string;
  _count: { leads: number; conversions: number };
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCampaigns()
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/campaigns/new"
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          + New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-gray-500">No campaigns yet. Create your first one!</p>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="block bg-white p-6 rounded-lg border hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <p className="text-gray-500 text-sm mt-1">{c.description}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    c.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Budget</p>
                  <p className="font-medium">${c.budget}</p>
                </div>
                <div>
                  <p className="text-gray-500">Deposited</p>
                  <p className="font-medium">${c.deposited}</p>
                </div>
                <div>
                  <p className="text-gray-500">Leads</p>
                  <p className="font-medium">{c._count.leads}</p>
                </div>
                <div>
                  <p className="text-gray-500">Conversions</p>
                  <p className="font-medium">{c._count.conversions}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
