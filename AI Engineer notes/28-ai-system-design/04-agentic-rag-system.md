# Design: Agentic RAG System

> **Phase 28 · AI SYSTEM DESIGN · Topic 04**

## 1. Definition

A RAG system where the model decides whether, what, and how many times to retrieve — designed as an escalation path from a deterministic pipeline rather than as the default.

## 2. Simple Explanation

Standard RAG retrieves once and generates. Agentic RAG can retrieve several times, each query informed by the last.

That capability is necessary for multi-hop questions and expensive for everything else — so the design is mostly about deciding which requests need it.

## 3. How It Works

```
CLASSIFY
  ├── simple lookup (~80%) ──▶ retrieve once → generate
  └── multi-part / multi-hop / investigative
        ▼
     PLAN ─── decompose; mark dependencies
        ▼
     PARALLEL for independent sub-queries
     SEQUENTIAL for dependent ones (multi-hop)
        ▼
     GRADE ── enough? new information? budget left?
        ├── no  → reformulate (capped at 2) or abstain
        └── yes → merge, rerank against ORIGINAL question
        ▼
     REASON → VERIFY → answer or abstain
```

**The classifier is the architecture.** Everything else is a consequence of which path a request takes.

## 4. Practical Example

**Why multi-hop needs it, structurally:**

```
"Do I qualify for the waiver on pre-2020 accounts?"

Round 1 retrieves the waiver criteria → discovers they
depend on tier, opening date, and waivers used this month.

Round 2 can now look those up. Those queries were
UNKNOWABLE before round 1, because the system didn't know
which facts mattered until it read the policy.

No single retrieval can close that gap — the account
opening date record shares no semantic content with a
question about waivers.
```

**Cost and the routing decision:**

```
                  Fixed pipeline   Agentic
LLM calls               1           3-8
p95 latency           ~2s          ~15s
cost per query      ~$0.007      ~$0.045
determinism          high          low
audit               fixed path   per-request trace

~6× cost. At 50k queries/day:
  all agentic  ≈ $2,250/day
  80/20 split  ≈ $730/day

That's the routing decision, and it's worth more than any
other optimization in the system.
```

**The stopping conditions, all three needed:**

```
SUCCESS      the model can answer
BUDGET       rounds, tokens, or wall clock
EXHAUSTION   the round returned nothing new — measured as
             chunk-ID overlap with what's already retrieved

Exhaustion is the one that's skipped and it's a set
comparison. It stops a round earlier than the budget would,
every time.
```

**Merging correctly:** deduplicate by chunk ID, rerank against the *original* question rather than the sub-query, and preserve per-sub-question coverage rather than taking a global top-k. A global top-k can fill the context with chunks answering one sub-question while the others go unaddressed — and the context looks full, so nothing signals it.

## 5. Why It Matters

- **The classifier is the architecture** — it determines cost, latency, and auditability.
- **Multi-hop is structurally unreachable** by single or parallel retrieval.
- **Coverage loss on merge** is the characteristic failure and it's silent.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Agentic as the default** | ~6× cost for the 80% that don't need it |
| **Misclassifying downward** | Confident partial answer passing every metric |
| **Global top-k after merge** | Sub-question coverage lost |
| **Reranking against the sub-query** | Optimizes for the wrong target |
| **No exhaustion check** | Rounds that add nothing still cost |
| **Unbounded reformulation** | Expensive loop ending in a weak answer |

**On misclassification direction:** routing a multi-hop question to the simple path produces a confident partial answer — the general rule, true and cited — that passes every grounding metric. Routing a simple question to the agentic path just costs more. So the classifier should bias toward escalation, because the errors aren't symmetric.

**On auditability:** the fixed pipeline lets you state exactly which documents informed any answer. The agentic path varies, so the audit record must capture every retrieval performed with its query and results, per request. That's achievable but has to be designed in — it's not something you can reconstruct later.

## 7. Interview Answer

