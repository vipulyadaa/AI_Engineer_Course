# Irrelevant Documents

> **Phase 11 · RAG RETRIEVAL · Topic 15**

## 1. Definition

Retrieved chunks that don't bear on the question. They cost tokens, distract the model, and can actively cause wrong answers — retrieval precision matters, not just recall.

## 2. Simple Explanation

Top-k always returns k chunks, whether or not any are relevant. So if only two chunks in your corpus answer the question, you still get five — and three of them are noise.

The intuition that "extra context is harmless, the model will ignore it" is wrong. Irrelevant context measurably degrades answers.

## 3. How It Works

**Why irrelevant chunks hurt:**

1. **Distraction** — the model may blend in a plausible-looking but wrong detail from an unrelated chunk.
2. **Conflict** — an irrelevant chunk containing a *different* fee for a *different* product looks like contradictory evidence.
3. **Dilution** — the correct chunk is one of five rather than one of two, and it may land mid-context where attention is weakest.
4. **Cost** — you pay input tokens on every query for text that contributes nothing.

**The mitigations, in order:**

| Fix | Effect |
|---|---|
| **Similarity threshold** | Drop chunks below a tuned relevance floor |
| **Reranking** | Reorder so the genuinely relevant ones are in the final k |
| **Lower k** | Fewer chunks, higher average relevance |
| **Metadata filtering** | Exclude wrong-product, wrong-date, wrong-type chunks entirely |
| **Relevance grading (CRAG)** | Explicitly drop graded-irrelevant chunks |
| **Deduplication** | Near-duplicates waste slots that could hold distinct information |

## 4. Practical Example

**The conflict failure, concretely:**

```
Query: "What's the international wire fee for Premier?"

Retrieved:
  [1] "Premier international transfers: $25."           ← correct
  [2] "Premier domestic wires: $0."                     ← irrelevant
  [3] "Business Flex international transfers: $35."     ← irrelevant
  [4] "Retail international transfers: $45."            ← irrelevant
  [5] "Premier account minimum balance: $10,000."       ← irrelevant

Four dollar amounts, all real, all for different things.
The model must correctly select $25 from five candidates,
three of which are also "international transfer fees."

With only [1] in context, there's nothing to get wrong.
```

**The measured effect from over-retrieval:**

```
 k    recall@k   groundedness
 3      0.79        0.86
 5      0.88        0.91    ← peak
10      0.94        0.90
20      0.96        0.86    ← recall UP, quality DOWN
```

**Recall keeps improving while answer quality declines.** That divergence is the entire argument for precision.

## 5. Why It Matters

- **It disproves the "more context is free" intuition**, which is a common and costly assumption.
- **It's the reason reranking exists** — recovering precision after a recall-oriented retrieval.
- **It's a direct cost line** — irrelevant tokens on every query, forever.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Fixed k with no floor** | Always returns k chunks, padding with noise on narrow queries |
| **Threshold too strict** | Over-abstention; drops relevant chunks |
| **Near-duplicates** | Overlapping chunks occupy k slots with repeated content |
| **No metadata filtering** | Wrong-product and wrong-date chunks compete |
| **Optimizing recall only** | The classic error — recall rises while answers get worse |
| **Assuming the model ignores noise** | It doesn't; it blends |

**The "lost in the middle" interaction:** irrelevant chunks don't just add noise, they push the relevant chunk deeper into the context where models attend less reliably. So the cost isn't only distraction — it's reduced use of the chunk that mattered.

**Ordering helps:** place the highest-relevance chunks at the start and end of the context rather than in ranked order top to bottom.

## 7. Interview Answer

> "Irrelevant documents are retrieved chunks that don't bear on the question, and the important point is that they're not harmless. The intuition that extra context is free and the model will just ignore it is wrong — irrelevant context measurably degrades answers.
>
> The clearest failure is conflict. If someone asks the Premier international wire fee and I retrieve five chunks containing four different dollar amounts — Premier international, Premier domestic, Business Flex international, Retail international — the model has to correctly select twenty-five dollars from five candidates, three of which are also 'international transfer fees.' With only the correct chunk in context, there's nothing to get wrong.
>
> The measurement that makes this concrete: sweep k and you typically see recall keep climbing while groundedness peaks around five and then falls. Recall up, quality down. That divergence is the whole argument for caring about precision, not just recall.
>
> There's also a positional effect. Irrelevant chunks push the relevant one deeper into the context, where models attend less reliably — so you lose twice.
>
> My mitigations in order: a tuned similarity floor so narrow queries return fewer chunks rather than padding with noise, reranking to get genuinely relevant chunks into the final k, metadata filtering to exclude wrong-product and wrong-date chunks entirely, and deduplication so near-duplicates don't occupy slots. And I'd order the final context with the best chunks at the start and end."

## 8. Likely Follow-ups

**Q: Why doesn't the model just ignore irrelevant context?**
Because it can't reliably distinguish "irrelevant" from "relevant but about a related thing." A chunk about a different product's fee looks structurally identical to the correct one — same format, same kind of number. The model is doing pattern matching over the context, not fact-checking against a schema, so plausible-looking near-misses get blended in.

**Q: How do you reduce irrelevant retrieval?**
A similarity floor so narrow queries return fewer chunks, reranking to improve final-set precision, metadata filtering to exclude ineligible content entirely, and deduplication. Explicit relevance grading — corrective RAG — is the strongest version, dropping chunks a grader marks irrelevant before generation.

**Q: Isn't recall more important than precision in RAG?**
Recall is the hard ceiling — you can't answer from a chunk that wasn't retrieved. But precision determines whether you actually use the recall you have. The resolution is doing both at different stages: retrieve wide for recall, rerank narrow for precision. That's why the two-stage architecture exists rather than picking one.

**Q: How do you measure this?**
Precision@k — the fraction of retrieved chunks that are relevant — alongside recall@k. And end-to-end groundedness, because the harm shows up in answer quality. The sweep that reveals it is varying k and watching recall and groundedness diverge; if groundedness declines while recall improves, irrelevant chunks are doing damage.

**Q: What role does ordering play?**
A real one. Models use information at the start and end of a context more reliably than the middle, so I'd place the highest-relevance chunks at the edges rather than in ranked order top to bottom. Irrelevant chunks make this worse by pushing the relevant chunk deeper, so reducing them helps positionally as well as by reducing distraction.

## 9. Common Mistakes

- Assuming extra context is harmless.
- Optimizing recall without measuring precision or answer quality.
- Using a fixed k with no similarity floor, padding narrow queries with noise.
- Not deduplicating, so near-duplicates consume k slots.
- Ordering chunks by rank top-to-bottom, burying the best one.

## 10. What to Remember

- **Irrelevant context degrades answers** — it isn't free.
- **Conflict is the main mechanism** — similar-looking facts about different things.
- **Recall and groundedness diverge as k rises.** That's the case for precision.
- **Fixes:** similarity floor, reranking, metadata filtering, deduplication, relevance grading.
- **Order the final context** with the best chunks at the start and end.
