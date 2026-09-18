# Factuality

> **Phase 22 · AI EVALUATION · Topic 06**

## 1. Definition

Whether the claims in an answer are true. Distinct from groundedness, which asks whether they're supported by the provided context — an answer can be perfectly grounded in a wrong document.

## 2. Simple Explanation

Groundedness asks: does the context say this? Factuality asks: is this true?

Those come apart whenever the source is wrong, outdated, or superseded — and in banking that's the failure that reaches customers while every metric looks healthy.

## 3. How It Works

```
GROUNDEDNESS   answer ←→ retrieved context
               checkable automatically

FACTUALITY     answer ←→ reality
               requires knowing what's true

In a closed-corpus RAG system, factuality decomposes into:
  · is the answer grounded in the retrieved context?   (automatic)
  · was the retrieved context the CORRECT source?      (harder)
  · was that source itself accurate and current?       (data quality)
```

**That decomposition is the useful part.** Factuality isn't one problem — it's a grounding problem, a retrieval problem, and a data quality problem, and they have different owners.

## 4. Practical Example

**The failure that passes every automated check:**

```
Retrieved: fee schedule v3.1 (superseded, expired 2023)
Answer:    "The international transfer fee is $35."
Citation:  fee-schedule-v3.1 §3.1

Groundedness:      PASS — the context says exactly that
Citation accuracy: PASS — the citation resolves and supports
Answer relevance:  PASS — it answers the question asked
Factuality:        FAIL — the current fee is $45

Every metric is green. The customer is told the wrong fee.
```

**So how factuality is actually controlled:**

```
1. EFFECTIVE-DATE FILTERING at retrieval
   Superseded versions are never retrievable as current.
   This is the primary control and it's a filter, not a metric.

2. CORPUS FRESHNESS
   Re-ingestion on a schedule, with alerting when it fails
   silently. A stale index is a factuality problem.

3. DELETE RECONCILIATION
   Withdrawn documents removed from the index, not just
   superseded — otherwise both versions are retrievable.

4. GOLDEN SET WITH ABSOLUTE ANSWERS
   Expected answers labelled against the CURRENT truth, not
   against whatever the corpus contains. Then a factuality
   failure shows up as a wrong answer even when
   groundedness passes.

Point 4 is what turns factuality into something measurable.
```

**The labelling insight:** if the golden set's expected answers are derived from the corpus, it can never detect a corpus error. Labelling them independently — from the authoritative current source — is what makes the evaluation capable of catching a stale index.

## 5. Why It Matters

- **Groundedness and factuality come apart** when the source is wrong.
- **The failure passes every automated metric**, which is what makes it dangerous.
- **Effective-date filtering is the primary control** — a filter, not a metric.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Treating groundedness as factuality** | Wrong answers pass every check |
| **Golden set labelled from the corpus** | Can't detect a corpus error |
| **No effective-date filter** | Superseded versions retrievable as current |
| **Silent ingestion failures** | Index goes stale, nothing alerts |
| **Superseded not deleted** | Both versions retrievable |
| **Factuality checked only at launch** | Corpus drifts afterwards |

**On who owns it:** groundedness is an engineering problem. Factuality is substantially a content-ownership problem — whether the fee schedule in the corpus is the current approved one is a question for the team that owns fee schedules. Framing it as purely an AI problem misplaces the fix, and a system can't be more accurate than its corpus.

**On what the system can do:** it can guarantee it answers only from the corpus, cites what it used, and never retrieves a document past its effective-to date. It can't guarantee the corpus is right. Being precise about that boundary is more honest than claiming accuracy the architecture can't deliver.

## 7. Interview Answer

> "Groundedness asks whether the context says this; factuality asks whether it's true. They come apart whenever the source is wrong, outdated, or superseded — and that's the failure that reaches customers while every metric looks healthy.
>
> Concretely: retrieval returns fee schedule version 3.1, which expired in 2023. The answer says the fee is thirty-five dollars and cites it. Groundedness passes, because the context says exactly that. Citation accuracy passes, because the citation resolves and supports the claim. Answer relevance passes. And the current fee is forty-five, so the customer is told the wrong thing with every metric green.
>
> That's why I'd decompose factuality rather than treat it as one metric. It's a grounding problem, a retrieval problem, and a data quality problem, and they have different owners.
>
> The primary control is effective-date filtering at retrieval, so superseded versions are never retrievable as current. That's a filter, not a metric — you prevent the failure rather than detecting it. Alongside that: corpus freshness with alerting when scheduled re-ingestion fails silently, and delete reconciliation so withdrawn documents are removed rather than just superseded, since otherwise both versions stay retrievable.
>
> To make factuality measurable, the golden set's expected answers have to be labelled against the current authoritative truth, not derived from the corpus. If they come from the corpus, the evaluation can never detect a corpus error — it just confirms the system faithfully reports whatever it was given. Labelling independently is what lets a factuality failure show up as a wrong answer even when groundedness passes.
>
> And I'd be clear about ownership. Groundedness is an engineering problem. Factuality is substantially a content-ownership problem — whether the fee schedule in the corpus is the current approved one is a question for the team that owns fee schedules. A system can't be more accurate than its corpus, and framing factuality as purely an AI problem misplaces the fix.
>
> What the system can guarantee is that it answers only from the corpus, cites what it used, and never retrieves past an effective-to date. It can't guarantee the corpus is right, and being precise about that boundary is more honest than claiming accuracy the architecture can't deliver."

## 8. Likely Follow-ups

**Q: How does factuality differ from groundedness?**
Groundedness checks the answer against the provided context; factuality checks it against reality. An answer can be perfectly grounded in a superseded document — faithful to the source and wrong for the customer, with every automated metric passing.

**Q: How do you control factuality?**
Primarily by prevention: effective-date filtering at retrieval so superseded versions are never returned as current, corpus freshness with alerting on silent ingestion failures, and delete reconciliation so withdrawn documents leave the index rather than lingering alongside their replacements.

**Q: How do you measure it?**
By labelling the golden set's expected answers against the current authoritative source rather than deriving them from the corpus. If the labels come from the corpus, the evaluation can only confirm faithful reporting — it can never detect that the corpus itself is wrong.

**Q: Who owns factuality?**
Partly engineering, substantially content ownership. Whether the fee schedule in the corpus is the current approved version is a question for the team that owns fee schedules. A system can't be more accurate than its corpus, so framing it purely as an AI problem misplaces the fix.

**Q: What can the system actually guarantee?**
That it answers only from the corpus, cites what it used, and never retrieves a document past its effective-to date. It can't guarantee the corpus is correct, and being precise about that boundary is more honest than claiming accuracy the architecture can't provide.

## 9. Common Mistakes

- Treating groundedness scores as evidence of factual correctness.
- Labelling golden-set answers from the corpus being evaluated.
- No effective-date filter at retrieval.
- Superseded documents left retrievable alongside current ones.
- Framing factuality as purely an engineering problem.

## 10. What to Remember

- **Grounded ≠ true** — a superseded source grounds an answer perfectly.
- **The failure passes every automated metric**, which is what makes it dangerous.
- **Effective-date filtering is prevention**, and it's the primary control.
- **Label the golden set independently** of the corpus, or it can't detect corpus errors.
- **The system can't be more accurate than its corpus** — say so precisely.
