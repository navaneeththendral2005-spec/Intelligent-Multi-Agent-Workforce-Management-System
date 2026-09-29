# CHORUS — Intelligent Multi-Agent Workforce Management System

CHORUS is an AI-powered multi-agent employee system designed to understand user requests, coordinate specialized AI agents, and execute tasks across software development, research, data analysis, document generation, and communication.

Instead of relying on a single AI model for every task, CHORUS uses specialized agents coordinated through a central Manager and Orchestrator.

---

## Overview

CHORUS can handle a wide range of tasks through specialized agents, including:

- Software development
- Web research
- Data analysis
- Document generation
- Presentation generation
- Spreadsheet generation
- File processing
- Email communication
- Code generation and debugging
- Code review and testing
- Multi-step task orchestration

The system is designed around the idea of an AI employee that can understand a request, determine the appropriate agent or workflow, execute the task, and return the result through a unified interface.

---

## Project Structure

CHORUS follows a modular architecture consisting of a React/Vite frontend, FastAPI backend, specialized AI agents, communication tools, and document generation utilities.

### Frontend

- React + Vite
- frontend/src/components/
- frontend/src/hooks/
- frontend/src/data/

### Backend

- api/server.py
- main.py
- agents/

### AI Agents

- Manager / Orchestrator
- Research Agent
- Data Analyst Agent
- Document Agent
- Developer Agent
- Code Fixer Agent
- Debugger Agent
- Code Reviewer Agent
- Communication Agent
- Content Agent
- Tester Agent

### Tools & Integrations

- document_tools/
- communication_auth/
- Gmail API
- Tavily Search
- Pandas
- Document generation libraries

### Configuration

- .env.example
- .gitignore
- requirements.txt

---

## IMPORTANT

CHORUS requires two terminals to run locally. Start the FastAPI backend in one terminal and the React/Vite frontend in another. Before starting the backend, configure your own API keys and required credentials in a `.env` file using `.env.example` as a reference.

Terminal 1 — Backend

uvicorn api.server:app --reload --host 127.0.0.1 --port 8000

Terminal 2 — Frontend

cd frontend

npm install

npm run dev

---

## Architecture

```text
                         ┌──────────────────────┐
                         │        User          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   CHORUS Frontend    │
                         │     React + Vite     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    FastAPI Backend   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │   Manager / Orchestrator     │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
   Research Agent          Data Analyst Agent       Document Agent
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
              Developer       Code Fixer    Communication
                Agent           Agent           Agent
