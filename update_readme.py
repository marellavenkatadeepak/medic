import os

def update_readme():
    filepath = "README.md"
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Architecture
    lines[464:471] = [
        "## 🏗️ Architecture\n",
        "| Layer | Tech |\n",
        "|-------|------|\n",
        "| **Frontend** | Next.js 15, TypeScript, TailwindCSS, ethers.js |\n",
        "| **Backend** | FastAPI (Python), InsForge (PostgreSQL, Storage) |\n",
        "| **Blockchain** | Solidity, Hardhat, MetaMask |\n",
        "| **AI Services** | Gemini AI, Tavus Avatar API |\n"
    ]

    # System flow (approx index offset after previous change)
    # Wait, previous change replaced 7 lines with 7 lines, so indices don't shift!
    lines[473:488] = [
        "### System Flow\n",
        "\n",
        "```\n",
        "Patient (MetaMask) ──► Upload Report ──► InsForge Storage / FastAPI Backend\n",
        "                                              │\n",
        "                                    analyze endpoint (FastAPI)\n",
        "                                    Gemini AI extracts text & analysis\n",
        "                                              │\n",
        "                              SHA-256 hash ──► Blockchain (Solidity)\n",
        "                                              │\n",
        "                          Patient views analysis, chats with AI,\n",
        "                          watches AI doctor video, manages access\n",
        "                                              │\n",
        "                          Doctor (granted access) ──► Views records\n",
        "```\n"
    ]

    # Quick Start (replaced 15 lines with 22 lines)
    lines[514:529] = [
        "### 3. Backend (FastAPI)\n",
        "\n",
        "```bash\n",
        "cd backend\n",
        "python -m venv venv\n",
        "source venv/bin/activate  # On Windows: venv\\Scripts\\activate\n",
        "pip install -r requirements.txt\n",
        "python main.py\n",
        "```\n",
        "\n",
        "### 4. Environment Variables\n",
        "\n",
        "**`frontend/.env`**:\n",
        "```\n",
        "NEXT_PUBLIC_API_URL=http://localhost:8000/api\n",
        "NEXT_PUBLIC_INSFORGE_BASE_URL=https://afhtz3nj.us-west.insforge.app\n",
        "NEXT_PUBLIC_INSFORGE_ANON_KEY=<your-anon-key>\n",
        "NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>\n",
        "```\n",
        "\n",
        "**`backend/.env`**:\n",
        "```\n",
        "GEMINI_API_KEY=<your-gemini-key>\n",
        "TAVUS_API_KEY=<your-tavus-api-key>\n",
        "# and other backend tokens\n",
        "```\n"
    ]

    # Because we added 11 lines in the previous block, indices from here shift by +11 !
    
    # Project Structure (originally 552:556) -> 563:567
    lines[563:567] = [
        "├── backend/                        # FastAPI Python Backend\n",
        "│   ├── main.py                     # API Entry point\n",
        "│   ├── routes/                     # Custom HTTP endpoints\n",
        "│   └── services/                   # External APIs (Gemini, Tavus)\n"
    ]

    # InsForge Backend (originally 561:567) -> 572:578
    lines[572:578] = [
        "## 🧠 Dedicated Backend (FastAPI)\n",
        "\n",
        "- **API Engine**: FastAPI / Python\n",
        "- **Database tables**: `users`, `analyses`, `chat_history`, `access_grants`, `appointments` (via InsForge PostgreSQL)\n",
        "- **Storage**: `medical-reports` bucket (via InsForge Storage)\n",
        "- **AI Integration**: Custom routes using Gemini APIs\n"
    ]

    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(lines)

if __name__ == "__main__":
    update_readme()
