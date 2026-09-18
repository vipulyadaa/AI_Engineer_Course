# Caching (Cost)

> **Phase 25 · LLM COST OPTIMIZATION · Topic 05**

## 1. Definition

Avoiding repeated model calls or repeated processing of identical input. Three distinct mechanisms — response caching, context caching, and embedding caching — each addressing a different repetition.

## 2. Simple Explanation

Three different things get repeated, and each has its own cache.

The same question asked twice. The same system prompt sent on every request. The same document embedded on every re-ingestion. Different problems, different solutions, and conflating them is why cache discussions go in circles.

## 3. How It Works

```
RESPONSE CACHE    identical question → return the stored answer
                  → removes the entire request
                  → the largest saving, the highest risk

CONTEXT CACHE     the fixed prefix (system prompt, examples)
                  → provider-side; cuts the rate on that
                    portion
                  → safe, mechanical, underused

EMBEDDING CACHE   content hash → stored vector
                  → removes re-embedding on re-ingestion
                  → ingestion-side, not per request
```

**Context caching is the one to implement first** because it's safe, mechanical, and requires no correctness reasoning — unlike response caching, where a wrong hit is a wrong answer.

## 4. Practical Example

**Context caching, which is free money:**

```
The system instruction and any few-shot examples are
byte-identical on every request — and in an agent, on every
step of every run.

A 2,000-token prefix across 10M requests/day is 20 billion
tokens of identical input. Caching it cuts the rate on that
portion substantially.

No correctness risk, no invalidation logic, no key design.
It's the clearest saving available and it's routinely
not done.
```

**Response caching, where the risk lives:**

```
cache_key = normalize(query)                    ← WRONG

Customer A asks "what's my transfer fee?" → cached
Customer B asks the same → receives A's answer, computed
from A's account data.

cache_key = hash(normalized_query, user_id,
                 permission_set, corpus_version)  ← RIGHT

And for account-specific questions, don't cache at all.
General policy questions cache safely; anything personalized
doesn't.
```

**Invalidation, which is the part that's hard:**

```
A cached answer about a fee stays cached after the fee
changes.

  TTL             simple; bounds staleness by time
  DOCUMENT-KEYED  invalidate answers whose source chunks
                  changed — better, and requires recording
                  which chunks produced each answer

The second is better and it's nearly free, because you
should be recording contributing chunks for audit anyway.
```

**Embedding caching at ingestion:** keyed on a hash of the *embedded text* including breadcrumbs, so re-ingestion after a chunking tweak only re-embeds what changed. Without it, every re-index pays the full embedding cost again — which is the largest one-time expense in the pipeline.

## 5. Why It Matters

- **Three distinct caches** for three distinct repetitions — conflating them confuses the discussion.
- **Context caching is safe and routinely skipped** — the clearest available saving.
- **Response cache keys must include identity** or it becomes a disclosure mechanism.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Response cache key without identity** | Cross-customer disclosure |
| **Caching account-specific answers** | Personalized data served to others |
| **No invalidation on corpus change** | Stale fee answers persist |
| **Context caching not implemented** | Re-paying for identical prefix tokens |
| **Embedding cache keyed on raw text** | Enrichment changes go undetected |
| **TTL too long** | Staleness bounded badly |

**On document-keyed invalidation:** recording which chunk IDs contributed to each cached answer means a corpus update can invalidate exactly the affected answers rather than flushing everything or waiting out a TTL. It requires the contributing chunks to be stored with the cache entry — which is the same record needed for audit, so the marginal cost is near zero.

**On what caching can't fix:** a cache improves cost and latency for repeated questions. It does nothing for the first occurrence of each distinct question, and in a long-tail workload the hit rate may be low. Measuring the actual hit rate before building elaborate caching is worth doing — an FAQ workload caches well, an open-ended research workload doesn't.

## 7. Interview Answer

> "Three different things get repeated and each has its own cache, and conflating them is why cache discussions go in circles.
>
> Response caching — the same question asked twice, returning the stored answer. That removes the entire request, so it's the largest saving and the highest risk. Context caching — the fixed prefix, system instruction and few-shot examples, cached provider-side. Embedding caching — content hash to stored vector, which is ingestion-side rather than per request.
>
> I'd implement context caching first because it's safe and mechanical. The system instruction and examples are byte-identical on every request, and in an agent on every step of every run. A two-thousand-token prefix across ten million requests a day is twenty billion tokens of identical input. Caching it cuts the rate on that portion with no correctness risk, no invalidation logic, and no key design — it's the clearest saving available and it's routinely not done.
>
> Response caching is where the risk lives. If the key is just the normalized query, customer A asks about their transfer fee, the answer is cached, and customer B asking the same question receives an answer computed from A's account data. So the key needs the normalized query, the user ID, the permission set, and the corpus version. And for account-specific questions I wouldn't cache at all — general policy questions cache safely, anything personalized doesn't.
>
> Invalidation is the genuinely hard part. A cached fee answer stays cached after the fee changes. A TTL is simple and bounds staleness by time. Better is document-keyed invalidation — invalidating answers whose source chunks changed. That requires recording which chunks contributed to each cached answer, which is the same record needed for audit, so the marginal cost is near zero and it's much more precise than flushing or waiting.
>
> Embedding caching at ingestion should be keyed on a hash of the embedded text including breadcrumbs, not the raw chunk body — otherwise a change to the enrichment format goes undetected and vectors silently diverge from what they should represent. With it, re-ingestion after a chunking tweak only re-embeds what changed, instead of paying the full embedding cost again.
>
> One thing I'd check before building elaborate caching: the actual hit rate. A cache does nothing for the first occurrence of each distinct question, so an FAQ workload caches well and an open-ended research workload doesn't. Measuring that first tells you whether the investment is worth making."

## 8. Likely Follow-ups

**Q: What are the three caches?**
Response caching for repeated questions, context caching for the fixed prefix, and embedding caching at ingestion. Different repetitions, different mechanisms, different risks — and conflating them is why the topic gets muddled.

**Q: Which would you implement first?**
Context caching. It's safe and mechanical — the prefix is byte-identical every request, there's no correctness risk, no invalidation logic, and no key design. It's the clearest available saving and it's routinely skipped.

**Q: What's the risk with response caching?**
Cross-customer disclosure if the key omits identity and permissions. Customer B asking the same question as customer A receives an answer computed from A's account data. The key needs user, permissions, and corpus version — and account-specific answers shouldn't be cached at all.

**Q: How do you invalidate?**
Ideally document-keyed — invalidating answers whose source chunks changed, which requires recording contributing chunks with each cache entry. That's the same record needed for audit, so it's nearly free and far more precise than a TTL or a full flush.

**Q: When isn't caching worth it?**
When the hit rate is low. A cache does nothing for the first occurrence of each distinct question, so an FAQ workload caches well and a long-tail or research workload doesn't. Measuring the actual hit rate before building elaborate caching is worth the hour.

## 9. Common Mistakes

- Response cache keys without identity and permissions.
- Caching account-specific answers.
- No invalidation tied to corpus updates.
- Not implementing context caching at all.
- Embedding cache keyed on raw text rather than embedded text.

## 10. What to Remember

- **Three caches:** response, context, embedding — different problems.
- **Context caching first** — safe, mechanical, and routinely skipped.
- **Response keys need user, permissions, and corpus version.**
- **Document-keyed invalidation** is nearly free if you record contributing chunks.
- **Measure the hit rate first** — long-tail workloads cache poorly.
