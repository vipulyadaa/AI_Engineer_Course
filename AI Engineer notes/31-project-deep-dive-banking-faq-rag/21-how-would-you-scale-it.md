# "How Would You Scale It?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 21**

## 1. Definition

A design question about growth along three independent axes: more queries, more documents, and more users. They break different components and have different fixes.

## 2. Simple Explanation

"Scale" is ambiguous until you ask which dimension. Ten times the traffic is an entirely different problem from ten times the corpus.

The strong answer separates them, then says what breaks first in each.

## 3. How It Works

```
THREE AXES, DIFFERENT BOTTLENECKS

MORE QUERIES (10× QPS)
  breaks first: LLM quota, then embedding API quota
  fixes: caching, routing, batching, quota increases

MORE DOCUMENTS (10× corpus)
  breaks first: retrieval precision, not infrastructure
  fixes: filtering, reranking, possibly routing by domain

MORE USERS (10× tenants)
  breaks first: isolation and per-tenant filtering
  fixes: see multi-tenancy — a different problem entirely
```

**The non-obvious one is documents.** People expect an infrastructure problem and get a quality problem.

## 4. Practical Example

**Scaling queries — what to do in order:**

```
1. SEMANTIC CACHE
   FAQ traffic is extremely head-heavy — a small number of
   questions are a large share of volume, and they're
   asked in different words. An exact-match cache misses
   them; an embedding-similarity cache hits.

   This is the largest single lever for an FAQ workload,
   because the traffic shape is unusually favourable.

   The banking caveat: cache the retrieval and generation
   for a question, but the cache key must include the
   permission scope. Otherwise one user's cached answer
   is served to another with different entitlements.

2. ROUTE BY COMPLEXITY
   Simple lookups to a cheap model, complex multi-document
   reasoning to a capable one.

3. BATCH NON-INTERACTIVE WORK
   Re-embedding, evaluation runs, bulk re-indexing.

4. RAISE QUOTAS, and know your actual limits before you
   need them
```

**Scaling the corpus — why precision degrades:**

```
10,000 chunks → 1,000,000 chunks

ANN search handles that fine; latency barely moves.

What changes is that the number of chunks that are
PLAUSIBLY similar to any query grows with the corpus.

At 10k chunks the top-5 are the only things close.
At 1M chunks there are hundreds of near-misses, and the
correct chunk now has to beat all of them.

Recall@5 falls without any component failing.

THE FIXES:
  · metadata filtering — narrow the search space before
    it's searched (product line, document type, date)
  · reranking — now genuinely necessary rather than an
    enhancement
  · hierarchical routing — classify the query to a
    domain, search that partition
```

**The capacity numbers worth knowing:**

```
At 10× traffic, the questions to answer:
  · LLM tokens per minute quota — usually the first wall
  · embedding API QPS for query embedding
  · vector search QPS and whether the index is replicated
  · concurrent connections to the document store

Naming the LLM quota as the first limit is the answer
that shows production experience. It's almost always
what breaks first, and it's a request-and-wait fix, not
an engineering one — which is why it has to be anticipated.
```

## 5. Why It Matters

- **Three axes, three different failures** — ask which one first.
- **Corpus growth degrades precision**, not infrastructure.
- **LLM quota is usually the first wall** and needs lead time.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Treating scale as one problem | Optimizes the wrong axis |
| Assuming corpus growth is an infra problem | Misses the precision collapse |
| Caching without a permission-scoped key | Cross-user data leak |
| Discovering quota limits under load | An outage with a support-ticket fix |
| Sharding before filtering | Complexity where a WHERE clause would do |

**On what doesn't need to scale:** ingestion is batch work and it scales by running longer or wider — it's rarely the interesting constraint. Spending design effort there instead of on query-path caching and retrieval precision is a common misallocation.

**On cost as the real scaling limit:** at 10× traffic the technical problems are mostly solvable; the cost is often the actual constraint. Which is why caching and routing come first — they're the levers that make the scaled system affordable rather than merely possible. See [23](23-how-would-you-reduce-cost.md).

