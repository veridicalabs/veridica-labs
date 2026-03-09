# 🚀 Deploy Instructions

## Syscoin NEVM Testnet (Tanenbaum) Deploy

### 1. Get Testnet Tokens
- Visit: https://ethstats.tanenbaum.io/#faucet
- Connect your wallet
- Request tSYS tokens

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your wallet details
```

Required variables:
```bash
DEPLOYER_PRIVATE_KEY=0x...
VERIFIER_ADDRESS=0x...
VERIFIER_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...
PLATFORM_FEE_BPS=200
```

### 3. Deploy Contract
```bash
npm run deploy:syscoinTestnet --workspace=contracts
```

### 4. Update Environment
After deploy, copy the contract address to `.env`:
```bash
ESCROW_CONTRACT_ADDRESS=0x...
```

### 5. Start Backend
```bash
npm run dev --workspace=backend
```

### 6. Test Flow
1. POST `/lead` - Create lead + Vera response
2. POST `/conversion` - Register conversion + on-chain payment

## Verification
- Contract address on Tanenbaum explorer: https://tanenbaum.io
- Backend API: http://localhost:4000/health
