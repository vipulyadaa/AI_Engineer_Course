# Adaptive Retrieval

> **Phase 09 · ADVANCED RAG · Topic 17**

## 1. Definition

Deciding *per query* whether to retrieve at all, and how much effort to spend. Simple questions get a cheap path or no retrieval; complex ones get the full pipeline. It's a cost and latency optimization that often improves quality too.

## 2. Simple Explanation

Not every query needs retrieval.

"Hello" doesn't. "What's 15% of 200?" doesn't. "Thanks, that helps" doesn't. Retrieving for those wastes a vector search, inflates the prompt with irrelevant chunks, and can actively make the answer worse by giving the model unrelated context to work with.

Adaptive retrieval classifies first, then routes.

## 3. How It Works

```
query
  │
  ▼
┌─────────────────────────────────────┐
│ Classify: does this need retrieval, │
│ and how much?                       │
└──────┬──────────────────────────────┘
       │
   ┌───┴────┬──────────┬─────────────┐
   ▼        ▼          ▼             ▼
 NONE    SIMPLE     STANDARD      COMPLEX
 chat    top-3      hybrid+       multi-query /
 math    no rerank  rerank        agentic loop
 ~0.3s   ~0.8s      ~1.5s         ~4s
```

**Classification signals, cheapest first:**

| Signal | Cost | Reliability |
|---|---|---|
| Heuristics (length, greeting patterns, question marks) | Free | Low but catches obvious cases |
| Small trained classifier | ~5ms | Good, needs labeled data |
| LLM classifier | 200–400ms | Flexible, adds latency to everything |
| **Retrieval confidence** | One search | Retrieve first, discard if scores are low |

**The confidence-based variant is elegant:** always retrieve, but check the top similarity score. If nothing scores above a threshold, the corpus doesn't cover this question — drop the context and either answer without it or abstain.

## 4. Practical Example

**The cost case:**

```
100,000 queries/day, actual distribution:

  40% conversational / no retrieval needed
  45% simple factual lookups
  12% standard
   3% genuinely complex

Uniform "full pipeline" for everything:
  100,000 × (hybrid + rerank + generation) ≈ 1.5s avg, high cost

Adaptive:
  40,000 × 0.3s  (no retrieval)
  45,000 × 0.8s  (simple)
  12,000 × 1.5s  (standard)
   3,000 × 4.0s  (complex)
  → avg ≈ 0.68s, and retrieval load cut by ~40%
```

**The quality case, which people underweight:**

```
Query: "thanks, that's helpful"

With forced retrieval: retrieves 4 chunks about whatever
  vaguely matched "helpful" — maybe customer service policy.
  The model now has irrelevant context and may respond oddly,
  referencing documentation for no reason.

Without: a normal conversational reply.
```

## 5. Why It Matters

- **It's a direct cost and latency lever** — most queries in a real system don't need the full pipeline.
- **It improves quality on non-retrieval queries**, which forced retrieval actively degrades.
- **It's the practical form of modular RAG** — routing by effort rather than by retrieval strategy.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Classifier says "no retrieval" wrongly** | Model answers from parametric knowledge — ungrounded, possibly stale |
| **Classifier latency on every query** | An LLM classifier adds 200–400ms to *everything*, including the fast path |
| **Under-classifying complex queries** | A multi-part question on the simple path retrieves half the answer |
| **Threshold tuning on confidence** | Similarity scores aren't calibrated; the right cutoff is corpus-specific |
| **Unpredictable latency distribution** | p99 is driven by the complex path; makes SLAs harder |
| **Extra component to monitor** | Classifier accuracy becomes its own metric |

**The dangerous failure is the false negative:** classifying a question as not needing retrieval when it does. The model then answers from training data, confidently and without citation, and the user has no way to tell. I'd bias the classifier toward retrieving — a false positive costs a wasted search, a false negative costs a wrong ungrounded answer.

## 7. Interview Answer

> "Adaptive retrieval decides per query whether to retrieve at all and how much effort to spend. Simple questions take a cheap path, complex ones take the full pipeline.
>
> The motivation is that a lot of queries in a real system don't need retrieval. Greetings, acknowledgements, arithmetic, general knowledge. Retrieving for those wastes a search and — more importantly — can make the answer worse, because you've given the model four irrelevant chunks and it may start referencing documentation for no reason.
>
> On cost, in a typical distribution maybe forty percent of queries need no retrieval and forty-five percent are simple lookups. Routing those appropriately can cut average latency by half and retrieval load by forty percent.
>
> For classification I'd start with an LLM classifier to bootstrap labels, then distill a small model for production — because an LLM classifier adds two to four hundred milliseconds to every request including the ones on the fast path, which partly defeats the purpose.
>
> There's also a confidence-based variant I like: always retrieve, but check the top similarity score. If nothing scores above threshold, the corpus doesn't cover this question, so drop the context and either answer conversationally or abstain. That avoids needing a separate classifier at all.
>
> The failure I'd guard against is the false negative — classifying something as not needing retrieval when it does, so the model answers from training data, confidently and without citation, and the user can't tell. I'd bias toward retrieving: a false positive costs a wasted search, a false negative costs a wrong ungrounded answer."

## 8. Likely Follow-ups

**Q: How do you classify whether a query needs retrieval?**
Options in increasing cost: heuristics for obvious cases like greetings, a small trained classifier once you have labeled examples, or an LLM classifier which is flexible but adds latency to every request. The confidence-based approach sidesteps classification entirely — retrieve, and discard the context if nothing scores well. I'd bootstrap labels with an LLM and distill to a small classifier for production.

**Q: What's the risk of skipping retrieval?**
The model answers from parametric knowledge, which may be outdated, generic, or wrong for your organization — and it does so without a citation, so the user can't distinguish it from a grounded answer. That's why I'd bias toward retrieving when uncertain; the asymmetry of costs is clear.

**Q: How does confidence-based adaptation work?**
Retrieve normally, then check the top similarity score against a threshold. Below it, the corpus likely doesn't cover the question, so drop the retrieved context and either answer conversationally or abstain. The difficulty is that similarity scores aren't calibrated — the right threshold is corpus-specific and has to be tuned on an eval set containing known out-of-scope questions.

**Q: How does this affect your latency SLA?**
It makes the distribution multi-modal, which complicates p99 reasoning — your tail is driven entirely by the complex path. I'd track latency per path rather than only in aggregate, and set the SLA per query class. It also means a shift in the query mix changes your aggregate latency without anything in the system changing, which is worth monitoring.

**Q: How is this different from modular RAG?**
Adaptive retrieval is a specific case of modular routing, where the routing dimension is *how much effort* rather than *which retrieval strategy*. Modular RAG might route a structured question to SQL and an unstructured one to vector search; adaptive retrieval routes a simple question to a cheap path and a complex one to an expensive path. In practice a production system does both in the same router.

## 9. Common Mistakes

- Using an LLM classifier and adding its latency to every query including fast-path ones.
- Biasing the classifier toward skipping retrieval, producing ungrounded answers.
- Not tuning the confidence threshold on out-of-scope examples.
- Tracking only aggregate latency, hiding the per-path distribution.
- Not measuring classifier accuracy as its own metric.

## 10. What to Remember

- **Decide per query whether and how much to retrieve.**
- **Many queries need no retrieval** — and forcing it degrades those answers.
- **Bias toward retrieving.** A false positive costs a search; a false negative costs a wrong ungrounded answer.
- **Confidence-based adaptation** avoids a separate classifier: retrieve, then discard if scores are low.
- **Distill the classifier to a small model** — an LLM classifier taxes every request.
