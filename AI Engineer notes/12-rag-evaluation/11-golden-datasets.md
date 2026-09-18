# Golden Datasets

> **Phase 12 · RAG EVALUATION · Topic 11**

## 1. Definition

A curated set of questions with verified correct answers and correct source chunks, used as the reference for evaluating a RAG system. It's the foundation every other evaluation activity depends on.

## 2. Simple Explanation

You can't improve what you can't measure, and you can't measure a RAG system without knowing what the right answers are.

A golden dataset is that reference. Without one, every change is a guess — you ship a new chunking strategy and have no way to tell whether it helped.

## 3. How It Works

**What each record needs:**

```json
{
  "id": "q-0142",
  "question": "What's the international wire fee for Premier accounts?",
  "expected_answer": "$25 per transfer, with the first two per
                      calendar month waived.",
  "correct_chunk_ids": ["policy-fees-2026#3.2:0",
                        "premier-benefits#1.4:2"],
  "query_type": "factual_lookup",
  "product": "international_transfers",
  "should_abstain": false,
  "difficulty": "easy",
  "added": "2026-02-01",
  "source": "production_log"
}
```

**Construction, in order:**

1. **Sample from production logs** — real questions, real phrasing.
2. **Have a domain expert identify the correct source chunks** and write the expected answer.
3. **Include deliberate out-of-scope questions** with `should_abstain: true`.
4. **Tag by query type and difficulty** so you can slice.
5. **Split into a dev set you iterate against and a test set you don't.**
6. **Refresh periodically** as the corpus and query distribution change.

## 4. Practical Example

**The leakage trap that inflates every metric:**

```
❌ Questions written by reading the documents:
   Source: "International transfers incur a $45 fee for retail accounts."
   Question written: "What fee do international transfers incur for
                      retail accounts?"
   → Uses the document's exact vocabulary. Retrieval looks excellent.
     Real users say "how much to send money abroad."

✅ Questions sampled from production logs:
   "how much does it cost to wire money overseas"
   "is there a charge for international transfers"
   "whats the fee to send money to india"
   → Real phrasing, real typos, real vocabulary gap.
```

**Composition that actually catches problems:**

```
Category                      share   why
──────────────────────────────────────────────────────────────
Common factual lookups         40%    the bulk of traffic
Multi-part / comparison        15%    tests decomposition
Exact identifiers              10%    tests hybrid retrieval
Conversational follow-ups      10%    tests query rewriting
Out-of-scope (should abstain)  15%    tests abstention — CRITICAL
Edge cases / rare products     10%    where failures concentrate
```

**The 15% out-of-scope portion is the one teams omit**, and it's what stops you from tuning into a system that never abstains.

**Dev/test discipline:**

```
Dev set (70%)   → iterate freely: chunking, prompts, retrieval config
Test set (30%)  → touched once per release, reported as the honest number

Iterating against the whole set means your reported metrics are
optimistic in a way you can't quantify.
```

## 5. Why It Matters

- **Every other evaluation activity depends on it** — recall@k, judge calibration, regression testing.
- **Without it, changes are guesses.** You can't tell whether a new chunking strategy helped.
- **The out-of-scope portion is what makes abstention measurable**, and abstention is the highest-value safety behavior.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Questions written from documents** | Vocabulary leakage; inflates retrieval metrics |
| **No out-of-scope questions** | Over-answering is invisible; you'll tune away abstention |
| **No dev/test split** | Reported metrics are optimistic by an unknown amount |
| **Never refreshed** | Query distribution drifts; the set stops representing production |
| **Too small** | Slices have too few examples for stable measurement |
| **Ground truth chunk IDs break on re-chunking** | Changing chunk size invalidates every label |
| **Single correct chunk when several are valid** | Penalizes correct retrievals |

**The re-chunking problem is a real practical headache.** If your golden dataset records chunk IDs and you then change chunk size, every label is invalid. The fix is to record ground truth at **section or document level**, or as a text span, rather than as chunk IDs — then map to whatever chunks currently cover that span.

## 7. Interview Answer

> "A golden dataset is questions with verified correct answers and correct source chunks. It's the foundation everything else depends on — recall@k, judge calibration, regression testing. Without one, every change is a guess.
>
> The trap I'd warn about hardest is how the questions are written. If someone writes them by reading the documents, they use the document's exact vocabulary — 'what fee do international transfers incur for retail accounts' — and retrieval looks excellent. Real users say 'how much to send money overseas.' That's a subtle form of leakage that inflates every retrieval metric. So I'd sample from production logs, with the real phrasing and typos.
>
> Composition matters more than size. About forty percent common lookups, fifteen percent multi-part questions to test decomposition, ten percent exact identifiers to test hybrid retrieval, ten percent conversational follow-ups to test rewriting — and critically, fifteen percent deliberately out-of-scope questions marked should-abstain. That last category is the one teams omit, and without it over-answering is invisible and you'll tune yourself into a system that never says 'I don't know.'
>
> I'd split it into a dev set I iterate against and a test set I touch once per release, exactly like train/test in supervised learning. Iterating against the whole thing makes reported metrics optimistic by an amount you can't quantify.
>
> One practical detail: I'd record ground truth at section or text-span level rather than as chunk IDs. If I record chunk IDs and then change chunk size, every label is invalidated — and chunk size is something I'll want to tune."

## 8. Likely Follow-ups

**Q: How big should it be?**
Large enough that each slice has stable measurement — if I want to report recall on exact-identifier queries, I need enough of those for the number to mean something, so maybe 30–50 per category. That puts a useful set at 200–500 questions total. Bigger is better but curation cost is real, and composition matters more than raw size.

**Q: Where do the questions come from?**
Production logs, sampled to reflect the real distribution of phrasing and query types. If the system isn't live yet, from the people who'll use it — support agents, relationship managers — rather than from whoever wrote the documents. Questions written by reading the source material carry vocabulary leakage.

**Q: Why include out-of-scope questions?**
Because abstention is a behavior you have to measure, and without questions that *should* produce "I don't know," over-answering is invisible. You'd tune the similarity threshold down, see recall improve, and not notice you've created a system that confidently answers everything. Fifteen percent out-of-scope makes that trade-off visible.

**Q: How do you handle re-chunking invalidating your labels?**
Record ground truth at section or text-span level rather than as chunk IDs, then map to whatever chunks currently cover that span. Chunk IDs are tied to a specific chunking configuration, and chunk size is exactly the parameter you'll want to sweep — so labeling at chunk level makes your eval set fragile against the experiment you most want to run.

**Q: How often do you refresh it?**
When the query distribution shifts meaningfully or the corpus changes substantially — quarterly is a reasonable cadence for most systems. I'd also continuously add questions from production failures and abstentions, so the set grows toward the cases the system actually struggles with rather than staying frozen at launch-day assumptions.

## 9. Common Mistakes

- Writing questions by reading the source documents.
- Omitting out-of-scope questions, making over-answering invisible.
- No dev/test split, so reported metrics are optimistic.
- Recording ground truth as chunk IDs, which re-chunking invalidates.
- Never refreshing, so the set drifts from production reality.

## 10. What to Remember

- **Questions + verified answers + correct sources.** The foundation for everything else.
- **Sample from production logs** — writing questions from documents leaks vocabulary.
- **15% out-of-scope questions** so abstention is measurable.
- **Dev/test split**, same discipline as supervised learning.
- **Label at section or span level**, not chunk IDs, so re-chunking doesn't invalidate it.
