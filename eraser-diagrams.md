# MediLock — Eraser.io Architecture Diagram Prompts

> Copy-paste each prompt into [Eraser.io](https://app.eraser.io/) → "Diagram from Text" to generate the corresponding diagram.

---

## 1. Full System Architecture (Cloud Architecture Diagram)

```
// MediLock — Full System Architecture

Patient [icon: user, color: blue]
Doctor [icon: user-md, color: green]
Researcher [icon: flask, color: purple]

// ─── Frontend Layer ───
Next.js Frontend [icon: nextjs, color: black] {
  Landing Page [icon: layout]
  Patient Dashboard [icon: activity]
  Doctor Dashboard [icon: stethoscope]
  Research Hub [icon: search]
  AI Doc (Chatbot + Video) [icon: message-circle]
  3D Digital Twin [icon: box]
}

// ─── Authentication ───
MetaMask Wallet [icon: key, color: orange]

// ─── API / Serverless Functions (Deno Edge) ───
Edge Functions [icon: zap, color: yellow] {
  analyze-report [icon: file-text, label: "AI Report Analyzer"]
  medical-chatbot [icon: message-square, label: "Medical Chatbot"]
  tavus-video [icon: video, label: "AI Video Consultation"]
  calendar-auth [icon: calendar, label: "Google Calendar OAuth"]
  calendar-create [icon: calendar-plus, label: "Appointment Booking"]
}

// ─── AI Layer ───
Google Gemini 2.5 Flash [icon: google, color: red, label: "Gemini 2.5 Flash"]
Tavus API [icon: video, color: teal, label: "Tavus AI Avatar"]

// ─── Backend-as-a-Service ───
InsForge BaaS [icon: database, color: indigo] {
  PostgreSQL [icon: database, label: "PostgreSQL (PostgREST)"]
  Authentication [icon: lock]
  Storage Buckets [icon: hard-drive]
}

// ─── Blockchain Layer (EVM / Hardhat) ───
Ethereum Blockchain [icon: hexagon, color: gray] {
  MediChainRecords.sol [icon: file-code, label: "Medical Records Contract"]
  StudyRegistry.sol [icon: file-code, label: "Study Registry Contract"]
  ResearchToken.sol [icon: coins, label: "MEDI ERC-20 Token"]
}

// ─── Decentralized Storage ───
IPFS via Pinata [icon: globe, color: teal, label: "IPFS (Pinata Gateway)"]

// ─── External APIs ───
ClinicalTrials.gov API [icon: globe, color: blue, label: "ClinicalTrials.gov"]
Google Calendar API [icon: calendar, color: green]

// ─── Client-Side Security ───
AES-256-CBC Encryption [icon: shield, color: red, label: "Client-Side AES-256"]

// ════════════ CONNECTIONS ════════════

Patient --> MetaMask Wallet: Connects Wallet
Doctor --> MetaMask Wallet: Connects Wallet
Researcher --> Next.js Frontend: Browses Studies

MetaMask Wallet --> Next.js Frontend: Web3 Auth

Next.js Frontend --> Edge Functions: REST API Calls
Next.js Frontend --> InsForge BaaS: SDK (CRUD, Auth, Storage)
Next.js Frontend --> Ethereum Blockchain: ethers.js (Read/Write Contracts)
Next.js Frontend --> IPFS via Pinata: Upload/Fetch Encrypted Files
Next.js Frontend --> AES-256-CBC Encryption: Client-Side Encrypt/Decrypt
Next.js Frontend --> ClinicalTrials.gov API: Fetch Recruiting Studies

Edge Functions --> Google Gemini 2.5 Flash: AI Analysis & Chat
Edge Functions --> Tavus API: Generate AI Video Consultations
Edge Functions --> InsForge BaaS: Store Results (analyses, chat_history)
Edge Functions --> Google Calendar API: OAuth + Create Events

Ethereum Blockchain --> IPFS via Pinata: metadataCID stored on-chain

Patient --> Patient Dashboard: Upload Reports, View Analysis
Doctor --> Doctor Dashboard: Access Patient Records
Researcher --> Research Hub: Browse Studies, Earn MEDI Tokens
```

---

## 2. AI Document Analysis Pipeline (Sequence Diagram)

```
// MediLock — AI Reads & Analyzes Medical Documents

Patient [icon: user, color: blue]
Browser [icon: chrome, color: blue]
AES-256 Encryption [icon: shield, color: red]
analyze-report Function [icon: zap, color: yellow]
Gemini 2.5 Flash [icon: google, color: red]
InsForge DB [icon: database, color: indigo]
Ethereum Blockchain [icon: hexagon, color: gray]
IPFS Pinata [icon: globe, color: teal]

// Step 1: Upload
Patient > Browser: Uploads medical report (PDF/Image)

// Step 2: Client-side encryption
Browser > AES-256 Encryption: Encrypt file with random 256-bit key
AES-256 Encryption > Browser: Returns {ciphertext, iv, keyHash}

// Step 3: IPFS storage (encrypted blob)
Browser > IPFS Pinata: Upload encrypted blob via Pinata API
IPFS Pinata > Browser: Returns IPFS CID (Content Identifier)

// Step 4: AI Analysis (unencrypted base64 for analysis)
Browser > analyze-report Function: POST {file_base64, file_type, patient_wallet}
analyze-report Function > Gemini 2.5 Flash: Send file + structured prompt
Gemini 2.5 Flash > analyze-report Function: Returns JSON {summary, risk_score, conditions, biomarkers, specialist, urgency}

// Step 5: Hash & Store
analyze-report Function > analyze-report Function: SHA-256 hash of analysis JSON → recordHash
analyze-report Function > InsForge DB: INSERT into 'analyses' table {patient_wallet, summary, risk_score, conditions, biomarkers, specialist, urgency, record_hash}
InsForge DB > analyze-report Function: Returns {id, record_hash}

// Step 6: Blockchain anchoring
analyze-report Function > Browser: Returns analysis + record_hash
Browser > Ethereum Blockchain: storeRecord(recordHash, metadataCID) → MediChainRecords.sol
Ethereum Blockchain > Browser: Returns on-chain recordId

// Step 7: Display
Browser > Patient: Renders structured analysis with risk score, conditions, specialist recommendation
```

---

## 3. Blockchain Access Control & Data Integrity (Flowchart)

```
// MediLock — Blockchain Access Control Flow

Start [shape: oval, label: "Patient Uploads Report"]

Encrypt [shape: diamond, label: "Client-Side AES-256 Encryption"]
UploadIPFS [shape: parallelogram, label: "Upload Encrypted File to IPFS"]
AIAnalysis [shape: rectangle, label: "AI Analyzes Report (Gemini)"]
HashRecord [shape: rectangle, label: "SHA-256 Hash of Analysis"]
StoreDB [shape: parallelogram, label: "Store in PostgreSQL (InsForge)"]
StoreChain [shape: rectangle, label: "storeRecord(hash, CID) on MediChainRecords.sol"]
RecordOnChain [shape: rectangle, label: "Record stored on-chain with recordId"]

GrantAccess [shape: diamond, label: "Patient Grants Access?"]
SelectDoctor [shape: rectangle, label: "Select Doctor Address"]
CallGrant [shape: rectangle, label: "grantAccess(doctorAddr, recordId)"]
AccessGranted [shape: rectangle, label: "Doctor can now view record"]

DoctorView [shape: diamond, label: "Doctor requests record"]
CheckAccess [shape: diamond, label: "hasAccess(doctor, recordId)?"]
FetchIPFS [shape: rectangle, label: "Fetch encrypted file from IPFS"]
DecryptClient [shape: rectangle, label: "Decrypt with patient-shared key"]
ViewReport [shape: oval, label: "Doctor views decrypted report"]
AccessDenied [shape: oval, label: "Access Denied"]

RevokeAccess [shape: rectangle, label: "revokeAccess(doctorAddr, recordId)"]
EmergencyAccess [shape: rectangle, label: "emergencyAccess() — logs event only"]

Start --> Encrypt --> UploadIPFS
UploadIPFS --> AIAnalysis --> HashRecord
HashRecord --> StoreDB
HashRecord --> StoreChain --> RecordOnChain

RecordOnChain --> GrantAccess
GrantAccess -- Yes --> SelectDoctor --> CallGrant --> AccessGranted
GrantAccess -- No --> RecordOnChain

AccessGranted --> DoctorView
DoctorView --> CheckAccess
CheckAccess -- Yes --> FetchIPFS --> DecryptClient --> ViewReport
CheckAccess -- No --> AccessDenied

RecordOnChain --> RevokeAccess
RecordOnChain --> EmergencyAccess
```

---

## 4. Research Agent Flow — Clinical Trials + Tokenized Contributions (Sequence Diagram)

```
// MediLock — Research Agent: Clinical Trials + Token Economy

Patient [icon: user, color: blue]
Research Hub UI [icon: search, color: purple]
ClinicalTrials.gov [icon: globe, color: blue]
StudyRegistry.sol [icon: file-code, color: gray]
ResearchToken.sol [icon: coins, color: gold]
Ethereum [icon: hexagon, color: gray]

// Step 1: Browse Studies
Patient > Research Hub UI: Searches clinical trials (e.g., "diabetes")
Research Hub UI > ClinicalTrials.gov: GET /api/v2/studies?query.term=diabetes&filter.overallStatus=RECRUITING
ClinicalTrials.gov > Research Hub UI: Returns recruiting studies [{nctId, title, organization, status, description, phase}]
Research Hub UI > Patient: Displays study cards with details

// Step 2: Contribute to Study
Patient > Research Hub UI: Clicks "Contribute Data" on a study
Research Hub UI > Ethereum: contribute(studyId, dataHash) → StudyRegistry.sol
StudyRegistry.sol > StudyRegistry.sol: Verify !hasContributed[user][studyId]
StudyRegistry.sol > StudyRegistry.sol: Record contribution {studyId, dataHash, timestamp}
StudyRegistry.sol > ResearchToken.sol: mint(patient, 50 MEDI tokens)
ResearchToken.sol > Ethereum: ERC-20 token minted
Ethereum > Research Hub UI: ContributionMade event emitted

// Step 3: Earn & Track
Research Hub UI > ResearchToken.sol: balanceOf(patientAddress)
ResearchToken.sol > Research Hub UI: Returns MEDI balance
Research Hub UI > StudyRegistry.sol: getContributionCount(patientAddress)
StudyRegistry.sol > Research Hub UI: Returns contribution count
Research Hub UI > Patient: Shows Stats (balance, contributions) + Redeem Panel
```

---

## 5. AI Medical Chatbot Pipeline (Sequence Diagram)

```
// MediLock — AI Medical Chatbot (Context-Aware)

Patient [icon: user, color: blue]
ChatBot UI [icon: message-circle, color: blue]
medical-chatbot Function [icon: zap, color: yellow]
InsForge DB [icon: database, color: indigo]
Gemini 2.5 Flash [icon: google, color: red]

// Step 1: Patient sends message
Patient > ChatBot UI: Types health question
ChatBot UI > medical-chatbot Function: POST {patient_wallet, message}

// Step 2: Context gathering (parallel)
medical-chatbot Function > InsForge DB: Fetch latest 5 analyses for patient_wallet
medical-chatbot Function > InsForge DB: Fetch latest 10 chat messages for patient_wallet

// Step 3: Build prompt
InsForge DB > medical-chatbot Function: Returns analyses [{summary, risk_score, conditions, specialist, urgency}]
InsForge DB > medical-chatbot Function: Returns chat_history [{role, message}]
medical-chatbot Function > medical-chatbot Function: Build system instruction with patient context + safety rules

// Step 4: AI response
medical-chatbot Function > Gemini 2.5 Flash: sendMessage(user_message) with system instruction + chat history
Gemini 2.5 Flash > medical-chatbot Function: Returns JSON {answer, warning, confidence}

// Step 5: Persist & respond
medical-chatbot Function > InsForge DB: INSERT chat_history (fire-and-forget)
medical-chatbot Function > ChatBot UI: Returns {answer, warning, confidence}
ChatBot UI > Patient: Renders formatted medical advice with disclaimer
```

---

## 6. AI Video Consultation Pipeline (Sequence Diagram)

```
// MediLock — Tavus AI Video Consultation

Patient [icon: user, color: blue]
Frontend [icon: chrome, color: blue]
tavus-video Function [icon: zap, color: yellow]
Tavus API [icon: video, color: teal]

// Generate Video
Patient > Frontend: Clicks "Generate AI Video" after report analysis
Frontend > tavus-video Function: POST {summary, risk_score, conditions, specialist, urgency}
tavus-video Function > tavus-video Function: Build personalized doctor avatar script
tavus-video Function > Tavus API: Create video with script + replica_id
Tavus API > tavus-video Function: Returns {video_id, status: "queued"}
tavus-video Function > Frontend: Returns video_id

// Poll Status
Frontend > tavus-video Function: GET ?video_id=xxx (poll every few seconds)
tavus-video Function > Tavus API: GET /v2/videos/{video_id}
Tavus API > tavus-video Function: Returns {status, download_url, stream_url}
tavus-video Function > Frontend: Returns video status

// Display
Frontend > Patient: Streams AI doctor video explaining report findings
```

---

## 7. Data Layer Entity Relationship Diagram

```
// MediLock — Database & Blockchain Entity Relationships

analyses [icon: file-text, color: blue] {
  id uuid pk
  patient_wallet string
  file_name string
  file_url string
  ocr_text text
  summary text
  risk_score integer
  conditions json
  biomarkers json
  specialist string
  urgency string
  record_hash string
  record_id integer
  created_at timestamp
}

chat_history [icon: message-square, color: green] {
  id uuid pk
  patient_wallet string
  role string
  message text
  warning string
  confidence float
  created_at timestamp
}

users [icon: users, color: orange] {
  wallet_address string pk
  role string
  name string
  created_at timestamp
}

MediChainRecords [icon: hexagon, color: gray, label: "On-Chain: MediChainRecords.sol"] {
  recordId uint256 pk
  recordHash bytes32
  metadataCID string
  patient address
  timestamp uint256
  accessPermissions mapping
}

StudyRegistry [icon: hexagon, color: gray, label: "On-Chain: StudyRegistry.sol"] {
  studyId string
  dataHash bytes32
  contributor address
  timestamp uint256
}

ResearchToken [icon: coins, color: gold, label: "On-Chain: MEDI ERC-20"] {
  address address pk
  balance uint256
}

IPFS_Storage [icon: globe, color: teal, label: "IPFS (Pinata)"] {
  CID string pk
  encrypted_blob binary
  metadata json
}

// Relationships
analyses.patient_wallet -- users.wallet_address
analyses.record_id -- MediChainRecords.recordId
analyses.record_hash -- MediChainRecords.recordHash
chat_history.patient_wallet -- users.wallet_address
MediChainRecords.metadataCID -- IPFS_Storage.CID
MediChainRecords.patient -- users.wallet_address
StudyRegistry.contributor -- users.wallet_address
ResearchToken.address -- users.wallet_address
```

---

## 8. Security & Zero-Trust Architecture (Cloud Architecture)

```
// MediLock — Zero-Trust Security Architecture

Patient Browser [icon: chrome, color: blue]

// Client-Side Security
Client Security [icon: shield, color: red] {
  AES-256-CBC Encryption [icon: lock, label: "256-bit random key generation"]
  SHA-256 Hashing [icon: hash, label: "Record integrity hash"]
  Key Management [icon: key, label: "Key never leaves client"]
  MetaMask Signing [icon: edit, label: "Transaction signing"]
}

// Transport
HTTPS TLS [icon: lock, color: green, label: "HTTPS/TLS"]

// Server-Side (Zero-Knowledge)
Edge Functions [icon: zap, color: yellow, label: "Deno Edge (Stateless)"] {
  analyze-report [icon: file-text, label: "Processes unencrypted for AI only"]
  medical-chatbot [icon: message-square]
}

// Storage (Encrypted at Rest)
InsForge DB [icon: database, color: indigo, label: "PostgreSQL (Metadata Only)"]
IPFS Pinata [icon: globe, color: teal, label: "Encrypted Blobs Only"]

// Blockchain (Immutable Audit Trail)
Ethereum Blockchain [icon: hexagon, color: gray] {
  Record Hashes [icon: hash, label: "Tamper-proof record hashes"]
  Access Control [icon: shield, label: "On-chain permission mapping"]
  Event Logs [icon: list, label: "Immutable audit log"]
}

// Connections
Patient Browser --> Client Security: All encryption happens here
Client Security --> HTTPS TLS: Encrypted payload
HTTPS TLS --> Edge Functions: Secure transport
Edge Functions --> InsForge DB: Store analysis metadata
Client Security --> IPFS Pinata: Upload encrypted files
Client Security --> Ethereum Blockchain: Store hashes + manage access
Ethereum Blockchain --> IPFS Pinata: CID references for verification

// Key principle annotations
Patient Browser -- Client Security: "🔑 Key NEVER stored server-side"
Ethereum Blockchain -- InsForge DB: "Blockchain = source of truth for access"
```

---

## How to Use These Prompts

1. Go to [Eraser.io](https://app.eraser.io/)
2. Create a new diagram → select **"Diagram from text"**
3. Copy any code block above and paste it
4. Eraser will auto-generate the visual diagram
5. Customize colors, layout, and labels as needed

> **Tip**: For the Sequence Diagrams (#2, #4, #5, #6), select "Sequence Diagram" type. For #1, #8, select "Cloud Architecture". For #3, select "Flowchart". For #7, select "Entity Relationship Diagram".
