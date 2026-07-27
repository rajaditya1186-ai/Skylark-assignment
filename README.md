# Skylark BI Agent — AI Business Intelligence Dashboard

An analyst-grade business intelligence agent and dashboard hybrid designed for Skylark Drones. It fetches commercial and operational data directly from Monday.com boards (**Deals** and **Work Orders**), cleans and normalizes it, aggregates metrics, and uses an LLM to generate executive-ready business reports and conversational insights.

## Project Structure

```text
SkyLark/
├── Assignment/               # Original planning & rules documents
│   ├── PRD.md                # Product requirements
│   ├── Architecture.md       # High-level architecture & lifecycle
│   ├── rules.md              # AI boundary & data handling constraints
│   ├── phases.md             # Development roadmap
│   ├── design.md             # Visual design specifications
│   └── memory.md             # State tracker & progress log
│
├── backend/                  # FastAPI Backend API
│   ├── app.py                # Server, routing, cache, and error boundaries
│   ├── config.py             # Settings validation (Pydantic-Settings)
│   ├── monday_client.py      # GraphQL Monday API wrapper with Cursor pagination & retries
│   ├── data_cleaner.py       # Purity-enforced pandas data sanitizer
│   ├── analytics.py          # Structured business KPIs & analytics
│   ├── llm.py                # OpenAI completion templates & classifier
│   ├── models.py             # Typed Pydantic request/response boundary models
│   ├── requirements.txt      # Python dependencies
│   ├── test_backend.py       # Comprehensive verification script
│   └── .env.example          # Sample backend configurations
│
├── frontend/                 # Next.js 15 Frontend Dashboard
│   ├── app/                  # App router pages, layout & theme setup
│   ├── components/           # Custom chat & report dashboard UI
│   ├── hooks/                # Custom React state hooks (useChat, useLeadershipSummary)
│   ├── services/             # Typed API fetch client
│   ├── types/                # Shared Typescript declarations
│   ├── package.json          # Node dependencies
│   └── .env.local.example    # Sample frontend configuration
│
├── README.md                 # This file
└── DecisionLog.md            # Rationale, assumptions, and tradeoffs
```

---

## Backend Local Setup (FastAPI)

### 1. Prerequisites
Ensure you have **Python 3.10+** installed.

### 2. Setup Virtual Environment
Run the following commands inside the `backend/` directory:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # On Windows (Command Prompt)
# or
source .venv/bin/activate    # On macOS/Linux
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in the values:
- `MONDAY_API_TOKEN`: Your Monday.com API token (if empty, runs in **Mock Mode** automatically).
- `OPENAI_API_KEY`: Your OpenAI API Key (if empty or quota exceeded, runs in **Mock Mode** fallback).
- `CORS_ORIGINS`: Allowed origins (e.g., `http://localhost:3000`).

### 5. Run Verification Script
To verify the backend foundations, data cleaning, and calculations work correctly:
```bash
python test_backend.py
```

### 6. Start Server
Run the FastAPI development server:
```bash
uvicorn app:app --reload --port 8000
```
API Documentation will be available at:
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## Frontend Local Setup (Next.js)

### 1. Prerequisites
Ensure you have **Node.js 18+** installed.

### 2. Install Packages
Run the following commands inside the `frontend/` directory:
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Ensure the API base URL is correct:
```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Start Next.js Development Server
```bash
npm run dev
```
Open your browser and navigate to:
- **Web App**: [http://localhost:3000](http://localhost:3000)

---

## Key Design Constraints & Engineering Decisions

### 1. The AI Boundary (Structural Constraint)
To enforce the **No Hallucinations** policy:
- Raw items fetched from Monday.com never cross the boundary into `llm.py`.
- Raw GraphQL data is converted to pandas DataFrames and cleaned in `data_cleaner.py`.
- Metrics are calculated via pure numerical logic in `analytics.py` yielding a JSON-serializable `leadership_summary` payload.
- This summary payload is the only input forwarded to OpenAI in `llm.py`.

### 2. Graceful Degradation
- If Monday.com is unreachable, the system returns a clear HTTP 502 message with details on which board is down.
- If OpenAI is down or runs out of quota (HTTP 429), the chat gracefully defaults to showing a standard notice alongside the **raw structured summaries**, keeping the tool fully usable.
- If credentials are absent, the application triggers a mock-mode that generates realistic data matching the 9 PRD test questions.

### 3. Dynamic Column Mapping
Monday.com board schemas vary. Instead of hardcoding column IDs, the agent maps board columns by their **Title** (e.g. "Expected Close Date", "Sector", "Value") and maps them to clean snake_case variables (`expected_close_date`, `sector`, `value`).

---

## Core Features & Testing Set

### 1. Chat Interface
A ChatGPT-style layout supporting dark mode, typing indicators, error alerts, and example prompt chips.
It handles conversational Q&A and **clarifies ambiguous requests** instead of guessing (e.g. if you ask "what is the status", it asks if you want to inspect deals or work orders).

### 2. Weekly Leadership Report
Accessible with one-click from the header. Composes commercial pipeline stats, delivery bottlenecks, sector performance, and data warnings, presenting them in a styled document with copy and download utilities.
