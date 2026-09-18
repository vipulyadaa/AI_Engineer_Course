# "How Did You Handle Duplicate Documents?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 20**
>
> ⚠️ **An answer framework.** If duplicates weren't handled, say so — and
> name what they cost. It's a very common gap.

## 1. Definition

A question about corpus hygiene. Duplicates are not merely wasteful — near-duplicates from different versions actively degrade retrieval by consuming the context budget with the same content.

## 2. Simple Explanation

The same policy often exists several times: a PDF, an intranet page, and a section in a larger handbook. They say almost the same thing, with small differences.

Retrieve the top five and you can get the same paragraph five times — a context window spent on one piece of information.

## 3. How It Works

```
THE THREE KINDS, WITH DIFFERENT FIXES

EXACT       byte-identical content
            → content hash; trivially detected

NEAR        same policy, different formatting or version
            → embedding similarity above a threshold
            → the common and damaging case

SEMANTIC    same rule stated differently in two documents
            → not detectable by similarity; needs review
            → and may be genuine contradiction, not
              duplication
```

**Where to deduplicate matters as much as how:**

```
INGESTION-TIME  don't index the duplicate at all
                → cleanest, cheapest, permanent
                → but needs a rule for WHICH to keep

QUERY-TIME      drop near-identical chunks from the
                result set before assembly
                → catches what ingestion missed
                → costs a comparison per query

Both, ideally. Ingestion for known duplication, query-time
as the safety net.
```

## 4. Practical Example

**What duplicates actually cost:**

```
Query: "international transfer fee"

top-5 without dedup:
  1. fee-schedule-v4.pdf § 3.2
  2. fee-schedule-v3.pdf § 3.2   ← superseded, near-identical
  3. handbook.pdf § 12 (same text embedded in a larger doc)
  4. intranet/fees (same text, reformatted)
  5. fee-schedule-v4.pdf § 3.3   ← the only new information

Effective k = 2.

You paid for five chunks of context and received two
pieces of information. And result 2 is last year's fee,
which is worse than useless — it's a contradiction the
model now has to resolve.
```

**The rule for which copy wins:**

```
Deduplication needs a precedence order, or it's arbitrary:

1. AUTHORITY    the designated system of record beats a
                copy on an intranet page
2. RECENCY      newer effective date beats older
3. SPECIFICITY  the dedicated fee schedule beats the same
                text quoted inside a general handbook

Without an explicit order, "keep the first one" means
whichever happened to be crawled first — which is not a
policy.
```

**Why near-duplicates are also a version problem:**

```
Two chunks that are 95% similar and differ in a FIGURE are
not duplicates. They're a version conflict.

  v3: "the fee is $40"
  v4: "the fee is $45"

Deduplicating by similarity picks one — possibly the wrong
one — and hides the fact that the corpus contained both.

So the right handling is: detect the near-duplicate, apply
effective-date filtering so only the current one is
retrievable, and flag the pair for review rather than
silently dropping one.
```

**On the simple honest version:** if the corpus was curated and duplicates weren't an issue, say so — that's a legitimate property of a small, controlled document set. The failure to avoid is claiming deduplication you didn't implement, because the follow-up asks about the threshold and the precedence rule.

## 5. Why It Matters

- **Duplicates silently shrink effective k** — five chunks, two facts.
- **Near-duplicates differing in a figure are a version conflict**, not a duplicate.
- **Deduplication needs an explicit precedence rule** or it's arbitrary.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Exact hash matching" alone | Misses the damaging near-duplicate case |
| No precedence rule | Keeps whichever was crawled first |
| Dropping near-duplicates silently | Hides version conflicts |
| A similarity threshold picked arbitrarily | Over-merges distinct policies |
| No deduplication and no acknowledgement | The effective-k cost goes unnoticed |

**On the threshold risk:** two chunks describing the fee for wire transfers and the fee for ACH transfers can be highly similar in embedding space while being entirely different policies. Setting the near-duplicate threshold too low merges them, which silently removes a correct answer from the corpus — a worse failure than the duplication it was meant to fix. Conservative thresholds plus a review queue beat aggressive automatic merging.

