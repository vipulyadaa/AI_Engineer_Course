# Multi-Query Retrieval

> **Phase 09 · ADVANCED RAG · Topic 07**

## 1. Definition

Generating several distinct queries from one user question, retrieving for each independently, and fusing the results. It addresses questions that contain multiple parts or that could be phrased in genuinely different ways.

## 2. Simple Explanation

One embedding can only point in one direction. A question with two topics produces a vector that sits between them and matches neither well.

"Compare our overdraft policy to our credit line policy" embeds to something between overdraft and credit lines — closer to generic "account policy" than to either. Splitting it into two queries and retrieving for each gets both.

## 3. How It Works

```
                    ┌─▶ "overdraft policy terms"     → top-10 ─┐
"compare overdraft  │                                          │
 to credit line" ───┼─▶ "credit line policy terms"   → top-10 ─┼─▶ RRF → top-k
                    │                                          │
                    └─▶ "overdraft vs credit line"   → top-10 ─┘
```

1. **Generate N queries** with an LLM — either decomposing a multi-part question, or producing alternative phrasings of a single one.
2. **Retrieve for each** independently, in parallel.
3. **Fuse** with RRF — documents surfacing for multiple sub-queries rank highest.
4. **Rerank and truncate** to the final k.

**Two distinct modes, often conflated:**

| Mode | For | Example |
|---|---|---|
| **Decomposition** | Multi-part questions | "Compare A to B" → "A terms", "B terms" |
| **Paraphrase** | Single questions with vocabulary uncertainty | "overdraft fee" → "NSF charge", "insufficient funds cost" |

Decomposition changes *what* you search for. Paraphrase changes *how* you phrase the same search.

## 4. Practical Example

**Why one query fails a comparison question:**

```
Query: "How does our overdraft fee compare to our credit line interest?"

Single retrieval, top-5:
  1. Generic "Account Fees Overview"     (matches both weakly)
  2. "Fee Schedule Introduction"         (matches both weakly)
  3. "Overdraft Protection Enrollment"   (partial)
  4. "Account Types Comparison"          (generic)
  5. "Credit Products Overview"          (partial)
  → Neither the overdraft fee table nor the credit line rate table.

Decomposed:
  Q1 "overdraft fee amount"     → the overdraft fee table  ✅
  Q2 "credit line interest rate"→ the credit rate table    ✅
  → Both facts present; the model can actually compare.
```

**The cost is linear in N:**

```
N=3 queries → 3× retrieval cost, plus one LLM call to generate them
            → parallel, so latency ≈ 1 retrieval + 1 LLM call (~300ms)
            → but 3× the vector search load
```

Retrieval is usually cheap relative to generation, so this is more affordable than it sounds — but it multiplies index load, which matters at scale.

## 5. Why It Matters

- **It's the fix for multi-part questions**, which single-vector retrieval structurally cannot handle.
- **RRF naturally boosts consensus** — a document relevant to several sub-queries rises, which is usually the right signal.
- **Knowing decomposition from paraphrase** is what separates a real answer from a memorized one.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **N× retrieval cost** | Linear in the number of queries; matters at high volume |
| **Latency from generation** | One LLM call before any retrieval can start |
| **Bad decomposition** | Generated sub-queries miss the real intent; failures are silent |
| **Redundant sub-queries** | Three near-identical paraphrases add cost and no coverage |
| **Context dilution** | Retrieving for N queries and keeping top-k from each floods the prompt |
| **Unnecessary on simple queries** | Most questions are single-topic and don't need this |

**The routing point:** most queries in a typical system are simple and single-topic. Running multi-query on all of them multiplies cost for no benefit. A cheap classifier — does this question contain a conjunction, a comparison, or multiple entities — decides when it's warranted.

## 7. Interview Answer

> "Multi-query retrieval generates several queries from one question, retrieves for each independently, and fuses the results.
>
> The problem it solves is structural. One embedding points in one direction, so a two-topic question produces a vector that sits between both topics and matches neither well. 'Compare our overdraft policy to our credit line policy' retrieves generic account-overview documents rather than either specific policy. Decomposing it into two queries gets both facts into context, and then the model can actually make the comparison.
>
> There are really two modes and they're often conflated. Decomposition splits a multi-part question into its parts — that changes what you search for. Paraphrase generates alternative phrasings of the same question — that changes how you phrase it, and it's closer to query expansion. Decomposition is the one that fixes something single retrieval can't do at all.
>
> I'd fuse with RRF, which has a nice property here: a document that's relevant to several sub-queries ranks highest, and that consensus signal is usually correct.
>
> The cost is linear in the number of queries — three sub-queries means three times the retrieval load, plus one LLM call to generate them. Retrieval is cheap relative to generation so it's affordable, but it does multiply index load at scale.
>
> So I'd route rather than apply it universally. Most questions are single-topic and don't need this. A cheap check for conjunctions, comparisons, or multiple entities decides when it's warranted."

## 8. Likely Follow-ups

**Q: How many queries should you generate?**
Three to five for decomposition, matched to the actual number of parts in the question rather than a fixed count. For paraphrase, three is usually enough — beyond that the variants become redundant and you're paying for coverage you already have. I'd generate a variable number based on the question rather than a constant.

**Q: How does this differ from query expansion?**
Expansion adds terms to one query; multi-query runs separate retrievals and fuses. Decomposition-mode multi-query is genuinely different from expansion because it searches for different things, not the same thing phrased differently. Paraphrase-mode multi-query is closer to expansion implemented as parallel retrievals rather than merged terms — and that implementation is safer, because it avoids query drift.

**Q: How do you decide when to use it?**
Route on question structure. Conjunctions, comparison words, multiple named entities, or "and"/"versus" patterns suggest decomposition would help. A small classifier or even a heuristic handles this. Applying it universally multiplies cost across the majority of queries that are simple and don't need it.

**Q: What if the decomposition is wrong?**
Retrieval fails silently, which is the main risk. I'd mitigate by always including the original query as one of the retrievals, so a bad decomposition can't lose the original intent entirely. And I'd log the generated sub-queries so failures are diagnosable — otherwise you see bad answers with no visibility into why.

**Q: How do you avoid flooding the context?**
Fuse before truncating rather than taking top-k from each sub-query. RRF produces one merged ranked list, and you take the final k from that — so three sub-queries still yield four chunks, not twelve. Then rerank the fused set. Taking top-k per sub-query independently is the mistake that floods the prompt.

## 9. Common Mistakes

- Applying it to every query instead of routing.
- Taking top-k from each sub-query instead of fusing then truncating.
- Not including the original query as one of the retrievals.
- Generating redundant paraphrases that add cost without coverage.
- Not logging sub-queries, making decomposition failures invisible.

## 10. What to Remember

- **Several queries from one question, retrieve each, fuse with RRF.**
- **Fixes multi-part questions** — one embedding can't point at two topics.
- **Two modes:** decomposition (different things) vs. paraphrase (same thing, different words).
- **Cost is linear in N.** Route on question structure rather than applying universally.
- **Fuse before truncating**, and always include the original query.
