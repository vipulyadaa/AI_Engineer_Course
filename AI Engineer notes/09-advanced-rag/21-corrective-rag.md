# Corrective RAG (CRAG)

> **Phase 09 · ADVANCED RAG · Topic 21**

## 1. Definition

RAG with an explicit evaluation step between retrieval and generation: grade the retrieved documents for relevance, and take corrective action — retry with a better query, fall back to another source, or abstain — when they're inadequate.

## 2. Simple Explanation

Standard RAG retrieves and generates regardless of whether the retrieval was any good. If the chunks are irrelevant, the model still writes an answer — usually a plausible-sounding wrong one.

Corrective RAG adds a check: *are these documents actually relevant?* If not, do something about it instead of generating anyway.

## 3. How It Works

```
query → retrieve → ┌─────────────────────────┐
                   │ GRADE each document:    │
                   │ relevant / ambiguous /  │
                   │ irrelevant              │
                   └───────────┬─────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   ALL RELEVANT           AMBIGUOUS              ALL IRRELEVANT
   generate               refine query &         fall back:
                          retrieve again,        web search, or
                          or strip irrelevant    ABSTAIN
                          parts
```

1. **Retrieve** normally.
2. **Grade** each document — a small classifier or a cheap LLM call scoring relevance to the query.
3. **Branch on the grade:**
   - All relevant → generate.
   - Mixed → keep the good ones, optionally re-retrieve for the gap.
   - None relevant → rewrite the query and retry, escalate to another source, or abstain.
4. **Bound the retries** — one or two, then abstain.

**The abstention path is the point.** "I don't have information about that" is a correct and valuable answer, and standard RAG never produces it.

## 4. Practical Example

**The failure CRAG prevents:**

```
Q: "What's our policy on cryptocurrency deposits?"

The corpus has no crypto policy — the product doesn't exist.

STANDARD RAG:
  Retrieves the 4 nearest chunks: general deposit policy, AML
  procedures, international transfer terms, prohibited transactions.
  Cosine scores 0.61–0.68 — not great, but they're the top 4.
  Model generates: "Cryptocurrency deposits are subject to standard
  AML verification and may be restricted under our prohibited
  transactions policy."
  → Plausible. Confident. Entirely fabricated. Cited to real documents.

CORRECTIVE RAG:
  Grader: all 4 documents irrelevant to cryptocurrency.
  → Retry with a rewritten query → still nothing.
  → Abstain: "I don't have information about cryptocurrency deposit
     policies in our documentation."
  → Correct, and the gap gets logged for the content team.
```

**Grading implementation:**

```python
# Cheap: similarity threshold (uncalibrated, but free)
relevant = [c for c in chunks if c.score > THRESHOLD]

# Better: small LLM grader, batched
grades = llm.batch_grade(query, chunks)   # relevant / irrelevant per chunk

# Best for quality: a cross-encoder score with a tuned cutoff
```

## 5. Why It Matters

- **It's the most direct hallucination control available** — the model never sees irrelevant context in the first place.
- **It turns retrieval failure into a visible, loggable event** rather than a silent quality problem.
- **The abstention path produces a knowledge-gap backlog**, which is genuinely useful output.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Grading latency and cost** | An LLM grader per document adds a call per query |
| **Grader errors** | Grading a relevant document irrelevant causes unnecessary abstention |
| **Retry latency** | A failed grade triggers another retrieval round |
| **Threshold calibration** | Similarity scores aren't comparable across corpora; the cutoff needs tuning |
| **Over-abstention** | Too strict a grader makes the system unhelpfully cautious |
| **Web fallback is a security question** | Pulling external content into a banking assistant needs its own review |

**The calibration point matters.** Raw cosine similarity is not a reliable relevance signal — a score of 0.68 might be excellent in one corpus and meaningless in another. If you use a threshold, tune it on an eval set that includes known out-of-scope questions, so you can measure both the abstention rate on those and the false-abstention rate on answerable ones.

