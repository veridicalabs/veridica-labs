# 🤖 Veridica Labs

**AI-powered marketing automation with on-chain escrow payments.**

Veridica Labs is a decentralized marketing automation platform designed for **SMEs (PYMEs)** that guarantees performance-based payments using **AI agents and blockchain escrow contracts**.

![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![Syscoin](https://img.shields.io/badge/Syscoin-NEVM-orange)
![AI](https://img.shields.io/badge/AI-OpenClaw-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 TABLE OF CONTENTS

- [🌍 Overview](#overview)
- [❓ Problem](#problem)
- [💡 Solution](#solution)
- [✨ Core Features](#core-features)
- [🏗 System Architecture](#system-architecture)
- [🔄 Workflow](#workflow)
- [🔧 Tech Stack](#tech-stack)
- [📁 Monorepo Structure](#monorepo-structure)
- [📜 Smart Contract Core](#smart-contract-core)
- [🚀 Development Setup](#development-setup)
- [🐳 Local Infrastructure](#local-infrastructure)
- [🎯 MVP Scope](#mvp-scope)
- [📈 Project Goals](#project-goals)
- [🛣 Roadmap](#roadmap)
- [👥 Team](#team)
- [📄 License](#license)
- [🔮 Vision](#vision)

---

<a name="overview"></a>
## 🌍 Overview

**Veridica Labs** is a decentralized marketing automation platform that enables **performance-based payments** through blockchain escrow contracts.

Businesses deposit marketing budgets into a smart contract.  
An autonomous AI agent launches and manages campaigns, interacts with leads, and confirms conversions.  
Once a verified sale occurs, the smart contract **automatically releases payment**.

This removes trust friction between businesses, marketing services, and performance outcomes.

---

<a name="problem"></a>
## ❓ Problem

Small and medium businesses (SMEs/PYMEs) struggle with digital marketing because:

| Challenge | Impact |
|-----------|--------|
| 💸 **Pay upfront without guaranteed results** | High financial risk |
| 🎭 **Agencies operate with limited accountability** | Opaque performance metrics |
| 📞 **Lead management requires manual effort** | Resource intensive |
| 🤝 **Trust between parties is fragile** | Difficult partnerships |

Current solutions rely on **centralized platforms and opaque performance metrics**, leaving SMEs with little recourse when campaigns underperform.

---

<a name="solution"></a>
## 💡 Solution

Veridica introduces **performance-based marketing automation secured by blockchain escrow**.

The platform combines:

| Component | Role |
|-----------|------|
| 🤖 **AI Autonomous Agents** | Campaign management & lead interaction |
| 📊 **Marketing Automation** | Multi-channel campaign execution |
| 💬 **Conversational AI** | Lead qualification & nurturing |
| 🔐 **On-chain Escrow** | Trustless payment settlement |

The system ensures that **marketing providers are paid only when conversions occur**.

---

<a name="core-features"></a>
## ✨ Core Features

### 🔒 Escrow-based Marketing Campaigns
Businesses deposit campaign budgets into a smart contract. Funds are only released when verified conversions occur.

### 🤖 Autonomous AI Marketing Agent
The AI agent (named **Vera**) manages:
- Campaign creation and optimization
- Lead interaction through messaging channels
- Conversion workflow automation

### 💬 Conversational Lead Handling
The AI agent engages with leads naturally through:
- WhatsApp / Telegram
- Web chat
- SMS
- Social media DMs

### ✅ Conversion Verification
The backend confirms successful sales through:
- API integrations with CRM/ERP
- Manual verification fallback
- Multi-party consensus for high-value transactions

### 💸 Automatic Payment Release
Once conversion is cryptographically verified, the escrow contract:
- Releases funds to the marketing provider
- Logs the transaction on-chain
- Provides immutable proof of performance

---

<a name="system-architecture"></a>
## 🏗 System Architecture
┌─────────────┐
│ SME         │
│ (Client)    │
└──────┬──────┘
│
▼
┌─────────────┐
│ Next.js     │
│ Dashboard   │
└──────┬──────┘
│
▼
┌─────────────┐      ┌─────────────┐
│ Backend     │────▶│ PostgreSQL  │
│ API         │     │ Database     │
└──────┬──────┘      └─────────────┘
│
▼
┌─────────────┐
│ OpenClaw    │
│Agent (Vera) │
└──────┬──────┘
│
▼
┌─────────────┐ ┌─────────────┐
│ Marketing   │ │ Smart       │
│ APIs (Meta, │ │ Contract    │
│ Google)     │ │ (Escrow)    │
└─────────────┘ └──────┬──────┘
│
▼
┌─────────────┐
│ Syscoin     │
│ NEVM        │
└─────────────┘

---

<a name="workflow"></a>
## 🔄 Workflow

---

<a name="tech-stack"></a>
## 🔧 Tech Stack

### 🎨 Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety |
| **TailwindCSS** | Styling |
| **ethers/viem** | Wallet integration |
| **Wagmi/RainbowKit** | Web3 UI components |

*User dashboard for campaign management and escrow deposits.*

---

### ⚙️ Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Fastify/Express** | API framework |
| **Prisma ORM** | Database abstraction |
| **PostgreSQL** | Primary database |
| **Redis** | Caching & queues |
| **REST API + Webhooks** | Integration interfaces |

*Business logic, campaign orchestration, conversion verification.*

---

### 🧠 AI Agent
| Technology | Purpose |
|------------|---------|
| **OpenClaw** | Agent framework |
| **LangChain** | LLM orchestration |
| **Vector DB** | Memory & context |
| **Multi-channel SDKs** | WhatsApp, Telegram, web |

**Agent name: Vera** — autonomous marketing specialist

---

### 📜 Smart Contracts
| Technology | Purpose |
|------------|---------|
| **Solidity ^0.8.20** | Contract language |
| **Hardhat** | Development environment |
| **Ethers.js** | Contract interaction |
| **OpenZeppelin** | Secure contract primitives |

**Target Network:** Syscoin NEVM (EVM-compatible)

---

<a name="monorepo-structure"></a>
## 📁 Monorepo Structure
