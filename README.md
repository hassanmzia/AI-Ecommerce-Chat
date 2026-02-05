# AI E-Commerce Chat System

A production-grade, multi-agent AI chatbot for e-commerce customer support. The system uses a multi-agent orchestration pipeline with input/output validation guardrails, specialized domain agents, real-time WebSocket chat, and standardized MCP/A2A protocol servers.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Services](#services)
- [Multi-Agent Pipeline](#multi-agent-pipeline)
- [Specialized Agents](#specialized-agents)
- [E-Commerce Toolkit (Tools)](#e-commerce-toolkit-tools)
- [MCP Server](#mcp-server---model-context-protocol)
- [A2A Server](#a2a-server---agent-to-agent-protocol)
- [Database Schema](#database-schema)
- [Security & Responsible AI](#security--responsible-ai)
- [Authentication](#authentication)
- [WebSocket Real-Time Chat](#websocket-real-time-chat)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Architecture Diagram](#architecture-diagram)

---

## Architecture Overview

The system is built as a microservices architecture orchestrated with Docker Compose. Seven services communicate over an internal bridge network (`ecommerce_net`), with external access exposed on ports 3065-3069.

```
                        +-------------------+
                        |   React Frontend  |
                        |   (Port 3065)     |
                        +--------+----------+
                                 |
                          REST / WebSocket
                                 |
                        +--------v----------+
                        |   Node.js API     |
                        |   (Port 3066)     |
                        +----+----+----+----+
                             |    |    |
              +--------------+    |    +--------------+
              |                   |                   |
     +--------v------+   +-------v--------+   +------v-------+
     | AI Service    |   | MCP Server     |   | A2A Server   |
     | Django        |   | (Port 3068)    |   | (Port 3069)  |
     | (Port 3067)   |   +----------------+   +--------------+
     +-------+-------+
             |
    +--------+--------+
    |                  |
+---v----+      +------v---+
|PostgreSQL|    |  Redis   |
|(Port 5499)|   |(Port 6399)|
+----------+    +----------+
```

### Data Flow

1. User types a message in the React frontend
2. Frontend sends the message via REST (`POST /api/chat/message`) or WebSocket
3. API service validates the request, applies rate limiting and optional JWT auth
4. API forwards the message to the AI Service (`POST /api/agents/orchestrate`)
5. AI Service runs the multi-agent pipeline (input validation -> sentiment -> intent -> agent -> output validation)
6. Specialized agents invoke e-commerce tools to fetch real data
7. Response passes through output validation (toxicity, bias, PII masking)
8. API stores messages in PostgreSQL and sends real-time updates via WebSocket
9. Frontend displays the response in the chat UI

---

## Services

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **Frontend** | 3065 | React 18, TypeScript, Vite, TailwindCSS, Nginx | Single-page application with chat UI, auth pages, and analytics dashboard |
| **API** | 3066 | Node.js 20, Express, WebSocket (ws) | REST API gateway, JWT authentication, WebSocket server, request routing |
| **AI Service** | 3067 | Python 3.11, Django 5.1, DRF, Gunicorn | Multi-agent orchestrator, validators, e-commerce toolkit |
| **MCP Server** | 3068 | Node.js 20, Express, Zod | Model Context Protocol server with 8 registered tools |
| **A2A Server** | 3069 | Node.js 20, Express | Agent-to-Agent protocol server with 6 registered agents |
| **PostgreSQL** | 5499 | PostgreSQL 16 Alpine | Primary data store with 13 tables, full-text search, JSONB |
| **Redis** | 6399 | Redis 7 Alpine | Cache layer with 4 databases (sessions, tokens, tool cache) |

All services run on an internal Docker bridge network. PostgreSQL and Redis ports are internal-only (not exposed to the host).

---

## Multi-Agent Pipeline

Every user message passes through a 6-stage pipeline managed by the `AgentOrchestrator`:

### Stage 1: Input Validation

Three security checks run sequentially. If any check fails, the message is blocked immediately.

| Check | Method | Threshold | Action on Failure |
|-------|--------|-----------|-------------------|
| **Prompt Injection** | LLM classifier (Y/N) | Binary | Block with security message |
| **Toxicity** | Detoxify BERT model | 70% | Block with civility message |
| **Topic Relevance** | LLM classifier (Y/N) | Binary | Block with scope message |

### Stage 2: Sentiment Analysis

Runs in parallel with the main pipeline to detect frustrated users.

- **Sentiment**: positive, neutral, negative, very_negative
- **Frustration Level**: low, medium, high, critical
- **Escalation**: Automatically triggers when frustration is high/critical

### Stage 3: Intent Detection

LLM-based classifier identifies one of 7 intents:

| Intent | Description | Routed Agent |
|--------|-------------|--------------|
| `customer_info` | Customer account, profile, loyalty queries | CustomerSupportAgent |
| `order_tracking` | Order status, tracking, delivery updates | OrderTrackingAgent |
| `product_search` | Product search, availability, pricing | ProductSearchAgent |
| `payment_info` | Payment status, billing, refund queries | PaymentInfoAgent |
| `recommendation` | Product recommendations, suggestions | RecommendationAgent |
| `sentiment_escalation` | User is frustrated, needs escalation | SentimentAnalysisAgent |
| `general` | General e-commerce questions, FAQs | General LLM Handler |

### Stage 4: Agent Execution

The detected intent routes to a specialized agent. Each agent:
1. Extracts relevant parameters from the query (e.g., `ORD-10001`, `CUST-2001`)
2. Invokes the appropriate e-commerce tool
3. Uses the LLM to format the tool results into a natural response

### Stage 5: Tool Invocation

Agents call tools from the `EcommerceToolkit` which queries the seed database for customer, order, product, and payment data.

### Stage 6: Output Validation

Every AI response passes through three output checks:

| Check | Method | Threshold | Action |
|-------|--------|-----------|--------|
| **Toxicity** | Detoxify BERT | 0.7 | Block response, return safety message |
| **Bias Detection** | Keyword heuristics | 0.7 | Flag response |
| **PII Masking** | spaCy NER | N/A | Mask PERSON, GPE, ORG, DATE, CARDINAL entities |

### Execution Logging

Every pipeline stage creates an `AgentExecution` record with:
- Agent type, input data, output data
- Status (running / completed / failed)
- Execution time in milliseconds

---

## Specialized Agents

### CustomerSupportAgent
- Extracts customer IDs (`CUST-XXXX` pattern)
- Looks up customer profile, loyalty tier, points, order history
- Formats response with account details

### OrderTrackingAgent
- Extracts order IDs (`ORD-XXXXX` pattern)
- Returns order status, items, shipping address, tracking info
- Provides delivery estimates

### ProductSearchAgent
- Uses LLM to extract search parameters (query, category, max results)
- Supports filtering by category: Electronics, Clothing, Home, Books, Sports
- Returns formatted product listings with prices and ratings

### PaymentInfoAgent
- Extracts order IDs for payment lookup
- Returns payment method, status, amount
- Privacy-first: only shows last 4 digits of card numbers

### RecommendationAgent
- Accepts optional customer ID for personalized recommendations
- Filters by product category
- Returns 3-5 relevant product suggestions with reasoning

### SentimentAnalysisAgent
- Returns structured JSON: sentiment, frustration level, escalation recommendation
- Triggers human escalation for critical frustration
- Provides empathetic responses for high-frustration users

### AnalyticsAgent
- Generates business insights from available data
- Covers order trends, customer satisfaction, product performance
- Returns actionable recommendations

---

## E-Commerce Toolkit (Tools)

The `EcommerceToolkit` class provides 6 tools that query the seed database:

| Tool | Parameters | Description |
|------|-----------|-------------|
| `lookup_customer_info` | `customer_id` | Full customer profile with orders and loyalty data |
| `track_order` | `order_id` | Order details, status, items, shipping, tracking |
| `search_products` | `query`, `category`, `max_results`, `filters` | Product search with filtering and sorting |
| `get_payment_info` | `order_id` | Payment method, status, amount (masked card data) |
| `get_recommendations` | `customer_id`, `category` | Personalized product recommendations |
| `get_analytics_summary` | (none) | Business metrics, order stats, top products |

---

## MCP Server - Model Context Protocol

The MCP server (port 3068) provides a standardized tool invocation interface following the Model Context Protocol.

### Registered Tools

| Tool | Description | Cache |
|------|-------------|-------|
| `customer_lookup` | Customer profile retrieval | Redis |
| `order_lookup` | Order details and history | Redis |
| `product_search` | Full-text product search with filters | 3 min |
| `payment_status` | Payment tracking and status | Redis |
| `recommendation_engine` | Personalized product suggestions | Redis |
| `inventory_check` | Real-time stock level queries | - |
| `coupon_validation` | Discount code verification | - |
| `analytics_summary` | Business metrics and KPIs | Redis |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/mcp/tools` | List all registered tools with schemas |
| `GET` | `/mcp/tools/:name` | Get specific tool definition and schema |
| `POST` | `/mcp/tools/:name/invoke` | Execute a tool with parameters |
| `GET` | `/mcp/metrics` | Tool invocation metrics (counts, durations) |
| `GET` | `/mcp/status` | Server health and status |

### Features
- **Zod Schema Validation** — All tool inputs validated against Zod schemas
- **30s Timeout** — Tool invocations timeout after 30 seconds
- **Metrics Tracking** — Invocation counts, success rates, average durations
- **Middleware Support** — Logging, authentication, pre/post-processing hooks

---

## A2A Server - Agent-to-Agent Protocol

The A2A server (port 3069) implements an agent-to-agent communication protocol for multi-agent task routing.

### Registered Agents

| Agent | Capabilities | Routing Keywords |
|-------|-------------|------------------|
| `customerSupportAgent` | Account management, loyalty queries | customer, account, profile, loyalty |
| `productAgent` | Product search, recommendations | product, search, catalog, item |
| `orderAgent` | Order tracking, management | order, tracking, delivery, shipping |
| `paymentAgent` | Payment processing, refunds | payment, refund, billing, invoice |
| `recommendationAgent` | Personalized suggestions | recommend, suggest, similar, popular |
| `sentimentAgent` | Sentiment analysis, escalations | sentiment, frustration, escalation |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/a2a/agents` | List all registered agents with capabilities |
| `POST` | `/a2a/tasks` | Create and route a task to an appropriate agent |
| `GET` | `/a2a/tasks/:id` | Get task status and results |
| `GET` | `/a2a/health` | Agent health status and metrics |

### Features
- **Agent Registry** — Agents register with cards defining capabilities and schemas
- **Keyword Routing** — Automatic agent selection based on task keywords
- **Health Tracking** — Tasks processed, failures, response times per agent
- **Task Management** — Full lifecycle: pending -> running -> completed/failed

---

## Database Schema

PostgreSQL 16 with 13 tables, UUID primary keys, JSONB fields, and comprehensive indexing.

### Tables

#### Core Business
| Table | Key Columns | Notes |
|-------|------------|-------|
| `users` | id (UUID), email, full_name, loyalty_tier, loyalty_points | Unique email constraint, bcrypt passwords |
| `products` | id (UUID), name, category, price, stock_quantity, specifications (JSONB) | Full-text search via GIN index |
| `orders` | id (UUID), user_id (FK), status, items (JSONB), total_amount | Status: pending/processing/shipped/delivered/cancelled |
| `payments` | id (UUID), order_id (FK), method, status, amount | Masked card numbers (last 4 only) |

#### Communication
| Table | Key Columns | Notes |
|-------|------------|-------|
| `conversations` | id (UUID), user_id (FK), title, metadata (JSONB) | Auto-updated timestamps |
| `messages` | id (UUID), conversation_id (FK), role, content, validation_status | Validation: pending/valid/invalid/flagged |
| `notifications` | id (UUID), user_id (FK), type, title, message, is_read | Types: info/warning/success/error |

#### Commerce
| Table | Key Columns | Notes |
|-------|------------|-------|
| `reviews` | id (UUID), product_id (FK), user_id (FK), rating (1-5) | CHECK constraint on rating |
| `coupons` | id (UUID), code (unique), discount_percent, valid_from, valid_until | Date-range validation |
| `wishlist` | id (UUID), user_id (FK), product_id (FK) | Unique (user, product) constraint |
| `cart_items` | id (UUID), user_id (FK), product_id (FK), quantity | Shopping cart contents |

#### Analytics & AI
| Table | Key Columns | Notes |
|-------|------------|-------|
| `analytics_events` | id (UUID), user_id, event_type, event_data (JSONB) | User behavior tracking |
| `agent_executions` | id (UUID), agent_type, input_data (JSONB), output_data (JSONB), status, execution_time_ms | Full pipeline audit trail |

### Indexes
- GIN trigram index on `products.name` for full-text search
- B-tree indexes on all foreign keys
- Composite indexes for common query patterns
- Auto-update trigger on `conversations.updated_at`

### Seed Data
The system ships with realistic seed data loaded on startup:
- 12 customers with varying loyalty tiers
- 25 products across 5 categories
- 18 orders with diverse statuses
- 18 payments
- 7 coupon codes
- 24 product reviews

---

## Security & Responsible AI

### Input Security Guardrails

| Layer | Description |
|-------|-------------|
| **Rate Limiting** | 100 requests/minute global, 5 requests/minute for auth endpoints |
| **Request Validation** | express-validator on all API routes |
| **Prompt Injection Detection** | LLM-based classifier blocks injection attempts |
| **Toxicity Filtering** | Detoxify BERT model with 70% threshold |
| **Topic Validation** | LLM classifier restricts to e-commerce queries only |
| **Payload Limits** | 10MB maximum request size |

### Output Security Guardrails

| Layer | Description |
|-------|-------------|
| **Toxicity Check** | Detoxify score threshold of 0.7 blocks toxic responses |
| **Bias Detection** | Keyword heuristic scoring flags biased content |
| **PII Masking** | spaCy NER automatically masks PERSON, GPE, ORG, DATE, CARDINAL |
| **Payment Protection** | Only last 4 digits of card numbers ever exposed |
| **Content Filtering** | Flagged responses replaced with safety message |

### Validation Status Flow
```
User Message -> [pending] -> Input Validation -> [valid] or [flagged]
AI Response  -> [pending] -> Output Validation -> [valid] or [flagged]
```

### Audit Trail
Every agent execution is logged to the `agent_executions` table with:
- Agent type and status (running/completed/failed)
- Full input and output data (JSONB)
- Execution time in milliseconds
- Conversation association (when available)

---

## Authentication

### Flow
```
Register/Login -> JWT Token Pair -> Access Protected Routes
                    |
                    +-> accessToken (24h expiry)
                    +-> refreshToken (7d expiry, stored in Redis)
```

### Security Features
- **Password Hashing**: bcryptjs with 10 salt rounds
- **JWT Tokens**: Signed access (24h) and refresh (7d) tokens
- **Token Blacklisting**: Redis-backed logout invalidation
- **Refresh Rotation**: Secure token renewal endpoint
- **Guest Access**: Anonymous users can chat without authentication
- **Helmet Headers**: Security headers on all responses
- **CORS**: Whitelist-based origin validation

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account (full_name, email, password) |
| `POST` | `/api/auth/login` | No | Login (email, password) -> token pair |
| `POST` | `/api/auth/refresh` | No | Refresh access token |
| `POST` | `/api/auth/logout` | Yes | Blacklist current token |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

---

## WebSocket Real-Time Chat

### Connection
- **Path**: `/ws`
- **Authentication**: Optional JWT via query parameter (`?token=...`)
- **Max Payload**: 64 KB
- **Heartbeat**: Ping every 30 seconds; stale connections terminated

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `connection_established` | Server -> Client | Welcome message with connection ID |
| `chat_message` | Server -> Client | New assistant message with content and tool calls |
| `typing_indicator` | Server -> Client | Real-time typing status (`is_typing: true/false`) |
| `connection_closed` | Server -> Client | Disconnect notification |

### Client Registry
- Anonymous clients receive generated session IDs
- Authenticated users identified by `user_id`
- Supports multiple simultaneous connections per user

---

## Technology Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| TailwindCSS | Utility-first CSS |
| React Query | Server state management |
| Zustand | Client state management |
| Framer Motion | Animations |
| Recharts | Analytics charts |
| React Markdown | Message rendering |
| React Hot Toast | Notifications |

### API Backend
| Technology | Purpose |
|-----------|---------|
| Node.js 20 | Runtime |
| Express.js | HTTP framework |
| ws | WebSocket server |
| jsonwebtoken | JWT auth |
| bcryptjs | Password hashing |
| express-validator | Input validation |
| express-rate-limit | Rate limiting |
| Helmet | Security headers |
| Morgan | HTTP logging |
| ioredis | Redis client |
| pg | PostgreSQL client |

### AI Service
| Technology | Purpose |
|-----------|---------|
| Python 3.11 | Runtime |
| Django 5.1 | Web framework |
| Django REST Framework | API layer |
| OpenAI SDK | LLM integration (gpt-4o-mini) |
| Detoxify | Toxicity detection (BERT-based) |
| spaCy (en_core_web_sm) | PII detection and NER |
| Gunicorn | WSGI server (4 workers) |
| psycopg2 | PostgreSQL adapter |
| django-redis | Redis cache backend |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker Compose | Container orchestration |
| PostgreSQL 16 | Primary database |
| Redis 7 | Cache, sessions, queues |
| Nginx | Frontend static file server |

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- An OpenAI API key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/hassanmzia/AI-Ecommerce-Chat.git
   cd AI-Ecommerce-Chat
   ```

2. **Set your OpenAI API key**

   Create a `.env` file in the project root or export the variable:
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   ```

   Alternatively, add it to the `docker-compose.yml` under the `ai-service` environment section.

3. **Start all services**
   ```bash
   docker compose up -d --build
   ```

4. **Access the application**
   - Frontend: `http://localhost:3065`
   - API: `http://localhost:3066`
   - AI Service: `http://localhost:3067`
   - MCP Server: `http://localhost:3068`
   - A2A Server: `http://localhost:3069`

5. **Test the chat**
   - Open the frontend in your browser
   - Start chatting as a guest or register an account
   - Try queries like:
     - "What is the status of order ORD-10001?"
     - "Show me laptops under $1500"
     - "Look up customer CUST-2001"
     - "What is the payment info for ORD-10003?"

### Stopping

```bash
docker compose down
```

To also remove volumes (database data):
```bash
docker compose down -v
```

---

## Environment Variables

### AI Service

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API base URL |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use for all LLM calls |
| `DATABASE_URL` | (from compose) | PostgreSQL connection string |
| `REDIS_URL` | (from compose) | Redis connection string |
| `DJANGO_SECRET_KEY` | (generated) | Django secret key |

### API Service

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (from compose) | PostgreSQL connection string |
| `REDIS_URL` | (from compose) | Redis connection string |
| `JWT_SECRET` | (from compose) | Secret for JWT signing |
| `AI_SERVICE_URL` | `http://ai-service:3067` | AI service internal URL |
| `MCP_SERVER_URL` | `http://mcp-server:3068` | MCP server internal URL |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

---

## API Reference

### Chat Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/chat/message` | Optional | Send a chat message |
| `GET` | `/api/chat/conversations` | Optional | List conversations |
| `POST` | `/api/chat/conversations` | Optional | Create a new conversation |
| `GET` | `/api/chat/conversations/:id` | Optional | Get conversation with messages |
| `POST` | `/api/chat/conversations/:id/messages` | Optional | Send message to existing conversation |

### Chat Message Request
```json
{
  "message": "What is the status of order ORD-10001?",
  "conversation_id": "optional-uuid",
  "user_id": "optional-user-uuid"
}
```

### Chat Message Response
```json
{
  "success": true,
  "data": {
    "conversation_id": "uuid",
    "user_message": {
      "id": "uuid",
      "role": "user",
      "content": "...",
      "created_at": "2026-02-05T..."
    },
    "assistant_message": {
      "id": "uuid",
      "role": "assistant",
      "content": "Your order ORD-10001 is currently...",
      "tool_calls": [{"tool": "track_order", "params": {"order_id": "ORD-10001"}}],
      "validation_status": "valid",
      "created_at": "2026-02-05T..."
    },
    "metadata": {
      "execution_time_ms": 3250,
      "input_validation": {"is_valid": true, "category": "general"},
      "output_validation": {"is_valid": true},
      "ai_service_available": true
    }
  }
}
```

### AI Service Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agents/orchestrate` | Full pipeline: validate -> detect -> execute -> validate |
| `GET` | `/api/agents/health` | Agent health status and metrics |
| `POST` | `/api/validate/input` | Standalone input validation |
| `POST` | `/api/validate/output` | Standalone output validation |

---

## Project Structure

```
AI-Ecommerce-Chat/
├── docker-compose.yml              # Service orchestration
├── README.md                       # This file
├── docs/
│   ├── architecture-diagram.drawio # Draw.io architecture diagram
│   └── Technical_Architecture.pptx # PowerPoint presentation
│
├── services/
│   ├── frontend/                   # React SPA
│   │   ├── src/
│   │   │   ├── components/         # Reusable UI components
│   │   │   ├── pages/              # Route pages (Chat, Login, Register, Dashboard)
│   │   │   ├── services/           # API client services (auth, chat, products)
│   │   │   ├── stores/             # Zustand state stores
│   │   │   ├── types/              # TypeScript type definitions
│   │   │   └── App.tsx             # Root component with routing
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   │
│   ├── api/                        # Node.js API Gateway
│   │   ├── src/
│   │   │   ├── config/             # Database, Redis, init.sql
│   │   │   ├── controllers/        # Route handlers
│   │   │   ├── middleware/          # Auth, rate limiting
│   │   │   ├── routes/             # Express route definitions
│   │   │   ├── services/           # AI service client, validators
│   │   │   └── websocket/          # WebSocket handler
│   │   └── Dockerfile
│   │
│   ├── ai-service/                 # Django AI Service
│   │   ├── agents/                 # Multi-agent system
│   │   │   ├── orchestrator.py     # Main pipeline orchestrator
│   │   │   ├── models.py           # Django ORM models
│   │   │   ├── views.py            # DRF API views
│   │   │   ├── serializers.py      # Request/response serializers
│   │   │   └── urls.py             # URL routing
│   │   ├── validators/             # Input/output validators
│   │   │   ├── input_validator.py  # Toxicity, injection, topic checks
│   │   │   └── output_validator.py # Toxicity, bias, PII masking
│   │   ├── tools/                  # E-commerce toolkit
│   │   │   └── ecommerce_tools.py  # Tool implementations
│   │   ├── data/                   # Seed data management
│   │   ├── config/                 # Django settings, WSGI
│   │   ├── entrypoint.sh           # Startup: migrate + seed + gunicorn
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── mcp-server/                 # Model Context Protocol Server
│   │   ├── src/
│   │   │   ├── protocols/          # Tool registry
│   │   │   ├── tools/              # 8 MCP tool implementations
│   │   │   └── index.js            # Server entry point
│   │   └── Dockerfile
│   │
│   └── a2a-server/                 # Agent-to-Agent Protocol Server
│       ├── src/
│       │   ├── protocols/          # Agent registry, task manager
│       │   ├── agents/             # 6 A2A agent implementations
│       │   └── index.js            # Server entry point
│       └── Dockerfile
```

---

## Architecture Diagram

A detailed architecture diagram is available in two formats:

1. **Draw.io** — `docs/architecture-diagram.drawio` (editable in [draw.io](https://app.diagrams.net/))
2. **PowerPoint** — `docs/Technical_Architecture.pptx` (7 slides covering all aspects)

---

## Sample Queries

Try these queries to test the different agents:

| Query | Agent | Tools Used |
|-------|-------|------------|
| "What is the status of order ORD-10001?" | OrderTrackingAgent | `track_order` |
| "Show me laptops under $1500" | ProductSearchAgent | `search_products` |
| "Look up customer CUST-2001" | CustomerSupportAgent | `lookup_customer_info` |
| "What payment was used for ORD-10003?" | PaymentInfoAgent | `get_payment_info` |
| "Recommend electronics products" | RecommendationAgent | `get_recommendations` |
| "What is your return policy?" | General LLM | (none) |
| "I've been waiting 3 weeks and nobody is helping!" | SentimentAgent | `sentiment_analysis` |

---

## License

This project is for educational and demonstration purposes.
