# CareerSignal (Resume-AI)
### *Event-Driven Career Intelligence, Evidence Verification & AI Mock Interview Platform*

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-Distributed%20Events-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Revocation-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Aggregations%20%26%20Indexes-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Test Suite](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen)](#automated-testing)

---

## Overview

Most resume tools on the market are superficial *"AI wrappers"*—fragile scripts that paste raw resume text into an LLM prompt and output arbitrary percentage scores. 

**CareerSignal** is built as an **enterprise-grade, event-driven distributed platform** designed for technical candidates and engineering recruiters. It correlates candidate claims across multiple verifiable sources (**Resume PDF**, **GitHub Repositories & CI/CD Proof**, and **Competitive Programming Benchmarks** like LeetCode & Codeforces), diagnoses screening blockers, rewrites bullets using the **Google X-Y-Z formula**, and orchestrates a customized interview sprint with an embedded AI mock interview coach.

---

## System Architecture

CareerSignal utilizes an asynchronous, decoupled micro-architecture powered by **Apache Kafka** and **Redis**:

```mermaid
graph TB
    subgraph Client Layer ["Frontend Client (React 19 + Vite 6)"]
        UI["Modern Obsidian UI<br/>(Glassmorphism + Neon Aurora)"]
        Customizer["Sprint Customizer<br/>(OA / Tech / Full Loop)"]
        Studio["Mock Interview Studio<br/>(Rubric Evaluator)"]
    end

    subgraph Gateway ["Express API Gateway (Port 4000)"]
        AuthMiddleware["JWT Auth + Redis Blacklist Check"]
        DedupEngine["SHA-256 Idempotency Engine"]
        Routes["REST Endpoints (/resumes, /jobs, /analysis, /profiles)"]
    end

    subgraph EventBroker ["Event Broker (Apache Kafka)"]
        IngestTopic["resume.ingested"]
        ReqTopic["analysis.requested"]
        CompTopic["analysis.completed"]
    end

    subgraph Processing ["Decoupled Background Workers"]
        EventConsumer["Worker Event Consumer"]
        MultiSource["Multi-Source Signal Extractor<br/>(GitHub API + LeetCode / Codeforces)"]
        ScoringEngine["12-Pillar Deterministic & Explainable Engine"]
        LLMCoach["LLM Interview Coach (Groq / Gemini)"]
    end

    subgraph Storage ["Persistence & Caching"]
        MongoDb[("MongoDB 7<br/>(Compound Indexes + Unique Hashes)")]
        RedisCache[("Redis 7<br/>(Report Cache-Aside + Revoked JWTs)")]
    end

    UI -->|HTTP / Multi-part| Routes
    Customizer -->|PUT /api/analysis/:id/customize| Routes
    Studio -->|POST /mock-interview/evaluate| Routes

    Routes --> AuthMiddleware
    AuthMiddleware <-->|O(1) Token Check| RedisCache
    Routes --> DedupEngine
    DedupEngine <-->|Unique Check| MongoDb

    Routes -->|Publish Event| IngestTopic
    Routes -->|Publish Event| ReqTopic

    IngestTopic --> EventConsumer
    ReqTopic --> EventConsumer

    EventConsumer --> MultiSource
    EventConsumer --> ScoringEngine
    ScoringEngine --> LLMCoach

    ScoringEngine <-->|Read / Write TTL Cache| RedisCache
    ScoringEngine <-->|Upsert Idempotent Report| MongoDb
    EventConsumer -->|Publish Event| CompTopic
```

---

## Key Architectural Pillars

### 1. The Google X-Y-Z Bullet Point Optimization Engine
Recruiters at top-tier tech companies (Google, Meta, Amazon) look for quantified engineering impact rather than vague task lists. CareerSignal implements the official **Google X-Y-Z Pattern**:

$$\mathbf{\text{Accomplished [X], as measured by [Y], by doing [Z]}}$$

* **[X]**: Clear active verb and engineering deliverable.
* **[Y]**: Measurable business, latency, throughput, or operational metric.
* **[Z]**: Specific architectural tools, protocols, and design patterns utilized.

#### Before vs. After Optimization Example:
| Current Resume Bullet (Weak / Passive) | CareerSignal Google X-Y-Z Rewrite (High-Impact) |
| :--- | :--- |
| *"Worked on backend APIs and added Redis caching for data."* | **"Architected distributed RESTful microservices using Node.js & Redis Cache-Aside with TTL eviction, reducing p99 API latency by 42% across 15k+ daily concurrent requests."** |
| *"Handled deployment with Docker."* | **"Engineered multi-stage Docker containerization and automated GitHub Actions CI/CD pipelines, cutting deployment cycle times from 45 minutes to 7 minutes with zero downtime."** |

---

### 2. Multi-Source Evidence Verification (Beyond Just Resume Text)
Rather than blindly trusting self-reported resume claims, CareerSignal correlates evidence across live developer platforms:
* **GitHub API Integration**: Evaluates public repository depth, language breakdown percentages, backend service patterns, and Dockerfile / CI-CD configuration proof.
* **Competitive Programming Verification (LeetCode, Codeforces, CodeChef)**: Evaluates verified problem counts by difficulty tier (Easy, Medium, Hard) and contest ratings to benchmark DSA competency.
* **Tri-State Skill Classification**:
  * **Verified Strong**: Verified in both resume claims and GitHub/CP code proof with **HIGH** confidence.
  * **Partial Claims**: Claimed on resume but lacking public repository verification (**MEDIUM** confidence).
  * **Significant Gaps**: Explicitly required by the job description but absent across all candidate signals.

---

### 3. Idempotent Ingestion & Database Deduplication
To prevent database bloat and eliminate duplicate documents when a candidate re-uploads a resume or re-analyzes a job description:
* **Normalized Content Hashing**: Raw text is normalized (lowercased, whitespace collapsed, trimmed) and converted into a **SHA-256 `contentHash`**.
* **Compound Unique Indexes**:
  * `Resume`: Unique index on `{ user: 1, contentHash: 1 }`.
  * `JobDescription`: Unique index on `{ user: 1, contentHash: 1 }` and `{ user: 1, title: 1, company: 1 }`.
  * `AnalysisReport`: Unique index on `{ user: 1, resume: 1, jobDescription: 1 }`.
* **Safe Upserting**: If the same file or JD is provided, CareerSignal updates the existing record, increments the version, and returns cached analysis results.

---

### 4. Interactive Preparation Sprint Customizer
Candidates can dynamically recalibrate their preparation schedule in real-time based on upcoming interviews:
* **Target Round Focus**:
  * **Online Assessment (OA)**: Shifting focus to high-frequency patterns (Two Pointers, Sliding Window, Monotonic Stack, Trees, DSU, Graphs, DP memoization) and 90-minute timed mock screens.
  * **Technical & System Design**: Deep dives into Redis Cache-Aside, Kafka message queues, database indexing/sharding, rate limiters, and outage recovery.
  * **Full Loop (Comprehensive)**: A balanced 5-phase schedule covering core fundamentals, system design, and behavioral alignment.
* **Time Horizon**: Custom sliders and presets for **3-Day Crash Sprints**, **7 Days**, **14 Days**, and **30 Days**.

---

### 5. Shortlist Blockers: *"Why am I not getting shortlisted?"*
A dedicated diagnostic panel scanning for recruiter screening red flags:
* Unquantified bullet points lacking measurable metrics.
* Absence of live cloud deployment or containerization proof.
* Sub-60% keyword match against automated Applicant Tracking Systems (ATS).
* Prioritized **"Fix These First"** checklist with estimated completion time.

---

### 6. AI Mock Interview Studio with Rubric Scoring
* Tailored interview questions grouped by:
  * **Technical Architecture**
  * **Resume Claim Deep-Dives**
  * **Project System Design**
  * **Behavioral Trade-offs**
* Interactive response box where candidates answer questions and receive instant AI coach evaluation across a **4-dimensional rubric (10-point scale)**:
  * `Technical Accuracy`
  * `Answer Depth`
  * `Clarity & Structure`
  * `Confidence & Trade-offs`
* Identifies missing talking points and provides an **Ideal Model Answer**.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, React Router DOM 7, Vanilla CSS3 (Obsidian & Glassmorphism Design System) |
| **Backend Runtime** | Node.js 20 (ES Modules), Express.js 5 |
| **Event Broker** | Apache Kafka 3.7 (`kafkajs`) |
| **Distributed Cache** | Redis 7 (`redis` v5 client) |
| **Primary Database** | MongoDB 7 / MongoDB Atlas (`mongoose` v9) |
| **AI / LLM Providers** | Groq Cloud API (`openai/gpt-oss-20b`) / Google Gemini 2.0 Flash (with deterministic fallback) |
| **Containerization** | Docker, Docker Compose, Multi-stage Nginx |
| **Testing** | Node.js Native Test Runner (`node:test`, `node:assert/strict`) |

---

## Quick Start Guide

### Prerequisites
* **Node.js**: v20.11.0 or higher
* **npm**: v10.0.0 or higher
* **Docker & Docker Compose** (optional for containerized deployment)

---

### Method 1: Local Development

#### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Resume-AI.git
cd Resume-AI
```

#### 2. Start Redis & Kafka (Docker)
```bash
docker compose up redis kafka -d
```

#### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
*Configure your `.env` file:*
```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/careersignal
JWT_SECRET=your_super_secret_jwt_key
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
KAFKA_BROKERS=localhost:9092
```
*Launch backend:*
```bash
npm run start
```

#### 4. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
*Open your browser at **`http://localhost:5173/`**.*

---

### Method 2: Single-Command Docker Compose

To run the entire multi-container stack (Frontend, Backend, MongoDB, Redis, Kafka):

```bash
docker compose up --build -d
```
* Access Frontend: **`http://localhost:5173`**
* Access Backend API: **`http://localhost:4000`**

---

## Automated Testing

CareerSignal includes automated unit and integration tests verifying deduplication, plan generation, and JWT revocation:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
* `SHA-256 contentHash normalization`: Verifies idempotent hash equality across varying whitespace and line-endings.
* `Dynamic buildPreparationPlan`: Verifies adaptive milestone scheduling for OA vs Technical vs Comprehensive sprints.
* `12-Pillar Scoring Engine`: Validates explainable scorecard generation and breakdown metrics.
* `JWT Blacklist Revocation`: Ensures logged-out tokens are immediately denied access in Redis.

```text
TAP version 13
# Subtest: compareResumeToJob produces full explainable report with all report.txt pillars
ok 1 - compareResumeToJob produces full explainable report with all report.txt pillars
# Subtest: SHA-256 contentHash generates identical hash for identical text
ok 2 - SHA-256 contentHash generates identical hash for identical text
# Subtest: buildPreparationPlan dynamically adapts for OA vs Technical vs Comprehensive sprint
ok 3 - buildPreparationPlan dynamically adapts for OA vs Technical vs Comprehensive sprint
# Subtest: logoutUser allows an expired token to be treated as already logged out
ok 4 - logoutUser allows an expired token to be treated as already logged out
1..4
# tests 4
# pass 4
# fail 0
```

---

## License
This project is licensed under the [MIT License](LICENSE).
