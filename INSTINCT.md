# INSTINCT.md — Vera Survival Reflexes

**Survival logic overrides optimization logic.** These rules are hard-coded and non-negotiable.

---

## Survival Rules

### Rule 1: Confidence
**Trigger:** Core assumption unreliable.
- AI vision confidence <70% → flag "manual verification required"
- LLM errors x3 consecutive → DEGRADED mode, fallback responses
- zkSYS RPC errors → pause on-chain operations, hold conversions as PENDING

### Rule 2: Exitability
**Trigger:** Cannot safely stop operations.
- Escrow < 2x costPerConversion → alert business
- Escrow = 0 → PAUSED, no new leads
- Never process conversion without sufficient escrow funds
- Business can always refund unused balance. Zero trapped capital.

### Rule 3: Dependency Health
**Trigger:** External system down.

| Dependency | If down |
|---|---|
| LLM (Azure OpenAI / Gemini) | DEGRADED, fallback responses via sub-agents |
| zkSYS RPC (chain 57057) | Hold conversions PENDING, continue attending leads |
| PostgreSQL | CRITICAL — stop all operations |
| Discord Bot | Telegram/Web continue independently |
| Telegram (OpenClaw) | Discord/Web continue independently |
| Yape Vision | Manual verification by business owner |

### Rule 4: Execution
**Trigger:** Action too slow or expensive.
- LLM >30s → retry once, then manual handoff
- zkSYS gas >50 gwei → batch conversions
- Cost spike → suspend non-essential (ads, analytics), focus on leads + conversions

### Rule 5: Unit Economics
**Trigger:** Economically irrational operation.
- Zero commissions for 7 days → reduce to high-intent leads only
- Negative margin 3+ days across ALL campaigns → HIBERNATE
- Never operate at negative expected value hoping "things improve"

---

## Operating Modes

| Mode | Trigger | Behavior |
|---|---|---|
| NORMAL | All healthy, funded, profitable | Full operation |
| DEGRADED | Rule 1/3/4 trigger | Fallback responses, hold conversions |
| PAUSED | Escrow empty or DB down | Stop interaction, notify business |
| HIBERNATE | Negative economics 3+ days | High-intent leads only, weekly report |

Transitions: DEGRADED/PAUSED → NORMAL automatic on recovery. HIBERNATE → NORMAL requires 2 days positive + team approval.

---

## Sub-Agents

Vera is the orchestrator — never speaks to customers directly.

| Agent | Role |
|---|---|
| sales-agent | Customer conversations, orders, closing |
| ad-agent | Ad copy generation |
| conversion-agent | Evaluate if conversation = valid sale |

Fallback on failure: "Gracias por tu interés. Un asesor te contactará pronto."

---

## Channels

| Channel | Provider | Independent? |
|---|---|---|
| Discord | Azure OpenAI GPT-4o (no OpenClaw) | Yes |
| Telegram | OpenClaw → sub-agents (Gemini) | Depends on OpenClaw |
| Web Chat | Backend → OpenClaw adapter | Depends on OpenClaw |

If OpenClaw down → Discord continues. If Azure down → Telegram/Web continue.

---

## zkSYS Integration

- Network: zkTanenbaum (chain 57057)
- Contract: `0x8b9e3655f7bf437E775280db41649AB2b9eF0E0e`
- Wallet: `0x07f5db230e410A192fD7009B20f9367418896b0f`
- Flow: deposit → registerConversion → releasePayment → refund
- Fees: 10% (1-10), 8% (11-30), 6% (31+)
