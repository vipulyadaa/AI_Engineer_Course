# Precision@k

> **Phase 12 · RAG EVALUATION · Topic 02**

## 1. Definition

The fraction of retrieved chunks that are actually relevant, among the top-k. Where recall@k asks "did we get the answer?", precision@k asks "how much noise came with it?"

## 2. Simple Explanation

You retrieved 5 chunks. How many were useful?

If 2 of 5 are relevant, precision@5 is 0.4 — 60% of your context tokens are noise that costs money and distracts the model. Precision is what determines whether the recall you achieved is actually usable.

## 3. How It Works

```
precision@k = (relevant chunks in top-k) / k
```

Averaged across all eval questions.

**The relationship with recall, and why both are needed:**

```
 k     recall@k   precision@k   context tokens
 3       0.79        0.61            1,800
 5       0.88        0.44            3,000
10       0.94        0.26            6,000
20       0.96        0.14           12,000

Recall rises, precision falls — mechanically, since k is the
denominator and the number of genuinely relevant chunks is fixed.
```

**That trade-off is exactly what reranking breaks:**

```
retrieve k=20  → recall 0.96, precision 0.14
rerank → top 4 → recall ~0.94, precision ~0.60

You keep almost all the recall and quadruple the precision.
```

## 4. Practical Example

**Why precision matters beyond cost:**

```
Query: "What's the international wire fee for Premier?"

precision@5 = 0.2 — one relevant chunk, four irrelevant:
  [1] "Premier international transfers: $25."        ← relevant
  [2] "Premier domestic wires: $0."
  [3] "Business Flex international transfers: $35."
  [4] "Retail international transfers: $45."
  [5] "Premier minimum balance: $10,000."

Four dollar amounts, all real, all for different things.
The model must select $25 from five candidates, three of which
are also "international transfer fees."

With precision@1 = 1.0 — just chunk [1] — there's nothing to
get wrong.
```

**Labeling for precision is more expensive than for recall:**

```
Recall:    you need to know which chunks ARE correct.
           Label once per question.

Precision: you need to judge EVERY retrieved chunk as
           relevant or not — and the retrieved set changes
           whenever the system changes.
```

That's why precision@k is often approximated with an LLM judge, or replaced by end-to-end groundedness as a proxy.

## 5. Why It Matters

- **It determines whether achieved recall is usable** — recall@50 of 0.99 is worthless if 49 chunks are noise.
- **It's the metric reranking directly improves**, so it's how you justify that component.
- **It's a direct cost measure** — low precision means paying for tokens that contribute nothing.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Mechanically falls as k rises** | The denominator grows; relevant chunks don't |
| **Expensive to label** | Every retrieved chunk needs a judgment, and the set changes per configuration |
| **Binary relevance is crude** | "Partially relevant" and "provides context" don't fit a yes/no label |
| **Judge disagreement** | Human and LLM annotators disagree on borderline relevance |
| **Optimizing it alone** | Maximized by returning one chunk — which tanks recall |
| **Near-duplicates counted as relevant** | Three copies of the same fact score high precision and add no information |

**The near-duplicate issue is worth a note:** if overlapping chunks all contain the correct fact, precision@5 looks excellent while four of the five slots carry redundant content. Deduplicating before measuring gives a more honest number.

**Practical substitute:** many teams measure recall@k precisely and use **groundedness** as the precision proxy, since low precision manifests as degraded answer quality. That avoids per-chunk labeling while still catching the harm.

## 7. Interview Answer

> "Precision@k is the fraction of retrieved chunks that are actually relevant. Where recall asks whether we got the answer, precision asks how much noise came with it.
>
> It matters for two reasons. Cost — low precision means paying input tokens on every query for text that contributes nothing. And quality — irrelevant chunks actively degrade answers. If someone asks the Premier international wire fee and I return five chunks containing four different dollar amounts for four different things, the model has to correctly select one from five plausible candidates. With just the correct chunk, there's nothing to get wrong.
>
> Precision and recall trade off mechanically as k rises, because k is the denominator and the number of genuinely relevant chunks is fixed. That's exactly what reranking breaks: retrieve twenty for recall of 0.96 at precision 0.14, rerank down to four, and you keep almost all the recall while quadrupling precision.
>
> The practical difficulty is that precision is much more expensive to label than recall. For recall I label the correct chunks once per question. For precision I have to judge every retrieved chunk, and the retrieved set changes whenever I change the system. So many teams measure recall precisely and use groundedness as a precision proxy, since low precision shows up as degraded answer quality anyway.
>
> One measurement caveat: if overlapping chunks all contain the correct fact, precision looks excellent while four of five slots are redundant. I'd deduplicate before measuring."

## 8. Likely Follow-ups

**Q: Precision or recall — which matters more in RAG?**
Recall is the hard ceiling; you can't answer from a chunk you didn't retrieve. But precision determines whether you can use that recall — fifty retrieved chunks won't fit in context. The resolution is doing both at different stages: retrieve wide for recall, rerank narrow for precision. That's why the two-stage architecture exists.

**Q: Why does precision fall as k increases?**
Mechanically — k is the denominator and the number of genuinely relevant chunks in the corpus for a given question is fixed. Once you've retrieved all the relevant ones, every additional slot is necessarily irrelevant. So precision@k declining with k isn't a system problem, it's arithmetic.

**Q: How do you label for precision?**
Judge each retrieved chunk as relevant or not. It's expensive because the retrieved set changes with every configuration change, unlike recall's ground truth which is stable. An LLM judge is the practical approach, calibrated against human labels on a sample. Or skip it and use groundedness as the proxy.

**Q: What's the risk of optimizing precision alone?**
It's maximized by returning exactly one chunk — perfect precision, terrible recall. Any metric optimized in isolation degenerates. I'd optimize the pair, or optimize end-to-end answer quality which implicitly balances both.

**Q: How do near-duplicates affect it?**
They inflate it misleadingly. If three overlapping chunks all contain the correct fact, precision@5 looks strong while three of five slots carry the same information. Deduplicating before measuring — and before prompting — gives both an honest number and a better system.

## 9. Common Mistakes

- Optimizing precision alone, which degenerates to returning one chunk.
- Not deduplicating before measuring, inflating the number.
- Treating relevance as strictly binary when partial relevance is common.
- Skipping precision entirely and assuming high recall is sufficient.
- Using an LLM judge without calibrating it against human labels.

## 10. What to Remember

- **Fraction of retrieved chunks that are relevant.** Determines whether recall is usable.
- **Falls mechanically as k rises** — that's arithmetic, not a defect.
- **Reranking breaks the trade-off:** retrieve wide, rerank narrow.
- **Expensive to label** — groundedness is a practical proxy.
- **Deduplicate before measuring**, or near-duplicates inflate it.
