# MediChain AI

AI-powered decentralized healthcare intelligence platform secured by blockchain.

## Architecture

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 15, TypeScript, TailwindCSS, ethers.js |
| **Backend** | InsForge (PostgreSQL, Storage, AI, Edge Functions) |
| **Blockchain** | Solidity, Hardhat, MetaMask |
| **AI Services** | InsForge AI (Claude), Tavus Avatar API |

## Quick Start

### 1. Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

### 2. Blockchain (optional, for on-chain features)

```bash
cd blockchain
npm install
npx hardhat node                                          # Terminal 1
npx hardhat run scripts/deploy.ts --network localhost     # Terminal 2
```

Copy the deployed contract address to `frontend/.env`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
```

### 3. Environment Variables

**`frontend/.env`** (pre-configured by InsForge template):
```
NEXT_PUBLIC_INSFORGE_BASE_URL=https://afhtz3nj.us-west.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>
```

**InsForge Edge Function environment** (set in InsForge dashboard):
```
TAVUS_API_KEY=<your-tavus-api-key>
TAVUS_REPLICA_ID=<your-tavus-replica-id>
```

## Project Structure

```
medilock/
├── blockchain/                 # Smart contract
│   ├── contracts/MediChainRecords.sol
│   ├── scripts/deploy.ts
│   └── hardhat.config.ts
├── frontend/                   # Next.js App Router
│   └── src/
│       ├── app/
│       │   ├── page.tsx             # Landing page
│       │   ├── patient/page.tsx     # Patient dashboard
│       │   └── doctor/page.tsx      # Doctor dashboard
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── FileUpload.tsx
│       │   ├── RiskScore.tsx
│       │   ├── ChatBot.tsx
│       │   ├── TavusVideo.tsx
│       │   └── RecordCard.tsx
│       ├── hooks/
│       │   ├── useWallet.tsx
│       │   └── useContract.ts
│       └── lib/
│           ├── insforge.ts
│           └── contract.ts
├── functions/                  # InsForge Edge Functions
│   ├── analyze-report.js
│   ├── medical-chatbot.js
│   └── tavus-video.js
└── README.md
```

## InsForge Backend (Live)

- **Database**: `users`, `analyses`, `chat_history`, `access_grants`
- **Storage**: `medical-reports` bucket (private)
- **Edge Functions**: `analyze-report`, `medical-chatbot`, `tavus-video`

## Smart Contract

`MediChainRecords.sol` provides:
- Patient/Doctor role registration
- On-chain record hash storage (SHA-256)
- Patient-controlled access grant/revoke
- Emergency access with event logging

## System Flow

1. Patient connects MetaMask wallet
2. Uploads medical report → InsForge Storage
3. `analyze-report` edge function: AI extracts text + generates analysis
4. SHA-256 hash stored on blockchain
5. Patient views AI analysis, chats with AI assistant, watches AI doctor video
6. Patient can grant/revoke doctor access via smart contract
