# Model Routing

> **Phase 25 · LLM COST OPTIMIZATION · Topic 08**

## 1. Definition

Classifying each request and sending it down the cheapest path that can handle it — typically a deterministic pipeline for most traffic and an agent for the minority that needs one.

## 2. Simple Explanation

Not every question needs the same treatment. "What's the international transfer fee?" needs one retrieval and one generation. "Why was I charged $45 when I'm Premier?" needs several lookups and reconciliation.

Sending both down the expensive path means paying agent prices for FAQ traffic.

## 3. How It Works

```
request
  ▼
CLASSIFY ── smallest model tier, or a trained classifier
  ├── out of scope  ──▶ decline (no further model call)
  ├── simple        ──▶ RAG pipeline, Flash-class   (~80%)
  └── investigative ──▶ agent, bounded              (~20%)
```

**This is usually the single largest cost lever in the system** — larger than model tier, caching, or context reduction, because it removes entire request paths rather than making them cheaper.

## 4. Practical Example

**The arithmetic:**

```
50,000 requests/day

ALL AGENTIC
  50,000 × $0.045 = $2,250/day

ROUTED 80/20
  40,000 × $0.007 = $280
  10,000 × $0.045 = $450
                    ─────
                    $730/day

~68% reduction. And the 80% that changed path got FASTER
(2s vs 15s) and MORE RELIABLE (deterministic vs a
multi-step probabilistic path).

Three improvements from one decision, which is why it
outranks every other optimization.
```

**The classifier's error asymmetry, which shapes the design:**

```
MISCLASSIFY UP    a simple question goes to the agent
                  → costs more, still correct

MISCLASSIFY DOWN  a multi-hop question goes to the simple
                  path
                  → produces the general rule: true, cited,
                    passes every metric, and doesn't answer
                    the question

The errors are not symmetric, so the classifier should bias
toward escalation. Over-escalating costs money; under-
escalating costs correctness, silently.
```

**Signals that indicate escalation:**

```
· possessives tied to a general rule — "my fee", "do I
  qualify"          ← the highest-signal marker in banking
· comparisons — "how does X compare to Y"
· conditional phrasing — "if", "eligible", "qualify"
· multiple question marks or conjunctions
· a rule referenced without its parameters

The possessive marker is the one worth building around:
it converts a general policy question into one needing
account-specific facts, which is a hop.
```

**Implementing the classifier:** a small model with constrained enum output, or a trained classifier on labelled production queries. Either way it's cheap enough to be negligible against what it saves — and it should be measured like any other component, with a confusion matrix showing which categories are confused.

## 5. Why It Matters

- **The largest single cost lever** — it removes request paths rather than shrinking them.
- **It improves latency and reliability simultaneously** — three wins from one decision.
- **The error asymmetry** means the classifier should bias toward escalation.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No classifier** | All traffic pays the expensive path |
| **Biasing toward the cheap path** | Silent correctness failures |
| **Classifier on an expensive tier** | Undermines the saving |
| **Classification accuracy unmeasured** | No visibility into misrouting |
| **Binary routing only** | No middle path for partly-complex queries |
| **Scope declines counted as failures** | Out-of-scope handling looks like a problem |

**On measuring the classifier:** it needs its own labelled evaluation with a confusion matrix, because misrouting is invisible in end-to-end metrics — a downward misroute produces a plausible answer that passes groundedness. Tracking the escalation rate and sampling routed-simple cases for correctness is what surfaces it.

**On a middle path:** some queries are multi-part but not multi-hop — two independent sub-questions, each answerable with one retrieval. Those don't need the full agent; parallel retrieval plus one generation serves them. Adding that tier captures requests that would otherwise be over-escalated, and it's cheap to implement once the classifier exists.

## 7. Interview Answer

> "Model routing classifies each request and sends it down the cheapest path that can handle it — typically a deterministic pipeline for most traffic and an agent for the minority that needs one.
>
> This is usually the single largest cost lever in the system, larger than model tier or caching, because it removes entire request paths rather than making them cheaper.
>
> The arithmetic: fifty thousand requests a day all going through an agentic path at four and a half cents each is two thousand two hundred and fifty dollars daily. Routed eighty-twenty, it's two hundred and eighty plus four hundred and fifty — about seven hundred and thirty. Roughly a sixty-eight percent reduction.
>
> And the eighty percent that changed path got faster — two seconds instead of fifteen — and more reliable, because a deterministic pipeline beats a multi-step probabilistic path. Three improvements from one decision, which is why it outranks every other optimization.
>
> The design point is the classifier's error asymmetry. Misclassifying up sends a simple question to the agent — costs more, still correct. Misclassifying down sends a multi-hop question to the simple path, which produces the general rule: true, cited, passing every metric, and not answering the question. Those errors aren't symmetric, so the classifier should bias toward escalation. Over-escalating costs money; under-escalating costs correctness, silently.
>
> For signals, the highest-value marker in banking is the possessive. 'What's the fee' is simple; 'what's *my* fee' or 'do *I* qualify' needs account-specific facts, which is a hop. Beyond that: comparisons, conditional phrasing like eligible or qualify, multiple conjunctions, and a rule referenced without its parameters.
>
> The classifier itself should be a small model with constrained enum output, or a trained classifier on labelled production queries — cheap enough to be negligible against what it saves.
>
> Two things I'd add. It needs its own labelled evaluation with a confusion matrix, because misrouting is invisible in end-to-end metrics — a downward misroute produces a plausible answer that passes groundedness. Tracking escalation rate and sampling routed-simple cases for correctness is what surfaces it.
>
> And I'd build a middle path. Some queries are multi-part but not multi-hop — two independent sub-questions, each answerable with one retrieval. Those don't need the full agent; parallel retrieval plus one generation serves them. That captures requests which would otherwise be over-escalated, and it's cheap once the classifier exists."

## 8. Likely Follow-ups

**Q: Why is routing the biggest lever?**
Because it removes entire request paths rather than making them cheaper. An eighty-twenty split is roughly sixty-eight percent off, and the rerouted majority also gets faster and more reliable — three improvements from one architectural decision.

**Q: Which misclassification is worse?**
Downward. A multi-hop question on the simple path produces the general rule — true, cited, passing every metric, and not answering the question. Upward misclassification just costs more. So the classifier should bias toward escalation.

**Q: What signals escalation?**
Possessives tied to a general rule — "my fee", "do I qualify" — which is the highest-signal marker in banking because it converts a policy question into one needing account facts. Also comparisons, conditional phrasing, multiple conjunctions, and rules referenced without parameters.

**Q: How do you measure the classifier?**
With its own labelled evaluation and a confusion matrix, because misrouting is invisible in end-to-end metrics — a downward misroute produces a plausible answer that passes groundedness. Escalation rate and sampled correctness on routed-simple cases surface it.

**Q: Should routing be binary?**
No — a middle path helps. Some queries are multi-part but not multi-hop: two independent sub-questions each answerable with one retrieval. Parallel retrieval plus one generation serves them, capturing requests that would otherwise be over-escalated.

## 9. Common Mistakes

- No classifier, so all traffic pays the expensive path.
- Biasing the classifier toward the cheap path.
- Running the classifier on an expensive model tier.
- No labelled evaluation of classification accuracy.
- Binary routing with no middle tier.

## 10. What to Remember

- **The largest cost lever** — it removes paths rather than shrinking them.
- **~68% reduction at 80/20**, plus faster and more reliable for the majority.
- **Bias toward escalation** — the errors aren't symmetric.
- **Possessives are the highest-signal marker** in banking.
- **Measure the classifier separately** — misrouting hides in end-to-end metrics.
