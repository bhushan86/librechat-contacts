# LibreChat Contacts Feature

## Overview
This extends LibreChat with a Contacts workspace that the AI assistant can reference during normal conversations.

## Setup Instructions

1. Clone the repo:
```bash
   git clone https://github.com/bhushan86/librechat-contacts.git
   cd librechat-contacts
```

2. Install dependencies:
```bash
   npm install
   npm run build
```

3. Copy `.env.example` to `.env` and set:
4. Start backend:
```bash
   npm run backend
```

5. Start frontend:
```bash
   cd client && npm run dev
```

6. Visit `http://localhost:3080`

---

## Architecture

### Files Added
- `api/models/Contact.js` — Mongoose schema
- `api/server/routes/contacts.js` — REST API + chat inject endpoint
- `client/src/components/Contacts/ContactsPanel.jsx` — UI panel
- `client/src/hooks/Messages/useSubmitMessage.ts` — Chat integration
- `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` — Nav integration

### Data Model
Contacts have core fields (name, company, role, email, notes) plus a flexible `attributes` Map for arbitrary key-value pairs like Industry, Location, Tags etc.

### Chat Integration Approach
**Prompt context injection** — before every chat message is sent, the system searches for relevant contacts using regex search on name, company, role, notes and email fields. If matches are found, they are appended to the message as context before sending to the AI.

### CSV Import
Accepts CSV files up to 50MB. Known columns (name, company, role, email, notes) map to core fields. All other columns become arbitrary attributes. Processed in batches of 500 for performance.

---

## Design Questions

### 1. If the system needed to support 1,000,000 contacts, how would you redesign it?
- Use **MongoDB Atlas Search** (Lucene-based) for fast full-text search at scale
- Add **vector embeddings** using Google's embedding API stored in MongoDB Atlas Vector Search for semantic similarity
- Implement **streaming CSV import** with Node.js worker threads to handle large files without blocking the event loop
- Add **Redis caching** for frequent search queries
- Use **virtual scrolling** in the UI for large contact lists
- Add compound indexes on frequently queried fields

### 2. How would you ensure the assistant retrieves the most relevant contacts for a query?
- Use **vector embeddings** to convert queries and contact data into vectors, then find closest matches using cosine similarity
- Extract **named entities** (company names, people names) from the query before searching
- Implement **hybrid search** combining keyword + semantic search
- Use **relevance scoring** that weights name/company matches higher than notes matches
- Add **query understanding** to detect intent (e.g. "who works at X" vs "find CTOs")

### 3. What are the limitations of your current implementation?
- **Basic keyword search** — won't find semantic matches (e.g. "developer" won't match "engineer")
- **Context window limit** — if many contacts match, all are injected which could exceed token limits
- **No per-user isolation** — all users see all contacts (no multi-tenancy)
- **Simple CSV parser** — may fail on CSVs with commas inside quoted fields
- **No pagination in search** — only returns top 10 matches

---

## Bonus Features Implemented
- Contact search with real-time filtering
- Contact deletion
- Arbitrary key-value attributes
- CSV bulk import
- Smart contact injection (only relevant contacts sent to AI, not all)
- Pagination in contacts list