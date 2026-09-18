# Reading-Material Style Guide

Interview-ready study notes. Optimized for **understanding + interview usability**,
not textbook completeness.

## The 10-section structure (every topic, in this order)

```markdown
# <Topic Name>

> **Phase NN · <PHASE NAME> · Topic NN**

## 1. Definition
2–3 simple lines. What it is. No preamble.

## 2. Simple Explanation
Explain as if it's the first time I'm meeting this idea. One analogy max.

## 3. How It Works
4–6 clear bullets or numbered steps. The mechanism.

## 4. Practical Example
Preferably AI/ML/LLM/RAG. Short code only if it genuinely clarifies.

## 5. Why It Matters
2–3 points. Why an AI Engineer cares.

## 6. Trade-offs / Failure Modes
Only the important ones. Table or tight bullets.

## 7. Interview Answer
A natural 45–90 second spoken answer, in quote block. Say-it-out-loud ready.

## 8. Likely Follow-ups
3–5 questions with concise answers (2–4 sentences each).

## 9. Common Mistakes
What NOT to say. Tight list.

## 10. What to Remember
3–5 bullets. Night-before review.
```

## Depth rule

| Topic type | Target length |
|---|---|
| Basic concepts (ML fundamentals, metrics, terminology) | **3–7 KB** — concise, beginner-friendly |
| Core Google Cloud AI Engineer topics — RAG, LLMs, Transformers, Agents, Gemini, Vertex AI, evaluation, security, AI system design | **7–15 KB** — deeper where it earns it |

## Rules

1. **No repetition across sections.** If "How It Works" said it, "Why It Matters" doesn't repeat it.
2. **No history lessons.** Skip the 1950s→2017 arc unless the date is the point.
3. **No long war stories.** A one-line named example is fine; a three-paragraph incident report is not.
4. **No long code.** 5–15 lines max, only when it clarifies faster than prose.
5. **No philosophy.** Skip "what is intelligence really" detours.
6. **One example per idea**, not three.
7. **Concrete numbers** where they help (thresholds, dimensions, typical accuracies).
8. **Honest experience framing.** Genuine hands-on ground is: Python, LLM applications,
   banking FAQ automation, RAG, embeddings, vector databases, LangChain, LangGraph.
   Never invent experience. For everything else, frame as understanding.

## Tone

Direct. Second person where useful. Written to be *spoken* in an interview,
not recited from a textbook.

## Progress tracking

`_PROGRESS.md` records which batches (phases) are done.
