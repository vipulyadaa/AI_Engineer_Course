# Progress Tracker

**Format:** the 10-section interview-prep structure defined in `_STYLE-GUIDE.md`.
**Method:** template files replaced in place, phase by phase.

**Status: 601 / 743 files complete** — all verified at exactly 10 sections.

---

## Complete

| Phase | Topics | Notes |
|---|---|---|
| 01 · Machine Learning Fundamentals | 50 / 50 | |
| 02 · Deep Learning | 21 / 21 | Concise per the basic-concepts depth rule |
| 03 · Transformers | 23 / 23 | Deep |
| 04 · LLM Fundamentals | 30 / 30 | Deep |
| 05 · Prompt Engineering | 20 / 20 | Deep |
| 06 · Embeddings | 20 / 20 | Deep |
| 07 · Vector Databases | 22 / 22 | Deep |
| 08 · RAG Fundamentals | 20 / 20 | Deep |
| 09 · Advanced RAG | 22 / 22 | Deep |
| 10 · RAG Chunking | 14 / 14 | Deep |
| 11 · RAG Retrieval | 16 / 16 | Deep |
| 12 · RAG Evaluation | 21 / 21 | Deep |
| 13 · RAG Failure Modes | 16 / 16 | Deep |
| 14 · RAG Security | 15 / 15 | Deep |
| 15 · LangChain | 16 / 16 | Medium |
| 16 · LangGraph | 22 / 22 | Topics 18–22 are answer frameworks |
| 17 · AI Agents | 30 / 30 | Deep |
| 18 · Agentic RAG | 13 / 13 | Deep |
| 19 · Google Gemini | 20 / 20 | Deep — core for the role |
| 20 · Vertex AI | 21 / 21 | Deep — core for the role |
| 21 · Google ADK | 20 / 20 | Deep — core for the role |
| 22 · AI Evaluation | 20 / 20 | **Deep** |
| 24 · LLM Performance | 16 / 16 | Medium |
| 25 · LLM Cost Optimization | 14 / 14 | Medium |
| 26 · Responsible AI & Security | 20 / 20 | **Deep** |
| 28 · AI System Design | 12 / 12 | **Deep** |
| 31 · Project Deep Dive — Banking FAQ RAG | 40 / 40 | **Deep** — 01–20 answer frameworks, 21–40 design answers |
| 32 · LangGraph Project Deep Dive | 15 / 15 | **Deep** — 01–11 answer frameworks, 12–15 design answers |
| 34 · Google-Specific Interview Questions | 12 / 12 | **Deep** |

**Subtotal: 601 files**

---

## Remaining — 142 files

All are folders explicitly agreed to skip.

| Phase | Topics | Depth |
|---|---|---|
| 23 · LLMOps / MLOps | 18 | Medium–deep |
| 27 · Multimodal AI | 12 | Medium |
| 29 · ML/AI Coding | 27 | Medium |
| 30 · Python for AI | 20 | Concise |
| 33 · Scenario Questions | — | README only; no topic files exist |
| 35 · Behavioral Questions | 15 | Medium — answer frameworks |
| 36 · Rapid Fire | 20 | Concise |
| 37 · Real Interview Mode | 30 | **Deep** |

---

## Conventions in use

- Header: `# Topic` then `> **Phase NN · PHASE NAME · Topic NN**`
- Exactly ten `## N.` sections, in the order fixed by the style guide
- Section 7 is a blockquote, first-person, written to be spoken
- Section 8 is 3–5 bold `**Q:**` questions with 2–4 sentence answers
- Cross-links use relative paths between phase folders
- Running banking example for continuity: international wire fee
  **$45 retail / $25 Premier, first two per calendar month waived**
- **Personal-experience topics** (16/18–22, and phases 31, 32, 35) are written
  as *answer frameworks* with a visible warning banner — structure and reasoning
  are given, specifics are marked for the reader to supply. Nothing is asserted
  as the reader's own history.
- Experience framed honestly against genuine ground only: Python, LLM
  applications, banking FAQ automation, RAG, embeddings, vector databases,
  LangChain, LangGraph

---

## Verification

Run from the repo root to check section counts across all phases:

```bash
for d in [0-9][0-9]-*/; do
  for f in "$d"[0-9]*.md; do
    n=$(grep -c "^## [0-9]" "$f")
    [ "$n" != "10" ] && echo "CHECK $f = $n"
  done
done
```

> Note: `10-rag-chunking/08-markdown-aware-chunking.md` reports 11 — a false
> positive, as one `## 3. Fees` line sits inside a fenced code block
> illustrating markdown structure.
