# Generation Evaluation

> **Phase 22 · AI EVALUATION · Topic 13**

## 1. Definition

Measuring what the model did with the context it was given — whether the answer is grounded, responsive, complete, correctly cited, and appropriately phrased — holding retrieval constant.

## 2. Simple Explanation

Retrieval evaluation asks whether the right information was found. Generation evaluation asks what happened next.

The way to isolate it is to feed known-correct context and measure the answer. Any failure then belongs to generation, because retrieval was removed as a variable.

## 3. How It Works

```
ISOLATION TECHNIQUE
  supply the golden set's EXPECTED chunks as context,
  bypassing retrieval entirely

  → whatever fails now is a generation problem

WHAT TO MEASURE
  groundedness      claims supported by the given context
  relevance         does it answer what was asked
  completeness      all parts of a multi-part question
  citation accuracy citations resolve and support
  condition fidelity qualifying conditions preserved
  tone              appropriate to the query
  format            length, structure, required disclosures
```

**The isolation technique is the important part.** Without it, a generation metric measured end-to-end is contaminated by retrieval quality and can't be attributed.

## 4. Practical Example

**What the isolation reveals:**

```
End-to-end answer correctness: 0.74

With PERFECT context supplied:
  answer correctness: 0.93

So generation is fine and retrieval is the bottleneck.
Improving the prompt would gain almost nothing.

The reverse case:
End-to-end: 0.74     With perfect context: 0.76

Generation is the bottleneck. Retrieval is doing its job
and the model is mishandling what it's given — which is a
prompt, model tier, or context-formatting problem.

One extra evaluation run, and it tells you where six weeks
of work should go.
```

**That comparison is the highest-value thing in this topic.**

**Condition fidelity, which is specific to generation:**

```
Given a source stating "waived for the first two transfers
per calendar month for Premier and Private customers",
does the answer preserve:
  · the count (two)
  · the period (calendar month)
  · the tier condition (Premier and Private)

Dropping any one changes the meaning. And because every
remaining phrase traces to the source, a standard
groundedness check passes.

This has to be asked as its own question in the
verification prompt, not folded into groundedness.
```

**Format and disclosure compliance:**

```
Deterministic and cheap to check:
  · length within bounds
  · citations present for every factual claim
  · required disclosure language present where applicable
  · no advice or guarantee phrasing

These are property assertions rather than statistical
metrics, so they belong in CI as pass/fail tests.
```

## 5. Why It Matters

- **Supplying perfect context isolates generation** — one run tells you where to work.
- **Condition fidelity** needs measuring separately from groundedness.
- **Format and disclosure checks are deterministic** and belong in CI.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No isolation run** | Generation metrics contaminated by retrieval |
| **Condition fidelity folded into groundedness** | Omissions pass |
| **Format checks as statistical metrics** | They're deterministic assertions |
| **Tone unmeasured** | Correct-but-inappropriate answers pass |
| **Single model tier tested** | Cheaper tiers never evaluated |
| **Context formatting unvaried** | A real lever left untested |

**On context formatting as a variable:** how retrieved documents are presented — numbered, with source URIs, with effective dates, in what order — materially affects answer quality and citation accuracy. It's a generation-side lever that's easy to test with the isolation technique and frequently never varied, because it looks like plumbing rather than a parameter.

**On tier comparison:** the isolation run is also where model tier selection should be decided. With perfect context supplied, a Flash-class model often matches a Pro-class one on groundedness — and that comparison is only valid when retrieval variance has been removed, which is exactly what the isolation run does.

## 7. Interview Answer

> "Generation evaluation asks what the model did with the context it was given, and the technique that makes it meaningful is isolation — supply the golden set's expected chunks directly as context, bypassing retrieval. Then whatever fails is a generation problem, because retrieval has been removed as a variable.
>
> That comparison is the highest-value thing here. If end-to-end answer correctness is 0.74 and it rises to 0.93 with perfect context supplied, generation is fine and retrieval is the bottleneck — improving the prompt would gain almost nothing. If it only rises to 0.76, generation is the bottleneck and retrieval is doing its job. One extra evaluation run, and it tells you where six weeks of work should go.
>
> What I'd measure in that isolated setting: groundedness against the given context, relevance, completeness on multi-part questions, citation accuracy, condition fidelity, tone, and format compliance.
>
> Condition fidelity deserves separating from groundedness. Given a source saying fees are waived for the first two transfers per calendar month for Premier and Private customers, does the answer preserve the count, the period, and the tier condition? Dropping any one changes the meaning — and because every remaining phrase traces to the source, a standard groundedness check passes. So it has to be asked as its own question in the verification prompt rather than folded in.
>
> Format and disclosure checks are different in kind — length within bounds, citations present for every factual claim, required disclosure language where applicable, no advice or guarantee phrasing. Those are deterministic property assertions rather than statistical metrics, so they belong in CI as pass/fail tests rather than in a score.
>
> Two things the isolation run enables that people don't use it for. Context formatting as a variable — how documents are presented, numbered, with source URIs and effective dates, in what order — materially affects answer quality and citation accuracy. It's easy to test this way and frequently never varied, because it looks like plumbing rather than a parameter.
>
> And model tier selection. With perfect context supplied, a Flash-class model often matches a Pro-class one on groundedness — and that comparison is only valid once retrieval variance is removed, which is precisely what the isolation run does. So it's the right place to make the tier decision, which is usually the largest cost lever available."

## 8. Likely Follow-ups

**Q: How do you isolate generation from retrieval?**
Supply the golden set's expected chunks directly as context, bypassing retrieval. Whatever fails then is a generation problem. Without that, generation metrics are contaminated by retrieval quality and a low score can't be attributed to either stage.

**Q: What does the comparison tell you?**
Where to spend effort. End-to-end 0.74 rising to 0.93 with perfect context means retrieval is the bottleneck and prompt work would gain little. Rising only to 0.76 means generation is the bottleneck. One run, and it redirects weeks of work.

**Q: Why measure condition fidelity separately?**
Because dropping a qualifying condition passes a groundedness check — every remaining phrase still traces to the source. Asking explicitly whether the count, period, and tier conditions were preserved is a different question, and it catches the most consequential hallucination type.

**Q: What belongs in CI rather than in a score?**
Format and disclosure checks — length bounds, citations present for every claim, required disclosure language, no advice or guarantee phrasing. Those are deterministic property assertions, so they're pass/fail tests rather than statistical metrics with a threshold.

**Q: What else is the isolation run good for?**
Testing context formatting as a variable, which materially affects citation accuracy and is usually never varied because it looks like plumbing. And model tier selection — a Flash-class model often matches Pro-class on groundedness, but that comparison is only valid with retrieval variance removed.

## 9. Common Mistakes

- Measuring generation quality end-to-end without isolation.
- Folding condition fidelity into groundedness.
- Treating deterministic format checks as statistical metrics.
- Never varying context formatting.
- Deciding model tier without removing retrieval variance.

## 10. What to Remember

- **Supply perfect context to isolate generation** — one run redirects the work.
- **Condition fidelity is its own question**, not part of groundedness.
- **Format and disclosure checks are CI assertions**, not scores.
- **Context formatting is an untested lever** in most systems.
- **Decide model tier in the isolated setting**, where the comparison is valid.
