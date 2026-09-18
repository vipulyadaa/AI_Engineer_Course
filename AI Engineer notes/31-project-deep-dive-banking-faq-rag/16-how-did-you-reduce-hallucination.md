# "How Did You Reduce Hallucination?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 16**
>
> ⚠️ **An answer framework.** Describe the layers you actually had. Naming
> the one you lacked is more credible than claiming all of them.

## 1. Definition

A question about layered defences. The strongest answer reframes it: in RAG, most "hallucination" is actually retrieval failure, so the defence starts before the model.

## 2. Simple Explanation

A model asked a question it can't answer from the context will produce something anyway.

The fix isn't one technique — it's making sure the right context is there, making the answer checkable, and being willing to say nothing.

## 3. How It Works

```
THE LAYERS, IN ORDER OF IMPACT

1. RETRIEVAL QUALITY   the answer must be in the context
2. CHUNKING            the condition must not be split
                       from its rule
3. ABSTENTION          a permitted, calibrated way out
4. CITATION            per-claim, so the answer is
                       checkable
5. VERIFICATION        a second pass against the retrieved
                       chunks
6. LOW TEMPERATURE     smallest effect of the six

Most people answer with 5 and 6. The first two matter more.
```

## 4. Practical Example

**The reframe that makes the answer land:**

```
"What's the international transfer fee?"
→ "The fee is $45."

The chunk said: "$45 standard; $25 for Premier and Private;
first two per calendar month waived for those tiers."

The model invented nothing. Every word traces to the chunk.

It OMITTED — dropped the conditions. For a Premier customer
that answer is wrong, and:
  · groundedness passes
  · citation resolves
  · factuality against the source passes

Omission is the hallucination type that matters in banking,
and it's invisible to every standard metric.
```

**Where omission comes from, and therefore what fixes it:**

```
CAUSE 1  chunking split the condition from the rule
         → the model never saw it
         FIX: structure-aware chunking

CAUSE 2  the model summarized and dropped it
         FIX: an instruction to state all conditions,
              exceptions, and eligibility criteria that
              appear in the source — explicitly, because
              "be accurate" doesn't imply "be complete"

Both are upstream of the model's honesty. Which is the
point: this isn't a model-behaviour problem.
```

**Verification done usefully:**

```
WEAK   "is this answer grounded?" → yes/no
       one judgement over a paragraph; a single wrong
       figure among five correct ones scores well

BETTER decompose into claims, verify each:
       "The standard fee is $45"      → supported
       "Premier customers pay $25"    → supported
       "There is no monthly limit"    → NOT SUPPORTED
                                        (contradicted)

Per-claim scoring localizes the failure, which is the
difference between a metric and a debugging tool.
```

**The layer people forget:** citations must be *verified*, not just requested. A model asked to cite will produce citation-shaped text, and a fabricated chunk ID looks exactly like a real one. Checking that every cited ID was actually in the retrieved set is a cheap, deterministic check — and it catches the failure mode where the citation is invented rather than the fact.

## 5. Why It Matters

- **Most RAG hallucination is retrieval failure** — the defence starts upstream.
- **Omission is the banking failure** and it passes every standard metric.
- **Citations must be verified against the retrieved set**, not trusted.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Temperature 0 and a strict prompt" | The two weakest layers |
| "We used RAG, so it's grounded" | Grounded in the wrong chunk is still wrong |
| Only checking groundedness | Omission passes |
| Citations requested but not verified | Fabricated IDs look real |
| No abstention | The model must produce something |

**On the cost of verification:** a second model call per answer roughly doubles cost and adds latency. The usual resolution is verifying a sample continuously and everything above a risk threshold — a question about a fee gets verified, a question about branch opening hours doesn't. Saying you'd tier it by risk is a more credible answer than claiming you verified every response.

**On what hallucination resistance really trades against:** every layer here pushes toward abstention, and a system that abstains too readily is also failing. The honest framing is that you're choosing an error ratio, not eliminating error — and in banking the ratio is deliberately skewed toward refusing.

