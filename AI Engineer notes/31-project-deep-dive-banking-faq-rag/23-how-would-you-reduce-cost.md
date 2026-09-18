# "How Would You Reduce Cost?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 23**

## 1. Definition

A design question about where the money actually goes and which levers move it. The answer starts with a cost breakdown, because the intuitive answer — embeddings — is usually wrong.

*Deeper treatment in [25-llm-cost-optimization](../25-llm-cost-optimization/README.md).*

## 2. Simple Explanation

Almost all the cost is LLM inference, and most of that is input tokens, because retrieved context is far larger than the answer.

Embeddings and vector storage are rounding errors by comparison, and they're where people instinctively start.

## 3. How It Works

```
A TYPICAL MONTHLY SHAPE (100k queries)

LLM input tokens      ~65%   retrieved context dominates
LLM output tokens     ~20%
Vector search          ~8%
Query embedding        ~2%
Document store         ~3%
Ingestion embeddings   <1%   one-time, not recurring

TWO CONSEQUENCES
  · input tokens are the target
  · ingestion cost is irrelevant, which is liberating —
    better chunking and enrichment cost essentially
    nothing to adopt
```

## 4. Practical Example

**The levers, by size:**

```
1. ROUTING BY COMPLEXITY          largest, ~60-70%
   Most FAQ queries are simple lookups. Sending them all
   to the most capable model is paying premium rates for
   a task a cheap model handles.

   Route: simple factual lookup → small model
          multi-document or ambiguous → capable model
          low retrieval confidence → capable model

   The classifier itself must be cheap — a small model or
   a heuristic — or it eats the saving.

2. SEMANTIC CACHING               large for FAQ traffic
   A cache hit costs an embedding call instead of a full
   generation. Head-heavy traffic makes hit rates good.
   Cache key must include permission scope.

3. CONTEXT CACHING                for repeated prefixes
   A long system instruction sent on every request is
   paid for every time. Caching it cuts the repeated
   portion substantially.

4. REDUCE k                       direct and linear
   k=10 → k=5 with a reranker halves the retrieved
   context while usually improving quality. Cost and
   quality moving together is rare — take it.

5. CAP OUTPUT LENGTH
   Output tokens cost several times input per token.
   Concise FAQ answers are cheaper and better.

6. BATCH NON-INTERACTIVE WORK
   Evaluation runs and bulk re-embedding at batch rates.
```

**The reranker's cost paradox:**

```
A reranker is an extra model call — it LOOKS like added
cost.

But it lets you retrieve 50 and pass 5 instead of passing
20 unranked. Net input tokens fall by 75%, quality rises,
and the reranker is far cheaper per call than the
generation model.

Adding a component to save money is counterintuitive,
which is exactly why it's worth stating.
```

**What not to cut:**

```
EVALUATION    it's a small fraction of spend and it's
              what stops a quality regression shipping
VERIFICATION  on high-risk categories — the cost of one
              wrong fee answer exceeds the annual
              verification bill
LOGGING       the audit trail is a requirement, not an
              optimization target

Naming what you WOULDN'T cut is what makes the rest
credible.
```

## 5. Why It Matters

- **Input tokens are ~65%** of spend — that's the target.
- **Routing is the largest lever** by a wide margin.
- **A reranker reduces cost** despite being an extra call.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Optimizing embedding cost | Attacking under 3% of spend |
| Routing everything to the cheap model | Quality collapse on hard queries |
| Caching without permission scope | Cross-user leak |
| Cutting evaluation | Regressions ship undetected |
| An expensive routing classifier | Eats its own saving |

**On routing's real risk:** the failure is a hard query classified as easy, answered badly by the cheap model, and shipped. The mitigation is routing conservatively — when the classifier is uncertain, escalate to the capable model — plus monitoring quality separately per route. A quality regression concentrated in the cheap route is invisible in aggregate metrics.

**On the cost of being wrong:** in banking, the cheapest system is not the goal. One wrong fee answer that reaches a customer can cost more in remediation and review than months of inference. That framing is worth stating, because it makes cost reduction a bounded optimization rather than an open one.