## 7. Interview Answer

> "First I'd ask which axis, because scale means three different things here and they break different components.
>
> More queries. The first wall is almost always the LLM's tokens-per-minute quota — not compute, not the vector store. That matters because it's a request-and-wait fix rather than an engineering one, so it has to be anticipated rather than discovered under load.
>
> Before raising quotas, the biggest lever for this workload specifically is a semantic cache. FAQ traffic is extremely head-heavy — a small number of questions make up a large share of volume, and people ask them in different words. An exact-match cache misses all of that; an embedding-similarity cache hits. For an FAQ system the traffic shape is unusually favourable to caching, which is why it's the first thing I'd do.
>
> One caveat that's specific to banking: the cache key has to include the permission scope. Caching on the question alone means a user's answer gets served to another user with different entitlements, which turns a performance optimization into a data leak.
>
> After that, routing by complexity — simple lookups to a cheaper model, multi-document reasoning to a capable one — and batching the non-interactive work like re-embedding and evaluation runs.
>
> More documents is the more interesting axis, because people expect an infrastructure problem and it's actually a quality problem. Going from ten thousand chunks to a million, ANN search handles fine — latency barely moves. What changes is that the number of chunks plausibly similar to any query grows with the corpus. At ten thousand chunks the top five are the only things close; at a million there are hundreds of near-misses, and the correct chunk has to beat all of them. Recall falls without any component failing or erroring.
>
> The fixes are all about narrowing before searching. Metadata filtering on product line, document type, and effective date so the search space is smaller before it's searched. Reranking, which at that scale stops being an enhancement and becomes necessary. And if the corpus spans genuinely separate domains, hierarchical routing — classify the query to a domain and search that partition.
>
> I'd specifically not shard before filtering. A metadata filter that cuts the search space by ninety percent is a configuration change; sharding is a distributed systems problem. The order matters.
>
> More users is the third axis and it's really a different question — isolation, per-tenant filtering, and noisy-neighbour control rather than throughput.
>
> And the honest framing: at ten times traffic the technical problems are mostly solvable. Cost is usually the real constraint, which is why caching and routing come first — they're what makes the scaled system affordable rather than just possible."

## 8. Likely Follow-ups

**Q: What breaks first at 10× traffic?**
The LLM's tokens-per-minute quota, typically before compute or the vector store. It's a request-and-wait fix, so it has to be anticipated — discovering it under load means an outage resolved by a support ticket.

**Q: Why does a bigger corpus hurt quality?**
Because the number of plausibly-similar chunks grows with it. The correct chunk has to out-rank hundreds of near-misses instead of a handful, so recall falls without any component failing or reporting an error.

**Q: Would you shard the index?**
Only after metadata filtering. A filter that cuts the search space by 90% is a configuration change; sharding is a distributed systems problem with rebalancing and cross-shard ranking. Ordering those wrong buys complexity that a WHERE clause would have avoided.

**Q: What's the risk in caching?**
Serving a cached answer across permission boundaries. The cache key must include the permission scope, or a performance optimization becomes a cross-user data leak — and it's silent, because the answer looks perfectly normal.

**Q: What doesn't need to scale?**
Ingestion. It's batch work that scales by running longer or wider, and it's rarely the constraint. Design effort spent there instead of on query-path caching and retrieval precision is misallocated.

## 9. Common Mistakes

- Treating "scale" as a single dimension.
- Assuming corpus growth is an infrastructure problem.
- Caching without a permission-scoped key.
- Not knowing the quota limits in advance.
- Sharding before exhausting metadata filtering.

## 10. What to Remember

- **Ask which axis** — queries, documents, or users.
- **LLM quota is the first wall** for traffic.
- **Corpus growth degrades precision**, not latency.
- **Filter before sharding** — filtering is config, sharding is distributed systems.
- **Cache keys must include the permission scope.**
