# Traditional RAG vs Agentic RAG

> **Phase 18 · AGENTIC RAG · Topic 02**

## 1. Definition

Traditional RAG retrieves once on a fixed path and generates. Agentic RAG makes retrieval a decision the model controls, possibly repeated. The comparison is a trade of predictability for the ability to handle questions one retrieval can't answer.

## 2. Simple Explanation

Traditional RAG is a function: query in, answer out, same shape every time.

Agentic RAG is a process: the model retrieves, reads, decides whether that was enough, and may go again. It handles harder questions and costs considerably more to run.

## 3. How It Works

| | Traditional | Agentic |
|---|---|---|
| Retrieval count | Exactly 1 | 0 to N |
| Query used | The user's, possibly rewritten | Model-generated, per step |
| Source selection | Fixed | Model-chosen |
| Sufficiency check | None | Explicit |
| LLM calls | 1 | 2–5 |
| Latency | ~2 s | ~5–15 s |
| Determinism | High | Low |
| Audit | Fixed path | Per-request trace |

**One row is often overlooked:** traditional RAG has no sufficiency check. If retrieval returns nothing useful, it generates anyway — from weak context. Agentic RAG can notice and search differently, which is a genuine quality difference rather than just a capability one.

## 4. Practical Example

**Where traditional RAG structurally fails:**

```
1. MULTI-HOP
   "Does my account tier qualify for the fee waiver that
    applies to accounts opened before 2020?"
   → needs tier, then the waiver rule for that tier, then
     the account opening date. One retrieval gets one of them.

2. COMPARISON
   "How do the wire fees compare between Premier and Standard?"
   → two retrievals, or one that happens to contain both

3. AMBIGUOUS QUERIES
   "What's the charge?" → which charge? Traditional RAG
     retrieves something and answers. Agentic can ask.

4. RETRIEVAL RETURNED NOTHING RELEVANT
   → traditional generates anyway; agentic can reformulate
```

**Where traditional RAG is better:**

```
· Simple factual lookups — most FAQ traffic
· Anything latency-sensitive
· Anything needing a stable audit path
· High-volume, cost-sensitive workloads

Those are not small exceptions. In a banking FAQ system they
are the large majority of requests.
```

**Which means the comparison isn't "which is better":**

```
ROUTER
  ├── simple factual  (80%) ──▶ traditional RAG
  └── multi-part /
      comparative /
      investigative   (20%) ──▶ agentic RAG

Best answer quality where it's needed, traditional economics
everywhere else. And the escalation condition is explicit and
auditable, rather than a model deciding per request.
```

## 5. Why It Matters

- **Multi-hop and comparison** are structural limits of single retrieval, not tuning problems.
- **The missing sufficiency check** in traditional RAG is an under-discussed quality gap.
- **Routing between them** is the answer, and the routing condition should be explicit.

## 6. Trade-offs / Failure Modes

| Approach | Risk |
|---|---|
| **Traditional only** | Multi-hop questions answered wrongly and confidently |
| **Agentic only** | 3–8× cost, variable latency, weaker audit |
| **Routing** | Misrouting — a multi-hop question sent to the simple path |

**On misrouting:** the router becomes the critical component. A multi-hop question routed to traditional RAG produces a confident partial answer, which is worse than a slow correct one. I'd bias the router toward escalation when uncertain — the cost of unnecessary escalation is money, and the cost of failing to escalate is a wrong answer.

**On measuring the difference:** the honest way to justify agentic RAG is measuring both on a golden set split by question type. If agentic wins by two points on simple lookups and twenty on multi-hop, that tells you exactly where to route, and it turns the architecture decision into a measured one rather than an assumed one.

## 7. Interview Answer

> "Traditional RAG retrieves once on a fixed path and generates. Agentic RAG makes retrieval a decision the model controls, possibly repeated. It's a trade of predictability for handling questions one retrieval can't answer.
>
> Where traditional structurally fails is multi-hop. 'Does my tier qualify for the waiver that applies to accounts opened before 2020' needs the tier, then the waiver rule for that tier, then the opening date — one retrieval gets one of them. Same for comparisons across two entities, and for ambiguous queries where the right move is asking rather than guessing. Those aren't tuning problems; a single retrieval can't reach information whose relevance only becomes apparent after the first result.
>
> One difference that gets overlooked: traditional RAG has no sufficiency check. If retrieval returns nothing useful, it generates anyway from weak context. Agentic can notice and search differently. That's a quality difference, not just a capability one.
>
> But where traditional is better isn't a small set of exceptions. Simple factual lookups, latency-sensitive paths, anything needing a stable audit trail, high-volume cost-sensitive traffic — in a banking FAQ system that's the large majority of requests.
>
> So the answer isn't which is better, it's routing: simple factual questions to traditional RAG, multi-part or comparative or investigative ones to the agentic path. That gets the best answer quality where it's needed and traditional economics everywhere else, with an explicit auditable escalation condition rather than a model deciding per request.
>
> That makes the router the critical component. A multi-hop question routed to the simple path produces a confident partial answer, which is worse than a slow correct one — so I'd bias it toward escalating when uncertain, because unnecessary escalation costs money and failing to escalate costs correctness.
>
> And I'd justify the whole design by measuring both on a golden set split by question type. If agentic wins by two points on simple lookups and twenty on multi-hop, that tells me exactly where the routing threshold goes — which turns an architectural assumption into a measured decision."

## 8. Likely Follow-ups

**Q: What can traditional RAG not do?**
Multi-hop questions where the second thing to retrieve only becomes apparent after the first result, comparisons across entities that don't co-occur in one chunk, and ambiguous queries where clarification is the right response. It also generates from weak context rather than noticing retrieval failed.

**Q: When is traditional RAG better?**
Simple factual lookups, latency-sensitive paths, anything needing a stable audit trail, and high-volume cost-sensitive traffic. In a banking FAQ system that's most requests, so it isn't a narrow set of exceptions.

**Q: How would you combine them?**
Route. Simple factual questions through traditional RAG, multi-part comparative or investigative ones through the agentic path. That puts the capability where it's needed with an explicit escalation condition, rather than paying agentic cost on every request.

**Q: What's the risk with routing?**
Misrouting. A multi-hop question sent down the simple path produces a confident partial answer, which is worse than a slower correct one. I'd bias the router toward escalating when uncertain, since over-escalation costs money and under-escalation costs correctness.

**Q: How would you justify the added complexity?**
By measuring both approaches on a golden set split by question type. If agentic wins marginally on simple lookups and substantially on multi-hop, that's the evidence for where the routing threshold belongs — and if it doesn't win anywhere meaningfully, that's evidence not to build it.

## 9. Common Mistakes

- Treating it as a binary choice rather than a routing decision.
- Ignoring that traditional RAG generates even when retrieval failed.
- Building agentic RAG without measuring where it actually wins.
- Biasing the router toward the cheap path when uncertain.
- Underestimating how much banking FAQ traffic is simple lookups.

## 10. What to Remember

- **Traditional: one retrieval, fixed path. Agentic: model-controlled, repeatable.**
- **Multi-hop and comparison are structural limits**, not tuning problems.
- **Traditional has no sufficiency check** — it generates from weak context.
- **Route between them**; bias toward escalation when uncertain.
- **Measure both by question type** to place the threshold.
