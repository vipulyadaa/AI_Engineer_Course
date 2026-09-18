# AI Engineer Study Library

This repository is a structured interview-preparation library for AI Engineer and Google Cloud AI Engineer roles. It brings together the fundamentals, architecture patterns, production concerns, coding practice, project discussions, and interview simulations needed to reason about modern AI systems.

The notes are written to be understood, explained aloud, and used in technical interviews—not memorized as disconnected definitions.

## Library at a glance

- 37 learning phases
- 743 topic notes
- 783 Markdown files including phase indexes and library documentation
- Machine learning, deep learning, transformers, LLMs, RAG, agents, LangChain, LangGraph, Gemini, Vertex AI, Google ADK, evaluation, security, MLOps, system design, coding, and interview practice
- A consistent interview-ready structure across the completed topic notes

## Complete learning roadmap

| Phase | Area | Topics |
| --- | --- | ---: |
| 01 | Machine Learning Fundamentals | 50 |
| 02 | Deep Learning | 21 |
| 03 | Transformers | 23 |
| 04 | LLM Fundamentals | 30 |
| 05 | Prompt Engineering | 20 |
| 06 | Embeddings | 20 |
| 07 | Vector Databases | 22 |
| 08 | RAG Fundamentals | 20 |
| 09 | Advanced RAG | 22 |
| 10 | RAG Chunking | 14 |
| 11 | RAG Retrieval | 16 |
| 12 | RAG Evaluation | 21 |
| 13 | RAG Failure Modes | 16 |
| 14 | RAG Security | 15 |
| 15 | LangChain | 16 |
| 16 | LangGraph | 22 |
| 17 | AI Agents | 30 |
| 18 | Agentic RAG | 13 |
| 19 | Google Gemini | 20 |
| 20 | Vertex AI | 21 |
| 21 | Google ADK | 20 |
| 22 | AI Evaluation | 20 |
| 23 | LLMOps / MLOps | 18 |
| 24 | LLM Performance | 16 |
| 25 | LLM Cost Optimization | 14 |
| 26 | Responsible AI and Security | 20 |
| 27 | Multimodal AI | 12 |
| 28 | AI System Design | 12 |
| 29 | ML / AI Coding | 27 |
| 30 | Python for AI | 20 |
| 31 | Project Deep Dive: Banking FAQ RAG | 40 |
| 32 | LangGraph Project Deep Dive | 15 |
| 33 | Scenario Questions | 0 topic files; index only |
| 34 | Google-Specific Interview Questions | 12 |
| 35 | Behavioral Questions | 15 |
| 36 | Rapid Fire | 20 |
| 37 | Real Interview Mode | 30 |

## What the notes cover

### Foundations

The first four phases establish the mental model for intelligent systems: supervised and unsupervised learning, neural networks, optimization, generalization, attention, transformer architecture, tokenization, embeddings, inference, sampling, fine-tuning, and model compression.

### LLM applications

The prompting, embeddings, vector database, and RAG phases explain how language models become useful applications. They cover prompt structure, function calling, semantic search, chunking, retrieval strategies, reranking, grounding, context management, hallucination control, evaluation, and failure diagnosis.

### Agents and orchestration

The LangChain, LangGraph, AI Agents, and Agentic RAG phases cover tool use, planning, state, memory, conditional routing, loops, retries, human intervention, agent evaluation, and production workflow design.

### Google Cloud AI

The Gemini, Vertex AI, and Google ADK phases focus on the Google ecosystem: model access, model selection, multimodal capabilities, deployment, evaluation, vector search, agent development, enterprise controls, and cloud AI infrastructure.

### Production engineering

The evaluation, LLMOps / MLOps, performance, cost, responsible AI, security, multimodal, and system-design phases address the concerns that appear after a prototype works: latency, throughput, token budgets, caching, monitoring, drift, access control, prompt injection, privacy, governance, reliability, and scale.

### Projects and interview practice

The Banking FAQ RAG and LangGraph project deep dives turn the concepts into defensible project explanations. The Google-specific, behavioral, rapid-fire, scenario, and real-interview phases help convert technical understanding into concise, natural spoken answers.

## Standard note structure

The main topic notes follow a ten-section interview-preparation format:

1. Definition
2. Simple Explanation
3. How It Works
4. Practical Example
5. Why It Matters
6. Trade-offs / Failure Modes
7. Interview Answer
8. Likely Follow-ups
9. Common Mistakes
10. What to Remember

This structure is designed to move from first-principles understanding to a spoken answer, then to deeper follow-up reasoning and last-minute review.

## Writing principles

- Direct, practical, and interview-ready language
- Simple explanations before implementation detail
- One strong AI, ML, LLM, or RAG example per idea
- Concrete numbers when thresholds, dimensions, latency, or cost make the concept clearer
- Important trade-offs instead of exhaustive lists
- Short code only when it clarifies a mechanism
- No invented production experience
- Personal project claims are framed honestly around Python, LLM applications, banking FAQ automation, RAG, embeddings, vector databases, LangChain, and LangGraph

## Progress and coverage

The progress tracker currently records **601 of 743 topic files complete**, with the remaining 142 files belonging to phases that were explicitly left for later coverage. Completed deep areas include the core ML and LLM foundations, RAG, agents, Google AI platforms, evaluation, security, system design, and both project deep dives.

## Running project example

The recurring example used across relevant notes is an international wire-fee banking FAQ:

- Retail fee: **$45**
- Premier fee: **$25**
- First two transfers per calendar month: **waived**

This gives the RAG, retrieval, evaluation, security, and project-design discussions a consistent business context.

## Source organization

- `AI Engineer notes/` contains the original Markdown study material organized by numbered phase.
- `index.html`, `styles.css`, and `app.js` provide the interactive study portal.
- `study-data.js` is the generated content snapshot used by the webpage.
- `_STYLE-GUIDE.md` defines the note-writing conventions.
- `_PROGRESS.md` records phase completion and verification status.
