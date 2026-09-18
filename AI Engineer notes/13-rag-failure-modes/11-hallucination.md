# Failure Mode: Hallucination

> **Phase 13 · RAG FAILURE MODES · Topic 11**

## 1. Definition

The model producing claims the retrieved context doesn't support. In RAG this is measured against the provided context rather than against truth — a claim that is factually correct but unsupported still counts.

## 2. Simple Explanation

RAG reduces hallucination; it doesn't eliminate it. The model can still overstate what the context says, fill gaps from training data, or extrapolate beyond the evidence.

The most dangerous version is the one that *looks* verified — a plausible claim with a real citation attached, where the cited chunk doesn't actually say it.

## 3. How It Works

**The four types, by mechanism:**

| Type | Mechanism | Example |
|---|---|---|
| **Overstatement** | Qualifier dropped | "first two per month waived" → "unlimited free" |
| **Parametric leakage** | Gap filled from training data | Adding settlement times the context never mentioned |
| **Fabricated specifics** | Invented numbers or thresholds | A "$50,000 limit" that appears nowhere |
| **Unsupported inference** | Plausible leap | "so domestic transfers are presumably also free" |

**Why it happens even with good retrieval:**

```
· Context is PARTIAL — the model gap-fills the missing piece
· Strong parametric priors on the topic override the context
· No abstention instruction — the model answers because it must
· Temperature above 0 — creativity applied to facts
· Ambiguous context — the model resolves the ambiguity badly
```

**That first one is the dominant cause**, and it makes hallucination largely a retrieval problem.

## 4. Practical Example

**The dangerous shape — plausible, cited, wrong:**

```
Context [1]: "Premier customers receive fee waivers on the first
              two international transfers per calendar month."

Answer: "Premier customers get unlimited free international
         transfers [1]."

· Reads naturally
· Cites a real chunk
· The chunk is genuinely about the topic
· The claim is materially wrong

A user checking the citation sees a real, relevant document and
is reassured. That's worse than an obviously wrong answer.
```

**Defense in depth:**

```
1. RETRIEVAL   — complete context removes the gap to fill   ← biggest lever
2. PROMPT      — abstention clause + "use only the context"
                 + per-claim citation requirement
3. DECODING    — temperature 0
4. VERIFICATION— inline figure matching (free) + sampled judge
5. ACTION      — block, strip the claim, or abstain on failure
```

**The free inline check that catches the worst type:**

```python
figures = extract_currency_and_percentages(answer)
context = " ".join(c.text for c in cited_chunks)
unsupported = [f for f in figures if f not in context]
# Runs on 100% of traffic. Catches fabricated monetary specifics,
# which is the highest-consequence failure in a fee assistant.
```

## 5. Why It Matters

- **It's the primary safety risk** of a RAG system, and what compliance reviewers ask about.
- **The cited-but-unsupported shape is worse than an obvious error** — it manufactures false confidence.
- **The biggest reduction lever is retrieval**, which is counterintuitive and worth knowing.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No abstention instruction** | The model answers out-of-scope questions confidently |
| **Citations not validated** | Authoritative-looking wrong attributions |
| **Temperature above 0** | Non-determinism applied to facts |
| **Only checking fabricated facts** | Misses overstatement, which is more common |
| **Prompt-tuning a retrieval problem** | Partial context is the root cause |
| **Judge is the generating model** | Self-preference inflates the score |

**On over-correction:** an aggressive grounding instruction can make the model refuse to synthesize across two provided chunks, or decline reasonable questions. The phrasing should permit reasoning *across the supplied sources* while forbidding facts from outside them.

**On the trade-off with abstention:** driving hallucination toward zero by abstaining aggressively produces a system that's safe and useless. The abstention rate needs a target band, monitored in both directions.

## 7. Interview Answer

> "Hallucination in RAG is the model producing claims the retrieved context doesn't support. I'd measure it against the context rather than against truth — a claim that's factually correct but unsupported still counts, because the system had no evidence and can't cite it.
>
> There are four types. Overstatement is the most common — dropping a qualifier, so 'fee waivers on the first two transfers per month' becomes 'unlimited free transfers.' Parametric leakage is the subtlest, where the model adds a true fact from training data. Fabricated specifics — an invented threshold — are the highest risk in banking. And unsupported inference.
>
> The most dangerous shape is a plausible claim with a real citation where the cited chunk doesn't say it. The user checks the citation, sees a real relevant document, and is reassured. That's worse than an obviously wrong answer because it manufactures false confidence.
>
> The counterintuitive point is that the biggest reduction lever is retrieval, not prompting. When the context only partially answers the question, the model gap-fills — that's the dominant mechanism. So a rising hallucination rate should send me to check context relevance before I rewrite the prompt.
>
> Beyond that: an explicit abstention clause, a per-claim citation requirement which makes unsupported claims structurally visible, temperature zero, and verification. The free verification is extracting every monetary figure from the answer and checking it appears in a cited chunk — deterministic, runs on all traffic, and catches the highest-consequence failure.
>
> One caution: driving hallucination to zero by abstaining aggressively produces a system that's safe and useless. The abstention rate needs a target band monitored in both directions."

## 8. Likely Follow-ups

**Q: Does RAG eliminate hallucination?**
No, it reduces it. The model can still overstate what the context says, blend in parametric knowledge, or extrapolate. RAG constrains the model's input; it doesn't constrain its output. That's why verification and abstention matter on top of retrieval.

**Q: What's the most common type?**
Overstatement — dropping a limiting qualifier. It's common because the claim looks supported: all the vocabulary is present and only the condition is gone. Figure matching won't catch it since no number was invented; it needs semantic judging.

**Q: How do you reduce it?**
Retrieval quality first, because partial context is the dominant mechanism. Then an abstention instruction, then per-claim citations which make unsupported claims visible, then temperature zero, then post-hoc verification that blocks or flags. Most hallucination problems trace to retrieval rather than to the prompt.

**Q: How do you catch it cheaply?**
Extract every monetary figure and date from the answer and verify it appears in a cited chunk. Free, deterministic, runs on every request, and it catches fabricated specifics — the highest-consequence failure in a financial assistant. An LLM judge on sampled traffic catches overstatement that figure matching can't.

**Q: Can you get it to zero?**
Not reliably, and trying too hard is its own failure — a system that abstains on everything is safe and useless. The practical target is a low rate with the highest-consequence failures blocked deterministically, plus an abstention path, plus an abstention-rate band monitored in both directions so over-caution is visible too.

## 9. Common Mistakes

- Claiming RAG eliminates hallucination.
- Only checking for fabricated facts, missing overstatement.
- Rewriting the prompt when the cause is incomplete retrieval.
- Not validating that citations support their claims.
- Driving abstention up without monitoring it, producing a useless system.

## 10. What to Remember

- **Measured against the context, not against truth.** True-but-unsupported still counts.
- **Four types:** overstatement (most common), parametric leakage, fabricated specifics, unsupported inference.
- **Cited-but-unsupported is the most dangerous shape** — it manufactures false confidence.
- **The biggest lever is retrieval**, not prompting. Partial context causes gap-filling.
- **Free inline figure matching** catches the highest-consequence failures.
