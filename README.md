# Veridica Labs

**Pay-per-conversion marketing platform for SMEs, powered by AI and blockchain escrow.**

Businesses deposit a budget into a smart contract. An AI agent called **Vera** manages leads, closes sales, and confirms conversions. Funds are released only when a verified sale occurs.

![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![Syscoin](https://img.shields.io/badge/Syscoin-NEVM%20%2B%20zkSYS-orange)
![AI](https://img.shields.io/badge/AI-OpenClaw%20%2B%20Gemini%202.5-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Problem

Small businesses in Peru (bakeries, organic stores, restaurants) need customers but:
- Have zero digital marketing experience
- Have been burned by agencies that charge without delivering results
- Cannot afford upfront marketing costs
- Need a partner that only earns when THEY earn

**Traditional agencies fail because their incentives are misaligned.** They charge for impressions, clicks, or retainers — none of which guarantee actual sales.

## Solution

Vera is an autonomous AI sales agent that:
1. Attends leads via Telegram and web chat
2. Knows the business catalog, prices, delivery zones, and payment methods
3. Closes sales by guiding customers through the purchase process
4. Confirms conversions via AI evaluation
5. Releases commission ONLY after verification via on-chain escrow

**The business owner pays nothing upfront. Veridica Labs earns only when a verified sale occurs.**

---

## Architecture

```
User (Telegram / Web Chat)
        |
        v
   Proxy Layer (bot / frontend)
        |
        v
   Backend API (Express + TypeScript)
        |
   +----+----+
   |         |
   v         v
OpenClaw    Syscoin NEVM
(Vera AI)  (EscrowCampaign.sol)
   |         |
   v         v
Gemini     On-chain payment
2.5 Flash  release
```

Users never interact with OpenClaw directly. All messages pass through proxy channels.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| AI Agent | OpenClaw (self-hosted), Gemini 2.5 Flash |
| AI Adapter | vera-http-adapter (Express on VPS) |
| Blockchain | Syscoin NEVM (Solidity 0.8.24, Hardhat, OpenZeppelin) |
| Channels | Telegram (@veridicalabs_bot), Web Chat |
| VPS | vera.qolvecompany.com |

## Smart Contract

**EscrowCampaign.sol** — deployed on Syscoin NEVM Testnet (Tanenbaum)

| Parameter | Value |
|-----------|-------|
| Address (Tanenbaum) | `0xf46d0AbedDaCe2476D15E113beb441fABE5eC74E` |
| Address (zkSYS) | `0x8b9e3655f7bf437E775280db41649AB2b9eF0E0e` |
| Chain IDs | 5700 (Tanenbaum), 57057 (zkSYS) |

**On-chain flow:**
1. `deposit()` — Business locks budget in escrow
2. `registerConversion()` — Backend oracle records verified sale
3. `releasePayment()` — Trustless settlement (anyone can trigger)
4. `refund()` — Business retrieves unused funds

**Fee tiers (descending as volume grows):**
- 1-10 conversions: 10%
- 11-30 conversions: 8%
- 31+ conversions: 6%

**Security:** ReentrancyGuard, Ownable2Step, custom errors, only designated verifier can register conversions.

## AI Agent: Vera

Vera is the sales agent powered by OpenClaw with Gemini 2.5 Flash.

**Skills:**
- `respondLead` — Responds to customer messages with catalog knowledge
- `generateAd` — Creates ad copy for campaigns
- `confirmConversion` — Evaluates if a conversation resulted in a sale

**Personality:** Warm, direct, professional. Speaks Peruvian Spanish. Never uses technical jargon with customers.

**Channels:**
- Telegram: `@veridicalabs_bot` (open access, any user can chat)
- Web: `/chat` page in the frontend dashboard

**Key files on OpenClaw workspace:**
- `SOUL.md` — Identity, values, economic model, business catalog
- `INSTINCT.md` (AGENTS.md) — 5 survival rules, 4 operating modes
- `BOOTSTRAP.md` — Welcome message behavior
- `MENTA-ORGANIKA.md` — Product catalog reference

## Economic Model (3-Layer)

| Layer | Allocation | Purpose |
|-------|-----------|---------|
| Reserve | 30% of commissions | Survival capital (hosting, API, gas). Target: 30 days at zero revenue |
| Revenue | 70% of commissions | Operating income from verified sales |
| Experimental | Max 5% of treasury | Bounded R&D. Time-boxed to 7 days per experiment |

## Survival Rules (INSTINCT.md)

| Rule | Trigger | Reflex |
|------|---------|--------|
| Confidence | AI vision <70%, LLM errors x3 | DEGRADED mode, fallback responses |
| Exitability | Escrow < 2x costPerConversion | Alert business, pause at 0 |
| Dependency Health | External system down | Mode transition per dependency |
| Execution | LLM >30s, gas >50 gwei | Batch operations, suspend non-essential |
| Unit Economics | Negative margin 3+ days | HIBERNATE mode |

**Operating modes:** NORMAL, DEGRADED, PAUSED, HIBERNATE

## Current Business: Menta Organika

Demo case — artisanal bakery and organic products in Lima, Peru.

- **Hours:** Mon-Sun 9AM-9PM
- **Delivery:** S/10 flat fee — Los Olivos, Independencia, SMP
- **Payment:** Yape only
- **10 products:** Tortas, brownies, galletas, cheesecake, curcuma, aceite de coco, granola, muffins, alfajores, golden milk mix (S/15-S/72)

## Monorepo Structure

```
veridica-labs/
├── backend/                 # Express API + Prisma + AI integration
│   ├── src/
│   │   ├── agent/           # Vera agent + AIProvider interface
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic (campaign, conversion, escrow, survival)
│   │   ├── contracts/       # ABI for on-chain interaction
│   │   ├── routes/          # API routes
│   │   └── db/              # Prisma client
│   └── prisma/              # Schema (Campaign, Lead, Conversation, Conversion)
├── frontend/                # Next.js 14 dashboard
│   └── src/app/
│       ├── page.tsx         # Dashboard
│       ├── campaigns/new/   # Create campaign
│       ├── campaigns/[id]/  # Campaign detail + deposit + convert
│       ├── leads/           # Leads simulator
│       ├── conversions/     # Conversion panel
│       └── chat/            # Chat with Vera
├── contracts/               # Solidity + Hardhat
│   ├── contracts/           # EscrowCampaign.sol
│   ├── scripts/             # Deploy + utilities
│   ├── test/                # Comprehensive test suite
│   └── deployments/         # Deployment records
├── infra/                   # Docker + docker-compose
├── MASTER.md                # Spec-driven development source of truth
├── SOUL.md                  # Agent identity and economics
├── INSTINCT.md              # Survival rules and reflexes
├── DEPLOY.md                # Deployment instructions
└── LICENSE                  # MIT
```

## API Endpoints

**OpenClaw Skills:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/lead/respond` | Vera responds to a customer message |
| POST | `/campaign/generate-ad` | Generate ad copy |
| POST | `/conversion/confirm` | AI evaluates conversion |

**Core:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/campaign` | Create campaign |
| GET | `/campaign` | List campaigns |
| GET | `/campaign/:id` | Campaign details |
| POST | `/lead` | Simulate incoming lead |
| POST | `/conversion` | Confirm conversion + on-chain payment |
| POST | `/escrow/deposit` | Deposit to escrow |

**Survival & Economics:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/full` | Full dependency health check |
| GET | `/economics` | Operating economics dashboard |
| GET | `/agent/mode` | Current agent mode |
| GET | `/agent/mode/:campaignId` | Agent mode for specific campaign |

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- npm

### Install and run

```bash
# Clone
git clone https://github.com/veridicalabs/veridica-labs.git
cd veridica-labs

# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd contracts && npm install && cd ..

# Setup database
cd backend
cp ../.env.example .env  # Edit with your credentials
npx prisma generate
npx prisma db push
cd ..

# Run backend (terminal 1)
cd backend && npm run dev    # http://localhost:4000

# Run frontend (terminal 2)
cd frontend && npm run dev   # http://localhost:3000
```

### Smart contract development

```bash
cd contracts
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network syscoinTestnet
```

### Environment variables

See `.env.example` for all required variables:
- `DATABASE_URL` — PostgreSQL connection
- `OPENCLAW_API_KEY` — OpenClaw gateway token
- `OPENCLAW_BASE_URL` — OpenClaw VPS URL
- `ESCROW_CONTRACT_ADDRESS` — Deployed contract address
- `VERIFIER_PRIVATE_KEY` — Backend oracle wallet
- `RPC_URL_TESTNET` — Syscoin Tanenbaum RPC

## Demo Flow

1. **Create campaign** — Business sets name, description, budget (tSYS), cost per conversion
2. **Deposit funds** — tSYS deposited to escrow smart contract
3. **Customer chats with Vera** — Via Telegram or web chat, Vera knows the catalog
4. **Lead arrives** — Recorded in database with Vera's auto-response
5. **Confirm conversion** — AI evaluates conversation, registers on-chain, releases payment
6. **Dashboard** — Business sees leads, conversions, and on-chain transactions

## Deliverables

| Week | Deliverable | Status |
|------|------------|--------|
| 1 | Idea validation | Done |
| 2 | OpenClaw deployment | Done |
| 3 | Chatbot proxy (Telegram + Web) | Done |
| 3 | SOUL.md + INSTINCT.md | Done |
| 4 | zkSYS integration | Done |
| 4 | Discord bot | Done |
| 4 | MASTER.md | Done |
| 5 | Live demo + voting | Pending |

## Team

**Veridica Labs** — Hackathon Syscoin Builders 2026

## License

[MIT](LICENSE)
