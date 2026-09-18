# Multi-Query Retrieval (Retrieval View)

> **Phase 11 · RAG RETRIEVAL · Topic 13**

## 1. Definition

Generating several queries from one user question, retrieving for each independently, and fusing the results. It addresses questions with multiple parts, and questions where the right phrasing is uncertain.

## 2. Simple Explanation

One embedding points in one direction. A question covering two topics produces a vector sitting between them — closer to nothing in particular than to either.

"Compare our overdraft policy to our credit line policy" embeds somewhere between overdraft and credit lines, matching generic account-policy content better than either specific policy. Splitting it into two queries retrieves both.

## 3. How It Works

```
                   ┌─▶ "overdraft policy terms"   → top-10 ─┐
one question ──────┼─▶ "credit line policy terms" → top-10 ─┼─▶ RRF → rerank → top-k
                   └─▶ original question          → top-10 ─┘
```

1. **Generate N queries** with an LLM — decomposing a multi-part question, or producing alternative phrasings.
2. **Retrieve for each** in parallel.
3. **Fuse with RRF** — documents appearing across multiple sub-queries rank highest.
4. **Rerank and truncate** to the final k.

**Two modes, often conflated:**

| Mode | For | Changes |
|---|---|---|
| **Decomposition** | Multi-part questions | *What* you search for |
| **Paraphrase** | Vocabulary uncertainty | *How* you phrase the same search |

Decomposition is the one that solves something single retrieval structurally cannot.

## 4. Practical Example

**Why one query fails a comparison:**

```
"How does our overdraft fee compare to our credit line interest?"

Single retrieval, top-5:
  1. "Account Fees Overview"        (matches both weakly)
  2. "Fee Schedule Introduction"    (generic)
  3. "Overdraft Protection Enrollment"
  4. "Account Types Comparison"     (generic)
  5. "Credit Products Overview"
  → Neither the overdraft fee table nor the credit rate table.

Decomposed:
  Q1 "overdraft fee amount"          → the overdraft fee table  ✅
  Q2 "credit line interest rate"     → the credit rate table    ✅
  → both facts in context; the model can actually compare.
```

**Fuse before truncating — the mistake that floods context:**

```
❌ top-4 from EACH of 3 sub-queries → 12 chunks in the prompt

✅ RRF all three lists into one ranked list → take top-4 from that
   → 3 sub-queries still yield 4 chunks
```

**The cost:**

```
N=3 queries → 1 LLM call to generate (~300ms)
            + 3 retrievals, run in PARALLEL (latency ≈ 1 retrieval)
            + 3× the vector search load

Retrieval is cheap next to generation, so latency impact is small —
but index load multiplies, which matters at scale.
```

## 5. Why It Matters

- **It's the fix for multi-part questions**, which single-vector retrieval cannot handle.
- **RRF's consensus property helps here** — a chunk relevant to several sub-queries rises, which is usually correct.
- **Routing it rather than applying universally** is the cost-conscious answer.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **N× retrieval load** | Linear in query count; matters at volume |
| **Generation latency** | One LLM call before any retrieval starts |
| **Bad decomposition** | Sub-queries miss the real intent; fails silently |
| **Redundant paraphrases** | Three near-identical variants add cost, no coverage |
| **Context flooding** | Taking top-k per sub-query instead of fusing first |
| **Unnecessary on simple queries** | Most questions are single-topic |

**Routing is the answer to the last one.** A cheap check — does the question contain a conjunction, a comparison word, or multiple named entities — decides when decomposition is warranted. Most queries in a typical system are simple and don't need it.

**Always include the original query** as one of the retrievals, so a bad decomposition can't lose the original intent entirely.

## 7. Interview Answer

> "Multi-query retrieval generates several queries from one question, retrieves for each in parallel, and fuses the results.
>
> The problem it solves is structural: one embedding points in one direction, so a two-topic question produces a vector sitting between both and matching neither well. 'Compare our overdraft fee to our credit line interest' retrieves generic account-overview documents rather than either specific table. Decomposing into two queries gets both facts into context, and then the model can actually compare them.
>
> There are two modes people conflate. Decomposition splits a multi-part question into its parts — that changes what you search for, and it solves something single retrieval genuinely cannot. Paraphrase generates alternative phrasings of the same question, which is closer to query expansion implemented as parallel retrievals.
>
> I'd fuse with RRF, which has a useful property here: a chunk relevant to several sub-queries ranks highest, and that consensus signal is usually right.
>
> The implementation mistake I'd avoid is taking top-k from each sub-query — three sub-queries at top-4 each floods the prompt with twelve chunks. Fuse all the lists into one ranked list first, then take the final k from that.
>
> And I'd route rather than apply it universally. Most questions are single-topic, so running this on everything triples index load for no benefit. A cheap check for conjunctions, comparisons, or multiple entities decides when it's warranted. I'd also always include the original query as one of the retrievals, so a bad decomposition can't lose the intent entirely."

## 8. Likely Follow-ups

**Q: How many queries should you generate?**
Match it to the question — three to five for decomposition, driven by the actual number of parts rather than a fixed count. For paraphrase, three is usually enough before variants become redundant. Generating a variable number based on the question beats a constant.

**Q: Decomposition or paraphrase — how do you decide?**
Ask whether the question has genuinely separate parts. A comparison or a conjunction of two topics needs decomposition. A single-topic question where you're unsure of the document's vocabulary needs paraphrase. Decomposition is the more valuable mode because it addresses a structural limitation; paraphrase is a recall optimization.

**Q: How do you avoid flooding the context?**
Fuse before truncating. RRF produces one merged ranked list across all sub-queries, and you take the final k from that — so three sub-queries still yield four chunks, not twelve. Taking top-k per sub-query independently is the mistake.

**Q: What's the latency impact?**
Modest, if retrievals run in parallel — you pay one LLM call for generation, around 300ms, plus roughly one retrieval's worth of time. The bigger cost is index load, which is linear in query count and matters at high volume rather than per request.

**Q: How does this compare to agentic retrieval?**
Multi-query decomposes upfront and retrieves in parallel — predictable latency, one round. Agentic retrieves sequentially and adapts based on results, handling cases where you can't form the second query until you've seen the first answer. Multi-query is cheaper and more predictable; agentic is more capable on genuinely dependent hops.

## 9. Common Mistakes

- Applying it to every query instead of routing.
- Taking top-k per sub-query instead of fusing then truncating.
- Not including the original query among the retrievals.
- Generating redundant paraphrases that add cost without coverage.
- Not logging sub-queries, making decomposition failures invisible.

## 10. What to Remember

- **Several queries from one question, retrieved in parallel, fused with RRF.**
- **Fixes multi-part questions** — one embedding can't point at two topics.
- **Two modes:** decomposition (different things) and paraphrase (same thing, different words).
- **Fuse before truncating**, or you flood the prompt.
- **Route on question structure**, and always include the original query.