## 7. Interview Answer

> "I'd start from the breakdown, because the intuitive answer is usually wrong. For a RAG system at reasonable volume, LLM input tokens are around sixty-five percent of spend, output tokens another twenty. Vector search, query embedding, and the document store together are maybe ten. Ingestion embeddings are under one percent and they're one-time.
>
> Two things follow from that. Input tokens are the target — and ingestion cost is basically irrelevant, which is liberating, because it means better chunking and richer enrichment cost essentially nothing to adopt.
>
> The largest lever is routing by complexity. Most FAQ queries are simple lookups, and sending all of them to the most capable model is paying premium rates for a task a small model handles fine. Simple factual lookups to a small model, multi-document or ambiguous questions to the capable one, and low retrieval confidence also to the capable one. That's typically a sixty to seventy percent reduction, which is larger than everything else combined.
>
> The risk with routing is a hard query classified as easy and answered badly. So I'd route conservatively — when the classifier is uncertain, escalate — and monitor quality separately per route, because a regression concentrated in the cheap route is invisible in aggregate metrics. And the classifier has to be cheap, a small model or a heuristic, or it eats its own saving.
>
> Second, semantic caching. A hit costs one embedding call instead of a full generation, and FAQ traffic is head-heavy so hit rates are good. The key has to include the permission scope, or a cost optimization becomes a cross-user data leak.
>
> Third, context caching for the repeated prefix — a long system instruction sent on every request is paid for on every request, and caching it cuts that.
>
> Fourth, and this is the counterintuitive one: adding a reranker reduces cost. It looks like an extra model call, but it lets you retrieve fifty candidates and pass five into the prompt instead of passing twenty unranked. Net input tokens drop by around seventy-five percent, quality goes up, and the reranker is far cheaper per call than the generation model. Cost and quality moving together is rare enough that it's worth taking.
>
> Then capping output length — output tokens cost several times input per token, and concise FAQ answers are both cheaper and better — and moving evaluation runs and bulk re-embedding to batch rates.
>
> What I wouldn't cut: evaluation, because it's a small fraction of spend and it's what stops a quality regression shipping. Verification on high-risk categories, because the cost of one wrong fee answer reaching a customer exceeds the annual verification bill. And logging, because the audit trail is a requirement rather than an optimization target.
>
> That last framing matters — in banking the cheapest system isn't the goal. Cost reduction here is bounded by what the errors cost, and the errors are expensive."

## 8. Likely Follow-ups

**Q: Where does the money actually go?**
LLM input tokens, around 65%, because retrieved context is much larger than the answer. Output is another 20%. Embeddings and vector storage together are under 10%, and ingestion embeddings are under 1% and one-time.

**Q: What's the biggest lever?**
Routing by complexity — typically 60–70%, larger than everything else combined. Most FAQ queries are simple lookups that don't need the most capable model.

**Q: How does adding a reranker save money?**
It lets you retrieve wide and pass narrow — 50 candidates in, 5 chunks into the prompt instead of 20 unranked. Input tokens fall about 75%, the reranker is much cheaper per call than generation, and quality improves at the same time.

**Q: What's the risk with routing?**
A hard query classified as easy and answered badly by the cheap model. Route conservatively on uncertainty, and monitor quality per route — a regression confined to the cheap route doesn't show in aggregate numbers.

**Q: What wouldn't you cut?**
Evaluation, verification on high-risk categories, and logging. They're a small fraction of spend, and in banking one wrong fee answer reaching a customer costs more in remediation than they do in a year.

## 9. Common Mistakes

- Optimizing embedding and storage cost.
- Routing everything to the cheapest model.
- Caching without permission scoping.
- Treating a reranker as added cost.
- Cutting evaluation to save money.

## 10. What to Remember

- **Input tokens are ~65%** — that's where the money is.
- **Routing is the largest lever**, by a wide margin.
- **A reranker cuts cost and raises quality** simultaneously.
- **Monitor quality per route**, or cheap-route regressions hide.
- **Say what you wouldn't cut** — it makes the rest credible.