**A cheaper approximation:** rather than grading every document with an LLM, use the reranker's score, which you may already be computing. If the top reranked score is below a tuned cutoff, treat it as a retrieval failure. Near-zero additional cost.

## 7. Interview Answer

> "Corrective RAG adds an explicit evaluation step between retrieval and generation. You grade the retrieved documents for relevance, and if they're inadequate you take corrective action — refine the query and retry, fall back to another source, or abstain — rather than generating anyway.
>
> The failure it prevents is the most dangerous one in RAG. If someone asks about a cryptocurrency deposit policy and we don't have one, standard RAG still retrieves the four nearest chunks — general deposit policy, AML procedures, prohibited transactions — and the model writes a plausible, confident, entirely fabricated answer, cited to real documents. That's worse than an obvious error because the citations make it look verified.
>
> With grading, the system notices none of those documents are about cryptocurrency, retries once with a rewritten query, and then abstains: 'I don't have information about that in our documentation.' That's the correct answer, and it also logs a knowledge gap for the content team.
>
> On implementation, a cheap approximation that I like: if you're already running a reranker, use its top score as the relevance signal rather than adding a separate LLM grader. If the best reranked document scores below a tuned cutoff, treat it as a retrieval failure. That's near-zero additional cost.
>
> The thing to calibrate carefully is the threshold. Raw similarity scores aren't comparable across corpora, so I'd tune the cutoff on an eval set that deliberately includes out-of-scope questions — measuring both how often it correctly abstains on those and how often it wrongly abstains on answerable ones. Over-abstention makes the system useless in a different way."

## 8. Likely Follow-ups

**Q: How do you grade relevance cheaply?**
Reuse the reranker score if you already have one — the best-reranked document's score is a reasonable relevance signal at no extra cost. Otherwise a small cross-encoder or a batched LLM call grading all candidates at once. I'd avoid a separate LLM call per document, which multiplies cost for marginal gain over a batched approach.

**Q: What are the corrective actions?**
Refine the query and retry, typically once. Broaden the search — drop restrictive filters, raise k. Escalate to a different source such as another index or web search, though external sources need a security review in a regulated context. Or abstain, which should always be the terminal action after bounded retries.

**Q: How do you calibrate the threshold?**
On an eval set that includes both answerable questions and deliberately out-of-scope ones. Measure the abstention rate on each. The right threshold balances correctly abstaining on out-of-scope questions against wrongly abstaining on answerable ones — and that balance is a product decision about how cautious the assistant should be, not purely a technical one.

**Q: Isn't this just a confidence threshold?**
The threshold variant is the cheap version. Full CRAG grades documents individually and can take differentiated action — keeping the two relevant chunks and discarding the two irrelevant ones, then deciding whether to re-retrieve for the gap. A single confidence threshold is all-or-nothing. The threshold version captures most of the value for much less cost, which is why I'd start there.

**Q: What do you do with the abstentions?**
Log them as knowledge gaps. Clustering abstained queries over time gives a prioritized list of documentation that doesn't exist but should — which is genuinely valuable output from what looks like a failure path. That feedback loop is one of the stronger arguments for building CRAG at all.

## 9. Common Mistakes

- Using raw cosine similarity as a relevance threshold without calibration.
- Adding a per-document LLM grader when the reranker score would do.
- Unbounded retries on grading failure.
- Tuning the threshold only on answerable questions, so over-abstention is invisible.
- Not logging abstentions, wasting the knowledge-gap signal.

## 10. What to Remember

- **Grade retrieved documents, then branch:** generate, refine and retry, or abstain.
- **Prevents the worst RAG failure** — a confident fabricated answer cited to real documents.
- **Reuse the reranker score** as a cheap relevance grader.
- **Calibrate the threshold on out-of-scope questions**, and measure false abstention too.
- **Log abstentions** — they're a prioritized documentation backlog.
