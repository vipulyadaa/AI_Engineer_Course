# Self-Correction (in Agentic RAG)

> **Phase 18 · AGENTIC RAG · Topic 10**

## 1. Definition

The system detecting that retrieval or the draft answer was inadequate and doing something about it — reformulating the query, changing source, or abstaining.

> General agent self-correction is in [17-ai-agents/15-self-correction.md](../17-ai-agents/15-self-correction.md). Here the focus is correcting *retrieval*.

## 2. Simple Explanation

Retrieval sometimes returns nothing useful. The question is what happens next.

A standard pipeline generates anyway, from weak context. An agentic system can notice and try a different query — which is the single most valuable correction available in RAG.

## 3. How It Works

**Detecting that retrieval failed:**

```
MECHANICAL — cheap and reliable
  · top score below the calibrated relevance threshold
  · fewer than N results above the floor
  · results have low similarity to each other (incoherent)

MODEL-BASED — costs a call
  · "Does this context contain the information needed to
     answer the question? Yes/no, and what's missing."

Use the mechanical signals first — they're free, and they
catch the clearest failures before spending a call.
```

**What to do about it:**

```
1. REFORMULATE     rephrase, expand abbreviations, add domain
                   terms, or split a multi-part query
2. CHANGE SOURCE   structured lookup instead of documents,
                   or a different corpus
3. BROADEN         relax the metadata filter — but never the
                   permission filter
4. ASK             the query is genuinely ambiguous
5. ABSTAIN         say the information isn't available
```

**Point 3 has a hard boundary:** broadening a date or document-type filter is fine. Broadening an access-control filter is never acceptable, and the two must not sit behind one "relax the filters" action.

## 4. Practical Example

**Why reformulation works:**

```
QUERY   "intl xfer chg"
        → poor retrieval: abbreviations don't embed well and
          don't match lexically either

REFORMULATED
        "international transfer charge fee"
        → matches both the embedding space and BM25

Common productive reformulations:
  · expand abbreviations and internal jargon
  · add the domain term the corpus actually uses
    ("fee schedule" rather than "how much")
  · split a multi-part question
  · convert a question into the declarative form the
    documents are written in
```

**The most important correction is abstention:**

```
If reformulation and source-switching both fail, the honest
outcome is:

  "I don't have information about that in our documentation.
   Let me connect you with someone who can help."

In banking that's a correct answer. Generating from weak
context produces a confident, plausible, wrong answer —
and the customer has no way to tell the difference.

Correction must include knowing when to stop correcting.
```

**Bounding it:** two reformulation attempts, then abstain. Unbounded reformulation is an expensive loop that usually ends in a weak answer anyway.

## 5. Why It Matters

- **Noticing that retrieval failed** is the capability standard RAG lacks entirely.
- **Reformulation genuinely fixes** the common vocabulary-mismatch failures.
- **Abstention is the correction** when reformulation doesn't work.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unbounded reformulation** | Cost and latency for a weak answer |
| **Reformulating away from intent** | Retrieving something else entirely |
| **Relaxing permission filters** | A security failure, not a correction |
| **Generating from weak context** | The failure correction exists to prevent |
| **Uncalibrated thresholds** | Detection fires wrongly in both directions |

**On reformulating away from intent:** an aggressive rewrite can retrieve well for a question the user didn't ask. The safeguard is checking that the reformulated query still relates to the original — and always reranking the final results against the *original* question, not the reformulation.

**On threshold calibration:** the mechanical detection depends on a relevance floor that must be derived from labelled score distributions for your model and corpus. A copied threshold either fires constantly or never, which makes the whole correction mechanism either expensive or inert.

## 7. Interview Answer

> "In agentic RAG, self-correction is mostly about retrieval. A standard pipeline generates from whatever came back, even if that's nothing useful. An agentic system can notice and try something different — that's the single most valuable correction available in RAG.
>
> Detection should start mechanically because it's free: is the top similarity score below the calibrated relevance floor, are there fewer than N results above it, are the results incoherent with each other. Those catch the clearest failures before spending an LLM call. A model-based check — does this context contain what's needed, and what's missing — is the second layer.
>
> Then there are five responses. Reformulate the query. Change source, to a structured lookup or a different corpus. Broaden the filters. Ask the user, if the query is genuinely ambiguous. Or abstain.
>
> On broadening, there's a hard boundary: relaxing a date or document-type filter is fine, relaxing an access-control filter is never acceptable. Those must not sit behind one 'relax the filters' action, because that's how a correction becomes a security failure.
>
> Reformulation works because most retrieval failures are vocabulary mismatches. 'Intl xfer chg' embeds poorly and doesn't match lexically either; 'international transfer charge fee' matches both. Expanding abbreviations, using the term the corpus actually uses, splitting multi-part questions, and converting a question into the declarative form documents are written in are the productive rewrites.
>
> The most important correction, though, is abstention. If reformulation and source-switching both fail, the honest outcome is saying the information isn't in our documentation and offering a handoff. In banking that's a correct answer — generating from weak context produces something confident, plausible, and wrong, and the customer can't tell the difference. Correction has to include knowing when to stop correcting, so I'd bound it at two reformulation attempts then abstain.
>
> Two things to be careful of. An aggressive rewrite can retrieve well for a question the user didn't ask, so I'd always rerank final results against the original question rather than the reformulation. And the mechanical detection depends on a relevance threshold calibrated from labelled score distributions for your model and corpus — a copied threshold makes the whole mechanism either constantly expensive or completely inert."

## 8. Likely Follow-ups

**Q: How do you detect that retrieval failed?**
Mechanically first — top score below the calibrated relevance floor, too few results above it, or results incoherent with each other. Those are free. A model-based check asking whether the context contains what's needed is the second layer, and it costs a call.

**Q: What are the correction options?**
Reformulate the query, switch to a different source such as a structured lookup, broaden non-security filters, ask the user for clarification, or abstain. Which applies depends on whether the failure was vocabulary mismatch, wrong source, over-filtering, or genuine absence.

**Q: Is relaxing filters always safe?**
No. Broadening a date range or document type is fine; broadening an access-control filter is a security failure rather than a correction. Those must be separate actions, not both reachable through a single "relax the filters" step.

**Q: When should the system abstain?**
After bounded correction fails — two reformulation attempts and a source switch. Saying the information isn't in our documentation and offering a handoff is a correct answer in banking, because generating from weak context gives the customer something confident and wrong they can't distinguish from a good answer.

**Q: What's the risk with reformulation?**
Drifting from intent. An aggressive rewrite can retrieve excellently for a question the user didn't ask. The safeguard is checking the reformulation still relates to the original and always reranking final results against the original question rather than the rewritten one.

## 9. Common Mistakes

- Generating from weak context instead of detecting the failure.
- Unbounded reformulation attempts.
- Treating permission filters as relaxable alongside other filters.
- Reranking against the reformulated query rather than the original.
- Using an uncalibrated relevance threshold for detection.

## 10. What to Remember

- **Noticing retrieval failed** is what standard RAG can't do.
- **Detect mechanically first** — thresholds are free, model checks cost a call.
- **Never relax permission filters** as part of a correction.
- **Bound reformulation at ~2 attempts**, then abstain.
- **Rerank against the original question**, not the reformulation.
