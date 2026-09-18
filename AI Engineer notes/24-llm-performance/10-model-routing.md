# Model Routing (Performance)

> **Phase 24 · LLM PERFORMANCE · Topic 10**

## 1. Definition

Directing each request to the path that can answer it fastest — typically a deterministic pipeline for most traffic and an agent for the minority requiring multi-step work.

> The cost angle is in [25-llm-cost-optimization/08](../25-llm-cost-optimization/08-model-routing.md). This topic is the latency effect.

## 2. Simple Explanation

An agent takes fifteen seconds. A single retrieval and generation takes two.

If eighty percent of traffic goes down the two-second path instead of the fifteen-second one, the p50 improves by more than any other change available.

## 3. How It Works

```
                      p50 LATENCY
deterministic path      ~2 s
agentic path           ~15 s

ALL AGENTIC     p50 ≈ 15 s
ROUTED 80/20    p50 ≈ 2 s,  p95 ≈ 15 s

The p50 improvement is enormous. The p95 is unchanged,
because the slow path is still slow for the requests that
need it.
```

**Routing moves the distribution rather than compressing it.** Most users get a fast answer; the minority with complex questions still wait — and that's the correct outcome, because those questions genuinely require more work.

## 4. Practical Example

**The classifier's own latency:**

```
The classifier sits in front of every request, so its
latency is added to all of them.

  small model, enum output    ~150-300 ms
  trained classifier          ~5-20 ms

That difference matters. A 300 ms classifier in front of a
2-second path is 15% overhead on the fast majority.

So a trained classifier on labelled production queries is
better here for latency as well as cost — and once you
have a few thousand labelled examples it's usually more
accurate too, being fit to your query distribution.
```

**That's the performance-specific argument** for a trained classifier over a small model, and it's different from the cost argument.

**A middle tier reduces over-escalation latency:**

```
Some queries are multi-part but not multi-hop — two
independent sub-questions, each answerable with one
retrieval.

Routing those to the full agent means 15 seconds for
something that parallel retrieval plus one generation
handles in ~3.

So a middle tier captures requests that would otherwise
wait 15 seconds unnecessarily. Worth adding once the
classifier exists, and it's cheap at that point.
```

**Misclassification's latency asymmetry:**

```
UP    a simple question routed to the agent
      → 15 s instead of 2. Slow, still correct.

DOWN  a multi-hop question routed to the simple path
      → 2 s and a wrong answer.

So for LATENCY, downward misclassification looks better —
which is exactly why the decision must be made on
correctness rather than latency. The fast wrong answer is
the failure mode, and optimizing the classifier for speed
would select for it.
```

## 5. Why It Matters

- **Routing moves the p50 more than any other change** — most users get the fast path.
- **The classifier's own latency** is added to every request, so it must be fast.
- **A fast wrong answer is the failure mode** — never tune the classifier on latency.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No routing** | Every request pays the slow path |
| **Slow classifier** | Overhead on the fast majority |
| **Binary routing only** | Multi-part queries over-escalated |
| **Classifier tuned for latency** | Selects for fast wrong answers |
| **p95 expected to improve** | The slow path is still slow |
| **Classification accuracy unmeasured** | Misrouting invisible |

**On what routing doesn't fix:** the p95 stays roughly where the agentic path sits, because complex questions genuinely take longer. Presenting routing as a p95 improvement is inaccurate — it's a p50 improvement and a distribution change. If the p95 is the problem, the fix is bounding the agent path itself: fewer steps, parallel tool calls, tighter budgets.

**On the fast path staying fast:** once most traffic is on the deterministic path, that path's latency becomes the headline number. So optimization effort should follow it there — streaming, context reduction, embedding caching — rather than continuing to work on the agentic path that now serves a minority.

## 7. Interview Answer

> "An agent takes around fifteen seconds; a single retrieval and generation takes two. So routing eighty percent of traffic to the fast path improves the p50 more than any other change available.
>
> But it's worth being precise about what it does: it moves the distribution rather than compressing it. The p50 drops from fifteen seconds to two, and the p95 stays around fifteen — because the slow path is still slow for the requests that genuinely need it. That's the correct outcome, and presenting routing as a p95 improvement would be inaccurate. If the p95 is the problem, the fix is bounding the agent path itself — fewer steps, parallel tool calls, tighter budgets.
>
> The performance-specific design point is the classifier's own latency, because it sits in front of every request. A small model with enum output is maybe a hundred and fifty to three hundred milliseconds; a trained classifier is five to twenty. That difference matters — three hundred milliseconds in front of a two-second path is fifteen percent overhead on the fast majority.
>
> So a trained classifier on labelled production queries is better here for latency as well as cost, and once you have a few thousand labelled examples it's usually more accurate too, being fit to your actual query distribution rather than general-purpose.
>
> I'd also add a middle tier. Some queries are multi-part but not multi-hop — two independent sub-questions each answerable with one retrieval. Routing those to the full agent means fifteen seconds for something parallel retrieval plus one generation handles in about three. That captures requests which would otherwise wait unnecessarily, and it's cheap to add once the classifier exists.
>
> One thing I'd be careful about: the latency asymmetry runs the wrong way. Misclassifying up sends a simple question to the agent — fifteen seconds instead of two, slow but correct. Misclassifying down sends a multi-hop question to the simple path — two seconds and a wrong answer. So downward misclassification looks better on latency, which is exactly why the classifier must be tuned on correctness. Optimizing it for speed would select for fast wrong answers.
>
> And once most traffic is on the deterministic path, that path's latency becomes the headline number — so optimization effort should follow it there. Streaming, context reduction, embedding caching. Continuing to work on the agentic path that now serves a minority is optimizing for the p95 when the p50 is what most users experience."

## 8. Likely Follow-ups

**Q: How much does routing improve latency?**
The p50 enormously — from around fifteen seconds to two if eighty percent goes to the deterministic path. The p95 barely moves, because the slow path is still slow for the requests that need it. It moves the distribution rather than compressing it.

**Q: Why does the classifier's latency matter?**
Because it's added to every request, including the fast majority. A three-hundred-millisecond classifier in front of a two-second path is fifteen percent overhead, which is why a trained classifier at five to twenty milliseconds is better here than a small model.

**Q: Should routing be binary?**
No. Multi-part but not multi-hop queries — two independent sub-questions — get fifteen seconds when parallel retrieval plus one generation would take three. A middle tier captures those, and it's cheap to add once the classifier exists.

**Q: Which misclassification is better for latency?**
Downward, which is exactly the problem. Routing a multi-hop question to the simple path gives a fast wrong answer, while routing up gives a slow correct one. So the classifier must be tuned on correctness — optimizing it for latency selects for the failure mode.

**Q: Where should optimization go after routing?**
The deterministic path, because it now serves most traffic and its latency is the headline number. Streaming, context reduction, embedding caching. Continuing on the agentic path optimizes the p95 while the p50 is what most users experience.

## 9. Common Mistakes

- No routing, so every request pays the slow path.
- A slow classifier adding overhead to the fast majority.
- Binary routing with no middle tier.
- Tuning the classifier for latency rather than correctness.
- Expecting routing to improve the p95.

## 10. What to Remember

- **Routing moves the p50**, not the p95 — it changes the distribution.
- **The classifier's latency hits every request** — a trained one is faster.
- **Add a middle tier** for multi-part but not multi-hop queries.
- **Tune the classifier on correctness** — latency selects for fast wrong answers.
- **Optimize the fast path afterwards** — it's what most users experience.