> "Agentic RAG lets the model decide whether, what, and how many times to retrieve. I'd design it as an escalation path from a deterministic pipeline rather than as the default, because the capability is necessary for multi-hop questions and expensive for everything else.
>
> So the classifier is the architecture. Roughly eighty percent of banking traffic is simple lookups that retrieve once and generate. The remainder — multi-part, comparative, or investigative — goes to the agentic path.
>
> That routing decision is worth more than any other optimization. An agentic path is about six times the cost of a single RAG call and takes fifteen seconds instead of two. At fifty thousand queries a day, all-agentic is around two thousand two hundred dollars daily versus seven hundred and thirty for an eighty-twenty split.
>
> Where the agentic path is genuinely necessary is multi-hop. Someone asks 'do I qualify for the waiver on pre-2020 accounts.' Round one retrieves the criteria and discovers they depend on tier, opening date, and waivers used this month. Round two can now look those up — but those queries were unknowable before round one, because the system didn't know which facts mattered until it read the policy. No single retrieval closes that gap, since an account opening date record shares no semantic content with a question about waivers.
>
> Inside the agentic path: plan with dependencies marked, run independent sub-queries in parallel and dependent ones sequentially, grade after each round, and stop on success, budget, or exhaustion.
>
> Exhaustion is the condition that gets skipped and it's just a set comparison — if this round's chunk IDs overlap heavily with what's already retrieved, further rounds won't help. It stops a round earlier than the budget would, every time.
>
> On merging, three things: deduplicate by chunk ID, rerank against the original question rather than the sub-query, and preserve per-sub-question coverage rather than taking a global top-k. That last one is the characteristic failure — a global top-k can fill the context with chunks answering one sub-question while the others go unaddressed, and the context looks full so nothing signals it. The model then answers a third of what was asked, confidently.
>
> On the classifier, I'd bias toward escalation, because the errors aren't symmetric. Routing a multi-hop question to the simple path produces a confident partial answer — the general rule, true and cited — that passes every grounding metric. Routing a simple question to the agentic path just costs more.
>
> And auditability needs designing in. The fixed pipeline lets me state exactly which documents informed an answer; the agentic path varies, so the record has to capture every retrieval with its query and results per request. That can't be reconstructed afterwards."

## 8. Likely Follow-ups

**Q: Why not make it agentic by default?**
About six times the cost and seven times the latency for the eighty percent of requests that don't need it, plus non-determinism and a weaker audit path. The routing decision is worth more than any other optimization in the system.

**Q: What can't single-shot retrieval do?**
Multi-hop. If the criteria have to be retrieved before you know that tier and opening date matter, no single query can reach those records — they share no semantic content with the original question. It's structural, not a tuning problem.

**Q: What are the stopping conditions?**
Success, budget, and exhaustion. Exhaustion — this round's chunk IDs overlapping heavily with what's already retrieved — is the one usually skipped, and it's just a set comparison that stops a round earlier than the budget would every time.

**Q: What's the characteristic failure?**
Coverage loss on merge. A global top-k after combining sub-query results can fill the context with chunks answering one sub-question while the others go unaddressed — and the context looks full, so the model confidently answers a third of what was asked.

**Q: Which classification error is worse?**
Downward. A multi-hop question on the simple path yields a confident partial answer — true, cited, passing every metric — while an upward error just costs more. So the classifier should bias toward escalation, because the errors aren't symmetric.

## 9. Common Mistakes

- Making agentic RAG the default path.
- Taking a global top-k after merging sub-query results.
- Reranking against sub-queries rather than the original question.
- No exhaustion check, so rounds run to the budget.
- Not designing per-request retrieval audit into the agentic path.

## 10. What to Remember

- **The classifier is the architecture** — ~6× cost difference between paths.
- **Multi-hop is structurally unreachable** by single or parallel retrieval.
- **Stop on success, budget, or exhaustion** — exhaustion is a set comparison.
- **Preserve per-sub-question coverage** on merge; rerank against the original.
- **Bias the classifier toward escalation** — the errors aren't symmetric.
