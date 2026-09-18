# Hallucination

> **Phase 04 · LLM FUNDAMENTALS · Topic 19**

## 1. Definition

An LLM producing content that is fluent and confident but unsupported — either factually false, or true but without any basis in the model's evidence. It's a direct consequence of a training objective that optimizes plausibility rather than truth.

## 2. Simple Explanation

The model was trained to predict what comes next in a plausible document. A fluent invented fact is exactly what that objective rewards.

So hallucination isn't a defect bolted on afterwards — it's what the model does. The engineering question isn't "why does it hallucinate" but "what evidence and constraints do we add so its plausible output is also correct."

## 3. How It Works

**Why the objective produces it:**

```
"The international wire fee is $45"   ← plausible AND true
"The international wire fee is $30"   ← plausible AND false

Both are fluent continuations. Next-token prediction cannot
distinguish them without evidence in the context.
```

**The four types:**

| Type | Mechanism | Example |
|---|---|---|
| **Fabrication** | Invented specifics | A threshold that appears nowhere |
| **Overstatement** | Qualifier dropped | "first two per month waived" → "unlimited free" |
| **Parametric leakage** | Fact from training data, not context | Adding settlement times the context never mentioned |
| **Unsupported inference** | Plausible leap | "so domestic transfers are presumably also free" |

**Why they're internally consistent:** each generated token conditions the next. Once the model has said "$30," that figure is in its context and it continues coherently *about* $30 — producing a self-consistent wrong answer rather than an obviously broken one. That's what makes hallucination dangerous rather than merely annoying.

## 4. Practical Example

**In RAG, hallucination is measured against the context, not against truth:**

```
hallucination_rate = 1 − groundedness
                   = unsupported claims / total claims

A claim that is TRUE but absent from the context still counts.
The system had no evidence, can't cite it, and can't guarantee
the next such claim is right.
```

**Defense in depth:**

```
1. RETRIEVAL      complete context removes the gap to fill   ← biggest lever
2. PROMPT         "use only the context"; abstention clause;
                  per-claim citation requirement
3. DECODING       temperature 0
4. VERIFICATION   inline figure matching (free) + sampled judge
5. ACTION         block, strip the claim, or abstain on failure
```

**The free inline check that catches the worst type:**

```python
figures = extract_currency_and_percentages(answer)
context = " ".join(c.text for c in cited_chunks)
unsupported = [f for f in figures if f not in context]
# Runs on 100% of traffic. Deterministic. Catches fabricated
# monetary specifics — the highest-consequence failure in banking.
```

**The counterintuitive point:** the biggest lever is retrieval, not prompting. When the context only partially answers the question, the model gap-fills — that's the dominant mechanism behind parametric leakage. So a rising hallucination rate should send you to check context relevance before rewriting the prompt.

## 5. Why It Matters

- **It's the primary safety risk** of any LLM system and what compliance reviewers ask about.
- **The plausibility-not-truth framing** explains it mechanically rather than as a mysterious defect.
- **"Fix retrieval before the prompt"** is the non-obvious operational insight.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No abstention instruction** | The model answers out-of-scope questions confidently |
| **Citations not validated** | A wrong citation manufactures false confidence |
| **Only checking fabricated facts** | Misses overstatement, which is more common |
| **Prompt-tuning a retrieval problem** | Partial context is the root cause |
| **Over-abstaining** | A system that declines everything is safe and useless |
| **Judge is the generating model** | Self-preference inflates the groundedness score |

**On the over-correction:** driving hallucination toward zero by abstaining aggressively produces a system nobody uses. The abstention rate needs a target band monitored in both directions — a sudden drop looks like improvement on every other metric while being a real safety regression.

**On the dangerous shape:** a plausible claim with a real citation where the cited chunk doesn't actually say it is worse than an obviously wrong answer. The user checks the citation, sees a real relevant document, and is reassured. That's why citation validation isn't optional polish.

## 7. Interview Answer

> "Hallucination is an LLM producing fluent, confident content that isn't supported. It's a direct consequence of the training objective — next-token prediction optimizes plausibility, not truth. 'The wire fee is forty-five dollars' and 'the wire fee is thirty dollars' are both fluent continuations, and the objective can't distinguish them without evidence in the context.
>
> So it isn't a defect bolted on afterwards. The engineering question isn't why it hallucinates but what evidence and constraints we add so the plausible output is also correct.
>
> In RAG I'd measure it against the context rather than against truth — a claim that's true but absent from the context still counts, because the system had no evidence and can't cite it. There are four types: fabricated specifics, which are the highest risk in banking; overstatement, which is the most common — dropping a qualifier so 'first two transfers per month waived' becomes 'unlimited free'; parametric leakage, the subtlest; and unsupported inference.
>
> Hallucinations are internally consistent because each token conditions the next. Once the model has said thirty dollars, that's in its context and it continues coherently about thirty dollars — producing a self-consistent wrong answer rather than something obviously broken. That's what makes it dangerous.
>
> My defenses in order: retrieval quality first, because partial context is what invites gap-filling; then an abstention instruction and per-claim citations, which make unsupported claims structurally visible; temperature zero; and verification. The free verification is extracting every monetary figure from the answer and checking it appears in a cited chunk — deterministic, runs on all traffic, and it catches fabricated specifics.
>
> The counterintuitive point is that the biggest lever is retrieval, not prompting. A rising hallucination rate should send me to check context relevance before I touch the prompt. And I'd watch the abstention rate in both directions, because a system that declines everything is safe and useless."

## 8. Likely Follow-ups

**Q: Why do LLMs hallucinate?**
Because the training objective rewards plausibility, not truth. A fluent invented fact is exactly what next-token prediction optimizes for. It's not a bug introduced later — it's what the model was trained to do, which is why grounding in retrieved evidence is a structural fix rather than a patch.

**Q: Does RAG eliminate it?**
No, it reduces it. The model can still overstate what the context says, blend in parametric knowledge, or extrapolate beyond the evidence. RAG constrains the input; it doesn't constrain the output. That's why abstention instructions, citation requirements, and post-hoc verification sit on top of retrieval.

**Q: What's the most common type?**
Overstatement — dropping a limiting qualifier. It's common because the claim looks supported: all the vocabulary is present and only the condition is gone. Figure matching won't catch it since no number was invented; it needs semantic judging against the source.

**Q: How do you reduce it?**
Retrieval quality first, because partial context causes gap-filling. Then an explicit abstention instruction, then per-claim citations which make unsupported claims visible, then temperature zero, then post-hoc verification that blocks or flags. Most hallucination problems trace to retrieval rather than to the prompt, which surprises people.

**Q: Can you get it to zero?**
Not reliably, and trying too hard has its own failure mode — a system that abstains on everything is safe and useless. The practical target is a low rate with the highest-consequence failures blocked deterministically, plus an abstention path, plus monitoring the abstention rate in both directions so over-caution is visible.

## 9. Common Mistakes

- Treating hallucination as a mysterious defect rather than a consequence of the objective.
- Claiming RAG eliminates it.
- Only checking for fabricated facts, missing overstatement.
- Rewriting the prompt when the cause is incomplete retrieval.
- Driving abstention up without monitoring it.

## 10. What to Remember

- **The objective is plausibility, not truth.** That's the mechanism.
- **In RAG, measure against the context** — true-but-unsupported still counts.
- **Four types:** fabrication, overstatement (most common), parametric leakage, unsupported inference.
- **Internally consistent** because each token conditions the next — that's what makes it dangerous.
- **Retrieval is the biggest lever**, not prompting. And watch abstention in both directions.