**On diversity as an alternative:** rather than deduplicating, Maximal Marginal Relevance selects results balancing relevance against dissimilarity to what's already selected. It addresses the same symptom — redundant context — without requiring a decision about which copy is canonical, and it's often the cheaper fix at query time.

## 7. Interview Answer

> "[**Your handling.** "The corpus was curated and this wasn't an issue" is a fine answer.]
>
> "[**If it wasn't handled**] It wasn't something I addressed — the corpus was small and curated. But I know what it costs, and the cost is larger than it sounds.
>
> The problem isn't waste, it's effective k. If someone asks about international transfer fees and the corpus has the fee schedule as a PDF, the same text inside a larger handbook, and a reformatted intranet copy, then a top-five retrieval can return the same paragraph three times. You paid for five chunks of context and received two pieces of information — and the model's job got harder, not easier.
>
> There are three kinds and they need different handling. Exact duplicates are trivial — a content hash. Near-duplicates, the same policy in different formatting or a different version, need embedding similarity above a threshold, and that's the common and damaging case. And semantic duplicates, where two documents state the same rule in different words, aren't detectable by similarity at all — and may actually be a contradiction rather than a duplicate, which is a different problem.
>
> The part people skip is the precedence rule. Deduplication has to decide which copy survives, and without an explicit order it means 'whichever was crawled first', which isn't a policy. I'd order it: the designated system of record beats a copy on an intranet page, newer effective date beats older, and the dedicated fee schedule beats the same text quoted inside a general handbook.
>
> And there's a case where deduplication is actively the wrong move. Two chunks that are ninety-five percent similar and differ in a figure — one says the fee is forty, the other forty-five — aren't duplicates. They're a version conflict. Deduplicating by similarity picks one, possibly the wrong one, and hides the fact that the corpus contained both. The right handling is to detect the near-duplicate, use effective-date filtering so only the current one is retrievable, and flag the pair for review rather than silently dropping one.
>
> On the threshold — I'd set it conservatively, because two chunks describing the wire transfer fee and the ACH transfer fee can be very similar in embedding space and are completely different policies. Merging those silently removes a correct answer from the corpus, which is worse than the duplication it was fixing.
>
> And a cheaper alternative at query time: Maximal Marginal Relevance, which selects results balancing relevance against dissimilarity to what's already selected. It addresses the same symptom — redundant context — without needing a decision about which copy is canonical."

## 8. Likely Follow-ups

**Q: Why do duplicates matter beyond storage?**
They shrink effective k. Three copies of the same paragraph in a top-five retrieval means five chunks of context carrying two facts, and if one copy is a superseded version it introduces a contradiction the model has to resolve.

**Q: How do you detect near-duplicates?**
Embedding similarity above a threshold, set conservatively. The risk of an aggressive threshold is merging genuinely different policies — wire fees and ACH fees are similar in embedding space and entirely distinct — which silently removes a correct answer.

**Q: Which copy do you keep?**
By explicit precedence: system of record over an intranet copy, newer effective date over older, dedicated document over the same text quoted in a general handbook. Without that rule it's whichever was crawled first.

**Q: When is deduplication the wrong answer?**
When the near-duplicates differ in a figure. That's a version conflict, not duplication — dropping one hides it. Effective-date filtering plus a review flag is the right handling.

**Q: Is there an alternative to deduplicating?**
Maximal Marginal Relevance at query time, selecting for relevance balanced against dissimilarity to already-selected results. It removes redundancy from the context without requiring a canonical-copy decision.

## 9. Common Mistakes

- Hash-based deduplication only.
- No precedence rule for which copy survives.
- Dropping near-duplicates that are actually version conflicts.
- An over-aggressive similarity threshold merging distinct policies.
- Claiming deduplication that wasn't implemented.

## 10. What to Remember

- **The cost is effective k**, not storage.
- **Three kinds** — exact, near, semantic — with different fixes.
- **Precedence must be explicit**: authority, recency, specificity.
- **Near-duplicates differing in a number are version conflicts.**
- **MMR is the cheap query-time alternative.**
