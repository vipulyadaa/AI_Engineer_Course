# What Is Agentic RAG?

> **Phase 18 · AGENTIC RAG · Topic 01**

## 1. Definition

RAG where the model decides *whether*, *what*, and *how many times* to retrieve — instead of a fixed pipeline that always retrieves once before generating.

## 2. Simple Explanation

Standard RAG always does the same thing: embed the query, retrieve top-k, generate. Every request, identically.

Agentic RAG lets the model decide. Maybe it doesn't need retrieval at all. Maybe it needs to search twice because the first result raised a new question. Maybe it should search a different source.

## 3. How It Works

```
STANDARD RAG
  query ──▶ retrieve ──▶ generate ──▶ answer
            (always, once)

AGENTIC RAG
  query ──▶ [ do I need to retrieve? ]
              ├── no  ──▶ answer directly
              └── yes ──▶ [ what query? which source? ]
                            ↓
                          retrieve
                            ↓
                          [ is this sufficient? ]
                            ├── no  ──▶ retrieve again, differently
                            └── yes ──▶ generate
```

**Four decisions become the model's:** whether to retrieve, what to search for, which source, and whether the result is sufficient.

## 4. Practical Example

**Where each one matters:**

```
"Thanks, that's helpful!"
  → standard RAG retrieves anyway, wasting a call and
    possibly polluting the context
  → agentic: no retrieval needed

"What's the fee for an international transfer, and does it
 differ for Premier customers?"
  → standard RAG: one query, likely retrieves the general
    fee schedule and misses the tier-specific clause
  → agentic: two retrievals, one per sub-question

"Why was I charged $45?"
  → standard RAG retrieves fee documentation and answers
    generically
  → agentic: retrieves the policy, sees the rate should be
    $25 for this tier, retrieves the waiver rules, reconciles
```

**The honest cost:**

```
                  Standard RAG    Agentic RAG
LLM calls              1            2-5
Latency              ~2 s          ~5-15 s
Determinism          High          Low
Cost                  1×           3-8×
Auditability      Fixed path    Varies per request

For a banking FAQ system where most questions are
straightforward lookups, the standard pipeline handles the
large majority correctly at a fraction of the cost.
```

**So the design I'd actually propose is routing:** classify the query, send simple factual lookups through the fixed pipeline, and escalate multi-part, comparative, or investigative questions to the agentic path. That captures the capability where it's needed without paying for it everywhere.

## 5. Why It Matters

- **It handles multi-hop and comparative questions** that a single retrieval structurally can't.
- **It avoids retrieving when retrieval isn't needed**, which is a real quality improvement, not just a saving.
- **The routing hybrid** is what makes it affordable and auditable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **3–8× cost** | Multiple LLM calls per request |
| **Higher, variable latency** | Sequential retrieval rounds |
| **Non-deterministic** | Same question, different retrievals |
| **Harder to audit** | The retrieval path varies |
| **Over-retrieval** | Searching repeatedly without new information |
| **Under-retrieval** | Deciding it knows when it doesn't |

**On under-retrieval — the dangerous one:** if the model decides it doesn't need to retrieve and answers from parametric knowledge, the answer isn't grounded in your corpus. In banking that's exactly the failure the system exists to prevent. So in a regulated context I'd bias the decision heavily toward retrieving, or restrict "no retrieval" to a narrow, verified set of cases — conversational acknowledgements, clarifying questions — rather than leaving it to the model's judgment.

**On auditability:** a fixed pipeline lets you state exactly which documents informed any answer. An agentic path varies, so the audit record has to capture every retrieval performed with its query and results, per request. That's achievable but it has to be designed in.

## 7. Interview Answer

> "Agentic RAG lets the model decide whether to retrieve, what to search for, which source, and whether what came back is sufficient — instead of a fixed pipeline that always retrieves once before generating.
>
> Where it genuinely helps: a question like 'what's the international transfer fee, and does it differ for Premier customers' is two sub-questions, and one retrieval typically gets the general fee schedule and misses the tier-specific clause. An agentic system retrieves for each part. Similarly 'why was I charged forty-five dollars' needs the policy, then the tier, then the waiver rules — each retrieval informed by the last, which a single-shot pipeline structurally cannot do.
>
> The cost is real: three to eight times, five to fifteen seconds instead of two, non-deterministic, and harder to audit because the retrieval path varies per request.
>
> So what I'd actually propose is routing. Classify the query, send simple factual lookups through the fixed pipeline, and escalate multi-part, comparative, or investigative questions to the agentic path. For a banking FAQ system most questions are straightforward lookups, so that captures the capability where it's needed without paying for it everywhere.
>
> The failure I'd be most careful about is under-retrieval. If the model decides it doesn't need to retrieve and answers from parametric knowledge, the answer isn't grounded in our corpus — which is exactly the failure the whole system exists to prevent. So in a regulated context I'd bias that decision heavily toward retrieving, or restrict 'no retrieval' to a narrow verified set of cases like conversational acknowledgements and clarifying questions, rather than leaving it to the model's judgment.
>
> And on audit: a fixed pipeline lets me state exactly which documents informed an answer. An agentic path varies, so the record has to capture every retrieval with its query and results per request. That's achievable, but it has to be designed in rather than added when someone asks."

## 8. Likely Follow-ups

**Q: What does agentic RAG add?**
Four decisions the model makes rather than the pipeline: whether to retrieve, what query to use, which source, and whether the results suffice. That enables multi-hop questions, per-sub-question retrieval, and skipping retrieval when it isn't needed.

**Q: What does it cost?**
Three to eight times a standard pipeline, five to fifteen seconds instead of around two, non-determinism, and a retrieval path that varies per request. Those are real enough that the capability has to be needed rather than merely available.

**Q: What's the dangerous failure mode?**
Under-retrieval — the model deciding it already knows and answering from parametric knowledge, so the answer isn't grounded in the corpus. In banking that's the exact failure the system exists to prevent, so I'd restrict no-retrieval to a narrow verified set of cases rather than leaving it to judgment.

**Q: How would you deploy it in a bank?**
As an escalation path, not the default. Route simple factual lookups through the fixed pipeline and send multi-part, comparative, or investigative questions to the agentic path. Most FAQ traffic is simple lookups, so the hybrid keeps cost and auditability manageable.

**Q: How do you keep it auditable?**
By capturing every retrieval performed for a request — the query used, the source, and the chunks returned — alongside the final answer and its citations. A fixed pipeline gets that almost for free; an agentic path needs it designed in because the path varies.

## 9. Common Mistakes

- Making agentic RAG the default rather than an escalation path.
- Letting the model freely decide not to retrieve in a grounded system.
- Ignoring the auditability gap versus a fixed pipeline.
- Not measuring whether the extra retrievals actually improve answers.
- Underestimating the latency impact of sequential retrieval rounds.

## 10. What to Remember

- **The model decides whether, what, which source, and whether it's enough.**
- **Genuinely better for multi-hop and comparative questions.**
- **3–8× cost, higher latency, non-deterministic, harder to audit.**
- **Under-retrieval is the dangerous failure** — restrict no-retrieval narrowly.
- **Deploy it as an escalation path**, not the default.
