# Context Relevance

> **Phase 12 · RAG EVALUATION · Topic 07**

## 1. Definition

Whether the retrieved context is relevant to the question — measuring retrieval quality from the generator's perspective. It's the third leg of the RAG triad, alongside faithfulness and answer relevance.

## 2. Simple Explanation

Did retrieval bring back the right material?

This is the metric that tells you whether a bad answer is retrieval's fault or generation's fault. If context relevance is low, no prompt engineering helps — the information wasn't there. If it's high and the answer is still wrong, the problem is generation.

## 3. How It Works

**Two measurement approaches:**

```
1. Chunk-level relevance (like precision@k)
   For each retrieved chunk, judge: relevant to the question?
   context_relevance = relevant chunks / retrieved chunks

2. Sentence-level (RAGAS-style)
   Of the sentences in the retrieved context, what fraction
   is needed to answer the question?
   → catches the case where a chunk is topically right but
     90% of its text is irrelevant
```

**The RAG triad, and what each isolates:**

```
                    question
                       │
              ┌────────┴────────┐
              ▼                 │
        retrieved context       │
              │                 │
     CONTEXT RELEVANCE          │  ANSWER RELEVANCE
     (is the context            │  (does the answer
      relevant?)                │   address the question?)
              │                 │
              ▼                 ▼
            answer ◀────────────┘
              │
       FAITHFULNESS
       (is every claim
        supported by context?)
```

**The diagnostic table — this is the whole value of measuring all three:**

| Context rel. | Faithfulness | Answer rel. | Diagnosis |
|---|---|---|---|
| Low | — | — | **Retrieval failure.** Fix chunking, hybrid, embeddings |
| High | Low | — | **Hallucination.** Fix prompt, abstention, temperature |
| High | High | Low | **Off-target generation.** Fix prompt focus |
| High | High | High | Working |

## 4. Practical Example

**Isolating the failure:**

```
Q: "How long does an international transfer take?"

Retrieved: the fee schedule.
Answer:    "International transfers cost $45 for retail accounts."

context_relevance = 0.1   ← the context didn't address timing
faithfulness      = 1.0   ← every claim IS in the context
answer_relevance  = 0.2   ← didn't answer the question

Diagnosis: RETRIEVAL failure. The generator behaved correctly
given what it was handed. Tuning the prompt would waste a week.
```

**Versus a generation failure:**

```
Q: "How long does an international transfer take?"

Retrieved: "International transfers settle within 3-5 business days.
            Expedited transfers settle same-day for an additional fee."
Answer:    "International transfers usually take about a week."

context_relevance = 0.95  ← the right context WAS retrieved
faithfulness      = 0.0   ← "about a week" contradicts "3-5 days"
answer_relevance  = 0.9   ← it did address timing

Diagnosis: GENERATION failure. Fix the prompt or the model.
```

## 5. Why It Matters

- **It's what separates retrieval failures from generation failures**, which have completely different fixes.
- **It's measurable without ground-truth chunk labels** — an LLM judge can assess relevance directly.
- **Low context relevance invalidates everything downstream** — you can't fix it with a better prompt.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Judge cost** | An LLM call per chunk, or per context set, per evaluated query |
| **"Relevant" is fuzzy** | Partially relevant and background-context chunks are hard to grade |
| **Chunk-level hides dilution** | A chunk can be relevant while 90% of its text isn't — sentence-level catches this |
| **Doesn't measure completeness** | Relevant context that's *missing* a needed fact scores well |
| **Judge drift** | A provider model update shifts the metric with no system change |

**The completeness gap is worth naming:** context relevance measures whether what you retrieved is relevant, not whether it's *sufficient*. A context containing a relevant but partial fact scores highly and still can't support a complete answer. Recall@k against known correct chunks catches that; context relevance doesn't.

**So the practical pairing is:** recall@k for coverage (did we get everything needed?) and context relevance for precision (was what we got relevant?).

## 7. Interview Answer

> "Context relevance is whether the retrieved context is relevant to the question. It's the third leg of the RAG triad with faithfulness and answer relevance, and its main value is diagnostic.
>
> Measuring all three together tells you where a failure lives. Low context relevance means retrieval failed — the information wasn't there, and no prompt engineering helps. High context relevance with low faithfulness means hallucination — the right material was retrieved and the model went beyond it. High on both with low answer relevance means off-target generation.
>
> The concrete case: someone asks how long an international transfer takes, retrieval returns the fee schedule, and the model answers about fees. Faithfulness scores 1.0 — every claim is in the context. Without context relevance I'd see a perfect faithfulness score and a bad answer, and might spend a week tuning the prompt. Context relevance at 0.1 tells me immediately it's retrieval.
>
> I'd measure it at sentence level rather than chunk level where budget allows, because a chunk can be topically relevant while ninety percent of its text is irrelevant filler — that dilution costs tokens and distracts the model, and chunk-level grading misses it.
>
> One limitation to be explicit about: context relevance measures whether what you retrieved is relevant, not whether it's *sufficient*. A relevant but partial fact scores well and still can't support a complete answer. So I'd pair it with recall@k against known correct chunks, which measures coverage."

## 8. Likely Follow-ups

**Q: What's the RAG triad?**
Context relevance, faithfulness, and answer relevance. Context relevance measures retrieval, faithfulness measures whether generation stayed within the evidence, and answer relevance measures whether the response addressed the question. Together they localize any failure to a specific stage, which is why measuring all three beats measuring end-to-end quality alone.

**Q: How do you measure it?**
An LLM judge assessing each retrieved chunk, or the context as a whole, against the question. Sentence-level grading — what fraction of the retrieved sentences are needed to answer — is more informative than chunk-level, because it catches the case where a chunk is topically right but mostly filler.

**Q: Why not just measure end-to-end answer quality?**
Because it tells you something is wrong without telling you where. A bad answer could be retrieval, generation, or prompt — three completely different fixes. The triad localizes it in one evaluation pass, which is worth far more than a single aggregate score.

**Q: What's the difference from recall@k?**
Recall@k measures coverage against known correct chunks — did we retrieve everything needed. Context relevance measures precision from the generator's view — was what we retrieved relevant. Recall needs labeled ground truth; context relevance needs only a judge. They're complementary: recall catches missing information, context relevance catches noise.

**Q: What does high context relevance with a bad answer indicate?**
A generation problem. The right material was retrieved and the model still produced a wrong answer — so I'd look at faithfulness to distinguish hallucination from off-target answering, then fix the prompt, the abstention instruction, the temperature, or consider the model choice. What I would *not* do is spend time on chunking or the embedding model.

## 9. Common Mistakes

- Measuring only end-to-end quality, losing the ability to localize failures.
- Grading at chunk level only, missing within-chunk dilution.
- Treating context relevance as a completeness measure — it isn't.
- Not pairing it with recall@k, so missing information goes undetected.
- Tuning the prompt when context relevance says the problem is retrieval.

## 10. What to Remember

- **Was the retrieved context relevant?** The retrieval leg of the RAG triad.
- **Its value is diagnostic** — it separates retrieval failures from generation failures.
- **Sentence-level grading beats chunk-level**, catching within-chunk dilution.
- **It measures relevance, not sufficiency.** Pair with recall@k for coverage.
- **Low context relevance means no prompt change will help.**
