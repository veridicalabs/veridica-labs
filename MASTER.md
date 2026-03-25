# MASTER.md — Veridica Labs Specification Document

> **SDD: Spec Driven Development**
> This is the master specification from which all other documents (SOUL.md, INSTINCT.md, AGENTS.md) are derived. This file is NOT uploaded to OpenClaw or any agent system. It is the single source of truth for the project.

---

## 1. Project Overview

| Field | Value |
|---|---|
| Project | Veridica Labs |
| Agent Name | Vera |
| Type | Autonomous AI marketing and sales agent |
| Blockchain | Syscoin zkSYS (zkTanenbaum Testnet, chain 57057) |
| Team Wallet | `0x07f5db230e410A192fD7009B20f9367418896b0f` |
| Escrow Contract | `0x8b9e3655f7bf437E775280db41649AB2b9eF0E0e` |
| Target Market | PYMEs in Peru (small businesses with zero digital marketing experience) |
| Revenue Model | Pay-per-conversion with on-chain escrow (trustless) |

---

## 2. Problem Statement

Small businesses in Peru (bakeries, organic stores, restaurants, beauty clinics) need customers but:
- Have zero digital marketing knowledge
- Have been burned by agencies that charge without delivering results
- Cannot afford upfront marketing costs
- Need a partner that only earns when THEY earn

**Traditional agencies fail because their incentives are misaligned.** They charge for impressions, clicks, or monthly retainers — none of which guarantee actual sales.

---

## 3. Solution: Vera

An AI agent that:
1. Creates and manages ad campaigns autonomously
2. Attends leads via chat (Discord, Telegram, Web)
3. Closes sales by guiding customers through the purchase process
4. Verifies payments via Yape screenshot analysis (AI vision)
5. Releases commission ONLY after double verification via on-chain escrow

**The business owner pays nothing upfront. Vera earns only when a verified sale occurs.**

---

## 4. Architecture

### 4.1 Agent Architecture (Orchestrator + Sub-Agents)

Vera is the orchestrator. She NEVER speaks directly to customers. She delegates to:

| Sub-Agent | Role | AI Provider |
|---|---|---|
| **sales-agent** | Customer conversations, orders, closing sales | OpenClaw (Gemini 2.5 Flash) |
| **ad-agent** | Ad copy generation | OpenClaw (Gemini 2.5 Flash) |
| **conversion-agent** | Evaluate if conversation = valid sale | OpenClaw (Gemini 2.5 Flash) |
| **Discord bot** | Community interaction (independent, no OpenClaw) | Azure OpenAI GPT-4o |

### 4.2 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React) — campaign dashboard |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| AI Orchestrator | OpenClaw (self-hosted on VPS) |
| Discord Bot | discord.js + Azure OpenAI (standalone) |
| Blockchain | Syscoin zkSYS (Solidity smart contracts) |
| Deployment | VPS (vera.qolvecompany.com) |

### 4.3 Infrastructure

| Service | URL | Port |
|---|---|---|
| Frontend Dashboard | https://vera.qolvecompany.com/app/ | 3000 |
| Backend API | https://vera.qolvecompany.com/api/ | 4000 |
| OpenClaw Gateway | https://vera.qolvecompany.com/ | 18789 |
| Vera HTTP Adapter | https://vera.qolvecompany.com/vera/ | 8080 |
| PostgreSQL | localhost | 5432 |

---

## 5. Blockchain Integration

### 5.1 Network: zkSYS Testnet

| Parameter | Value |
|---|---|
| Network Name | zkTanenbaum Testnet |
| RPC URL | https://rpc-zk.tanenbaum.io/ |
| Chain ID | 57057 |
| Token | tSYS |
| Explorer | https://explorer-zk.tanenbaum.io |
| Bridge | https://bridge-zk.tanenbaum.io |

### 5.2 Smart Contract: EscrowCampaign

**Address:** `0x8b9e3655f7bf437E775280db41649AB2b9eF0E0e`

**On-chain flow:**
1. `deposit(campaignId, costPerConversion)` — PYME locks budget
2. `registerConversion(campaignId, conversionId, recipient)` — Backend oracle records verified sale
3. `releasePayment(conversionId)` — Trustless settlement (anyone can trigger)
4. `refund(campaignId)` — Business retrieves unused funds

**Fee tiers (descending commission as volume grows):**
- 1-10 conversions: 10%
- 11-30 conversions: 8%
- 31+ conversions: 6%

**Security:**
- Reentrancy guard on all state-changing functions
- Only designated verifier can register conversions
- Business owner can always refund unused balance
- Zero trapped capital on exit

---

## 6. Economic Model (3-Layer)

### Layer 1: Reserve (30% of commissions)
- Survival capital: hosting, API fees, gas fees
- Target: 30 days of operating costs at zero revenue
- NEVER used for experiments

### Layer 2: Revenue (70% of commissions)
- Infrastructure income from verified sales
- Predictable: number of sales x commission percentage
- Not speculation — payment for delivered value

### Layer 3: Experimental (max 5% of treasury)
- Testing new channels, verticals, conversation strategies
- Time-boxed: 7 days max per experiment
- Total failure = zero impact on core operations

---

## 7. Survival Rules (→ generates INSTINCT.md)

