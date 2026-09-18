# Retrieval Evaluation

> **Phase 22 · AI EVALUATION · Topic 12**

## 1. Definition

Measuring whether retrieval surfaced the information needed to answer, independently of what the generator did with it. It's the diagnostic that separates a retrieval failure from a generation failure.

## 2. Simple Explanation

If the answer is wrong, one of two things happened: the right document wasn't retrieved, or it was retrieved and the model used it badly.

Those have completely different fixes, and an end-to-end score tells you nothing about which occurred.

## 3. How It Works

```
THE METRICS

RECALL@K        was the correct chunk in the top k?
                → the one that matters most
PRECISION@K     what fraction of the top k were relevant?
MRR             how high did the first relevant chunk rank?
NDCG            rank-weighted relevance, graded
HIT RATE        did ANY relevant chunk appear?

Recall@k is primary because a chunk not retrieved cannot
be used, no matter how good the generator is. Precision
matters less — the generator tolerates some irrelevant
context, up to a point.
```

**Measure recall at two values:** recall@20 (what retrieval surfaced) and recall@5 (what reached the generator after reranking). The gap between them is the reranker's contribution.

## 4. Practical Example

**Diagnosing with two numbers:**

```
recall@20 = 0.94    recall@5 = 0.71

Retrieval is finding the right chunk 94% of the time and
reranking is dropping it a quarter of the time. That's a
reranking problem, not a retrieval one.

recall@20 = 0.62    recall@5 = 0.60

Retrieval isn't finding it at all. Reranking is fine and
improving it would change nothing. The fix is upstream —
chunking, embeddings, hybrid search, query rewriting.

Two numbers, and they point at completely different work.
```

**That diagnostic is the practical value of the metric**, more than the number itself.

**Where recall@k needs care:**

```
· the golden set must label the CORRECT chunk IDs, which
  means labelling against the corpus as ingested — a
  labelling exercise people underestimate

· for multi-hop questions, "the correct chunk" is several
  chunks across several retrieval rounds, so recall has
  to be defined per hop rather than per question

· with parent-document retrieval, the retrieved unit
  differs from the embedded unit, so be explicit about
  which you're measuring
```

**Measuring under realistic filters:**

```
Every production query carries permission and effective-date
filters. A restrictive filter reduces the eligible
population and ANN recall degrades.

So recall measured on the open corpus describes a
configuration that never runs. The evaluation must apply
the same filters production does — and the gap between
filtered and unfiltered recall is often large enough to
change which index you'd choose.
```

**Query-type breakdown:** aggregate recall hides that simple lookups retrieve at 0.95 while multi-hop questions retrieve at 0.4. The second number is the one that tells you the system needs iterative retrieval.

## 5. Why It Matters

- **It separates retrieval failure from generation failure** — different fixes.
- **Recall@20 versus recall@5** isolates the reranker's contribution.
- **Filtered recall is the real number** — unfiltered describes a configuration that never runs.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **End-to-end score only** | Can't localize the failure |
| **Unfiltered recall** | Measures a configuration that never runs |
| **Aggregate across question types** | Multi-hop failure hidden |
| **Precision over-weighted** | The generator tolerates some noise |
| **Single recall value** | Reranker contribution invisible |
| **Labelling correct chunks** | Underestimated effort |

**On labelling effort:** identifying the correct chunk ID for each golden-set question means reading the corpus as ingested, which is genuinely laborious and is where retrieval evaluation projects stall. A practical shortcut is labelling at document level first — much faster — and refining to chunk level only for the cases where document-level recall already passes.

**On what recall doesn't tell you:** a chunk can be retrieved and still be unusable — truncated mid-rule, missing its heading context, or one of three chunks needed where only one was found. Recall@k treats retrieval as a hit or miss, so a low end-to-end score with high recall points at chunk quality rather than retrieval ranking.

## 7. Interview Answer

> "Retrieval evaluation separates a retrieval failure from a generation failure, which matters because they have completely different fixes and an end-to-end score tells you nothing about which occurred.
>
> The primary metric is recall at k — was the correct chunk in the top k. It's primary because a chunk that wasn't retrieved cannot be used regardless of how good the generator is. Precision matters less, since the generator tolerates some irrelevant context up to a point.
>
> The technique I'd emphasize is measuring recall at two values. Recall at twenty is what retrieval surfaced; recall at five is what reached the generator after reranking. If recall at twenty is 0.94 and recall at five is 0.71, retrieval is finding the chunk and reranking is dropping it a quarter of the time — that's a reranking problem. If they're both around 0.6, retrieval isn't finding it at all and improving the reranker would change nothing; the fix is chunking, embeddings, hybrid search, or query rewriting. Two numbers pointing at completely different work — that diagnostic is worth more than the number itself.
>
> Two things about measuring it correctly. Filters: every production query carries permission and effective-date filters, and a restrictive filter reduces the eligible population so ANN recall degrades. Recall measured on the open corpus describes a configuration that never runs, and the gap is often large enough to change which index you'd choose.
>
> And question-type breakdown. Aggregate recall hides that simple lookups retrieve at 0.95 while multi-hop questions retrieve at 0.4 — and that second number is what tells you the system needs iterative retrieval rather than better ranking.
>
> On the practical difficulty: labelling the correct chunk IDs means reading the corpus as ingested, which is genuinely laborious and is where retrieval evaluation projects stall. A shortcut that works is labelling at document level first, which is much faster, and refining to chunk level only for cases where document-level recall already passes.
>
> And a limitation worth stating: recall treats retrieval as hit or miss, but a chunk can be retrieved and still unusable — truncated mid-rule, missing its heading context, or one of three needed chunks where only one was found. So a low end-to-end score with high recall points at chunk quality rather than at ranking, which is a different investigation."

## 8. Likely Follow-ups

**Q: Which retrieval metric matters most?**
Recall@k. A chunk that wasn't retrieved can't be used no matter how good the generator is, so it's the ceiling on everything downstream. Precision matters less because the generator tolerates some irrelevant context.

**Q: Why measure recall at two values?**
Because recall@20 shows what retrieval surfaced and recall@5 shows what survived reranking. A large gap means the reranker is dropping correct chunks; a small gap with both low means retrieval isn't finding them. Two numbers, two completely different fixes.

**Q: Should recall be measured with filters applied?**
Yes — every production query carries permission and effective-date filters, and restrictive filters degrade ANN recall. Unfiltered recall describes a configuration that never runs, and the gap between the two can be large enough to change which index you'd choose.

**Q: What's the hard part in practice?**
Labelling the correct chunk IDs, which requires reading the corpus as ingested. It's where retrieval evaluation projects stall. Labelling at document level first is much faster, and you refine to chunk level only where document-level recall already passes.

**Q: What does recall not tell you?**
Whether the retrieved chunk was usable. It's hit-or-miss, so a chunk truncated mid-rule or missing its heading context counts as retrieved. High recall with a low end-to-end score points at chunk quality rather than ranking — a different investigation entirely.

## 9. Common Mistakes

- Measuring only end-to-end quality.
- Reporting recall without production filters applied.
- Aggregating across question types, hiding multi-hop failure.
- A single recall value, so the reranker's contribution is invisible.
- Assuming a retrieved chunk was usable.

## 10. What to Remember

- **Recall@k is primary** — it's the ceiling on everything downstream.
- **Measure at two k values** to isolate the reranker.
- **Apply production filters** — unfiltered recall isn't the real number.
- **Break down by question type** — multi-hop failure hides in the aggregate.
- **Recall is hit-or-miss** — high recall with bad answers means chunk quality.