## 7. Interview Answer

> "[**Your layers.** Name what you had and what you didn't.]
>
> "The framing I'd start with is that in RAG, most of what gets called hallucination is actually retrieval failure. The model produces something wrong because the right context wasn't there — so the defence starts well before the model.
>
> The example that shows it: someone asks about the international transfer fee, and the system answers 'the fee is forty-five dollars.' The chunk said forty-five standard, twenty-five for Premier and Private, and the first two per month waived for those tiers. The model invented nothing — every word traces to the chunk. It omitted. And for a Premier customer, that answer is wrong.
>
> What makes omission the failure that matters in banking is that it passes everything. Groundedness passes, the citation resolves, factuality against the source passes. It's invisible to standard metrics, and it's the type most likely to cause a customer complaint.
>
> So the layers, roughly in order of impact.
>
> First, retrieval quality — if the answer isn't in the context, nothing downstream helps. Second, chunking, because omission often comes from the chunk itself: a fixed-size split separates the condition from the rule and the model never sees the exception. Both of those are upstream of anything about model honesty.
>
> Third, an instruction to state all conditions, exceptions, and eligibility criteria that appear in the source. That's explicit because 'be accurate' doesn't imply 'be complete', and summarization drops qualifiers by default.
>
> Fourth, abstention — a calibrated relevance threshold plus explicit permission in the prompt to say 'I don't have that information.' Without the permission the model fills the gap, because that's its default behaviour.
>
> Fifth, per-claim citation and verification. And I'd emphasize verification rather than just requesting citations, because a model asked to cite produces citation-shaped text, and a fabricated chunk ID looks exactly like a real one. Checking that every cited ID was actually in the retrieved set is cheap and deterministic.
>
> On the verification pass itself — a single 'is this grounded?' judgement over a paragraph is weak, because one wrong figure among five correct ones still scores well. Decomposing into claims and verifying each localizes the failure, which is what turns a metric into a debugging tool.
>
> And temperature zero, which is the smallest of these effects and the one people lead with.
>
> Two honest caveats. Verification roughly doubles cost and adds latency, so in practice you tier it by risk — a fee question gets verified, a branch hours question doesn't. And all of this pushes toward abstention, so what you're really choosing is an error ratio rather than eliminating error. In banking that ratio is deliberately skewed toward refusing."

## 8. Likely Follow-ups

**Q: What's the most common hallucination in a RAG system?**
Omission — dropping conditions and exceptions present in the source. It's the one that matters in banking because a fee stated without its tier qualifier is wrong, and it passes groundedness, citation, and factuality checks.

**Q: Doesn't RAG solve hallucination?**
It reduces fabrication and introduces new failure modes: answering from the wrong retrieved chunk, and omitting qualifiers. Both produce answers that are grounded and cited and still wrong, which is why "we used RAG" isn't an answer.

**Q: How do you verify citations?**
Check that every cited chunk ID appears in the retrieved set. A model asked to cite will produce citation-shaped text, and a fabricated ID is indistinguishable from a real one by inspection — the check is deterministic and cheap.

**Q: Isn't verification expensive?**
Roughly double cost and added latency if applied to everything. The practical shape is a continuous sample plus full verification above a risk threshold — fee and eligibility questions verified, informational questions not.

**Q: What does low temperature actually buy?**
Consistency, not correctness. It's the smallest of the layers and the one people lead with. It stops the same question producing different figures on different runs, which matters, but it doesn't make a wrong retrieval right.

## 9. Common Mistakes

- Leading with temperature and prompt wording.
- Treating RAG as a solution rather than a different failure surface.
- Only measuring groundedness, so omission is invisible.
- Requesting citations without verifying them.
- Claiming every response was verified.

## 10. What to Remember

- **Most RAG hallucination is retrieval failure** — start upstream.
- **Omission is the banking failure** and passes every standard metric.
- **Instruct explicitly for completeness** — accuracy doesn't imply it.
- **Verify citations against the retrieved set.**
- **Per-claim beats per-answer** verification for debugging.
