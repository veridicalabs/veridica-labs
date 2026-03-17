import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veridica - Pay Per Conversion",
  description: "AI-powered pay-per-conversion marketing for SMEs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary">
              Veridica
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-primary">
                Dashboard
              </Link>
              <Link href="/campaigns/new" className="hover:text-primary">
                New Campaign
              </Link>
              <Link href="/leads" className="hover:text-primary">
                Leads Simulator
              </Link>
              <Link href="/conversions" className="hover:text-primary">
                Conversions
              </Link>
              <Link href="/chat" className="bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-dark transition-colors">
                Chat con Vera
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