| Rule | Trigger | Reflex |
|---|---|---|
| **Confidence** | Core assumption unreliable (AI vision <70%, LLM errors x3) | DEGRADED mode, fallback responses |
| **Exitability** | Escrow < 2x costPerConversion | Alert business, pause at 0 |
| **Dependency Health** | External system down (LLM, RPC, DB, Discord, Telegram) | Mode transition per dependency |
| **Execution** | Action too slow/expensive (LLM >30s, gas >50 gwei) | Batch operations, suspend non-essential |
| **Unit Economics** | Negative margin for 3+ days | HIBERNATE mode |

### Agent Modes:
- **NORMAL** — Full operation
- **DEGRADED** — Fallback responses, hold conversions
- **PAUSED** — Stop all interaction, notify business
- **HIBERNATE** — Minimal operation, preserve capital

---

## 8. Agent Identity (→ generates SOUL.md)

| Attribute | Value |
|---|---|
| Name | Vera |
| Language | Spanish (Peruvian) |
| Tone | Warm, direct, professional |
| Jargon with customers | NEVER (no "blockchain", "smart contract", "tokens") |
| Jargon with business owner | Numbers and results only |
| Core principle | Veridica Labs only earns when the business earns |

### Values:
1. Honesty — Never inflate metrics
2. Transparency — Every transaction on-chain and verifiable
3. Alignment — 100% aligned with business owner
4. Simplicity — Talk like a partner, not a tool
5. Survival-first — Operational stability over short-term optimization

---

## 9. Current Business: Menta Organika

| Field | Value |
|---|---|
| Business | Menta Organika |
| Type | Artisanal bakery + organic products |
| Location | Lima, Peru |
| Hours | Mon-Sun 9:00 AM - 9:00 PM |
| Payment | Yape only |
| Delivery | S/10.00 flat fee |
| Delivery zones | Los Olivos, Independencia, SMP |
| Delivery time | 40-60 minutes |

### Product Catalog:

| Product | Price |
|---|---|
| Torta de Chocolate Orgánico | S/65.00 |
| Brownies Orgánicos (caja x6) | S/28.00 |
| Galletas de Avena y Pasas (docena) | S/18.00 |
| Cheesecake de Maracuyá | S/72.00 |
| Cúrcuma en Polvo Orgánica (100g) | S/15.00 |
| Aceite de Coco Extra Virgen (250ml) | S/22.00 |
| Granola Artesanal con Frutos Secos (300g) | S/20.00 |
| Muffins Integrales de Arándano (caja x4) | S/16.00 |
| Alfajores de Manjar Orgánico (caja x6) | S/24.00 |
| Golden Milk Mix (150g) | S/25.00 |

### Sales Rules:
- Confirm delivery zone BEFORE taking order
- 2+ products = free shipping promo
- Out-of-catalog request = recommend similar available product
- Always remind: payment via Yape only

---

## 10. Multi-Channel Strategy

| Channel | Technology | AI Provider | Independence |
|---|---|---|---|
| Discord | discord.js (standalone bot) | Azure OpenAI GPT-4o | Fully independent, no OpenClaw |
| Telegram | OpenClaw gateway | Gemini 2.5 Flash via sub-agents | Depends on OpenClaw |
| Web Chat | Next.js → Backend → OpenClaw adapter | Gemini 2.5 Flash via sub-agents | Depends on OpenClaw |
| Web Dashboard | Next.js → Backend API | N/A | Independent |

### Resilience:
- If OpenClaw down → Discord continues, Telegram/Web affected
- If Azure OpenAI down → Discord fallback mode, Telegram/Web continue via Gemini
- If both down → All channels enter DEGRADED mode with pre-written responses

---

## 11. Business Model Alignment

Following the principles from [Winners & Losers in the AI Revolution](https://www.develcuy.com/en/winners-losers-strategies-ai-revolution-tech-blockchain-startups):

1. **Proactive AI adoption** — Vera IS the AI product, not threatened by it
2. **Unique data advantage** — Per-campaign conversation data improves sales over time
3. **Blockchain transparency** — On-chain verifiable commissions eliminate trust issues
4. **Agile architecture** — Sub-agents can be swapped/updated independently
5. **Ethics-first** — No inflated metrics, no hidden fees. If economics are negative, Vera hibernates
6. **Long-term survival** — 3-layer economic model ensures operation through bad conditions

---

## 12. Deliverables Tracker

| Week | Deliverable | Status |
|---|---|---|
| 1 | Idea validation | Done |
| 2 | OpenClaw integration | Done |
| 3 | Chatbot interface (Web + Telegram) | Done |
| 4 | Discord bot (no OpenClaw) | Done |
| 4 | zkSYS Testnet integration | Done |
| 4 | INSTINCT.md final | Done |
| 4 | MASTER.md | Done |
| 4 | Business model review | Done |
| 5 | Live demo + voting | Pending |

---

## 13. Document Derivation Map

```
MASTER.md (this file — NOT uploaded to agents)
  ├── SOUL.md      → Agent identity, values, tone, economics, business context
  ├── INSTINCT.md  → Survival rules, reflexes, operating modes, dependencies
  ├── AGENTS.md    → Sub-agent architecture, delegation rules
  └── DEPLOY.md    → Infrastructure, deployment procedures
```

---

*Last updated: 2026-03-25*
*Team: Veridica Labs*
*Hackathon: Syscoin Builders — Semana 4*
