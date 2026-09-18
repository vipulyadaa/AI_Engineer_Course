# "How Would You Make It Production Ready?"

> **Phase 16 · LANGGRAPH · Topic 22**
>
> ⚠️ **An answer framework.** This one is forward-looking, so it's the
> safest of the personal-experience questions — you're describing what
> you'd do, not claiming what you did. Be clear about which parts you
> already built and which you'd add.

## 1. Definition

An open design question testing breadth. The interviewer wants to know whether you think about security, cost, evaluation, and operations — not just whether the graph produces good answers.

## 2. Simple Explanation

"Production ready" means someone else can operate it, a regulator can audit it, and it fails in ways you've decided on in advance.

The answer should cover more than quality. Most candidates describe accuracy improvements and stop, which leaves the most differentiating ground untouched.

## 3. How It Works

**Six areas, roughly in order of what gets missed:**

```
1. SECURITY      identity propagation, tool authorization,
                 pre-filtering, injection containment
2. EVALUATION    golden set, offline CI gate, online monitoring
3. OBSERVABILITY step-level traces, termination reasons, alerts
4. COST          budgets, routing, caching, cost per query type
5. RELIABILITY   graceful degradation, abstention, idempotency
6. GOVERNANCE    audit trail, prompt versioning, human approval
```

**Leading with security rather than accuracy** is what signals the right instincts for a banking role.

## 4. Practical Example

**The specifics worth naming in each area:**

```
SECURITY
  · user and tenant immutable in state, set at entry
  · every retrieval pre-filters on them in the engine, not
    after
  · tools execute as the authenticated user, never a service
    account
  · retrieved content framed as reference material, with
    tool-level limits as the actual defence
  · checkpoint store encrypted, access-controlled

EVALUATION
  · golden set built from real queries, not invented ones
  · recall@k, groundedness, answer correctness, abstention
    accuracy — measured per question type
  · a CI gate blocking deploys that regress
  · online: abstention rate, retrieval score distribution,
    escalation rate

OBSERVABILITY
  · step-level traces with run ID, prompt version, model
    version, retrieval summary
  · termination reason on every run — answered, abstained,
    budget, failed
  · alerts on abstention rate, p95 latency, handled failures

COST
  · classify and route: most traffic through the
    deterministic path
  · one budget in state across sub-graphs
  · prompt caching on the fixed prefix
  · cost tracked per query type, because a few types
    usually dominate

RELIABILITY
  · failures as state, never exceptions
  · abstention as a declared terminal node
  · idempotency keys on side-effecting nodes
  · state schema versioned for in-flight checkpoints

GOVERNANCE
  · every tool call audited: who, what, when, allowed
  · prompts versioned, version recorded in traces
  · human approval on irreversible actions, with the
    evidence in state
  · retention and erasure covering checkpoints, traces, and
    session stores
```

**The sequencing answer, if asked what first:**

```
1. Evaluation and observability — before any improvement,
   because nothing else is measurable without them
2. Security — identity, authorization, pre-filtering
3. Reliability — degradation and abstention paths
4. Cost — routing and budgets
5. Governance — audit and approval

Improving quality before you can measure it is the common
mistake, and it's unfalsifiable.
```

## 5. Why It Matters

- **Breadth is what's being tested** — quality alone is the expected answer.
- **Leading with security** signals the right instincts for banking.
- **Evaluation and observability first** is the sequencing that holds up.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Only accuracy improvements | Misses five of six areas |
| Generic "add monitoring" | No specifics |
| Security as an afterthought | Wrong instinct for the domain |
| No sequencing | Sounds like a checklist, not a plan |
| Claiming it's already all done | Not credible, and easily probed |

**On honesty:** this question invites overclaiming. Saying "we had evaluation and tracing; I'd add the human approval flow and per-query-type cost tracking next" is stronger than implying everything was in place. It's a forward-looking question, so describing gaps is the expected shape of the answer.

**On picking depth:** naming all six areas briefly and then going deep on one — ideally security or evaluation — is better than covering all six shallowly. The breadth shows you know the landscape; the depth shows you've actually done it.

## 7. Interview Answer

> "I'd cover six areas, and I'd lead with security rather than accuracy because that's where the constraints are in banking.
>
> Security: user and tenant IDs immutable in state, set at entry, with every retrieval pre-filtering on them inside the engine rather than after — post-filtering both leaks and silently under-retrieves. Tools executing as the authenticated user, never a service account, so the agent can't become a privilege escalation path. Retrieved content framed as reference material, with tool-level limits as the actual defence, since prompt-level framing isn't sufficient on its own.
>
> Evaluation: a golden set built from real queries rather than invented ones, measuring recall, groundedness, answer correctness, and abstention accuracy per question type. A CI gate blocking deploys that regress. And online monitoring of abstention rate, retrieval score distribution, and escalation rate.
>
> Observability: step-level traces with run ID, prompt version, model version, and a retrieval summary. A termination reason on every run — answered, abstained, budget exhausted, failed — because that single field partitions your failures immediately. And alerts on abstention rate, p95 latency, and failures the graph handled.
>
> Cost: classify and route so most traffic goes through the deterministic path, which is typically a seventy percent reduction. One budget in state across sub-graphs rather than per-graph limits that multiply. Prompt caching on the fixed prefix. And cost tracked per query type, because a few types usually dominate.
>
> Reliability: failures as state rather than exceptions, abstention as a declared terminal node, idempotency keys on side-effecting nodes since resume and retry both re-run them, and a versioned state schema so in-flight checkpoints survive a deploy.
>
> Governance: every tool call audited with who, what, when, and whether it was allowed. Prompts versioned with the version in traces. Human approval on irreversible actions with the evidence in state. And retention and erasure covering checkpoints, traces, and session stores — those are all customer data stores and it's easy to treat them as infrastructure.
>
> On sequencing: evaluation and observability first, because improving quality before you can measure it is unfalsifiable. Then security, reliability, cost, governance.
>
> [**Be explicit about which of these you had and which you'd add.** It's a forward-looking question, so naming gaps is the expected shape — and it's much stronger than implying everything was already in place.]"

## 8. Likely Follow-ups

**Q: What would you do first?**
Evaluation and observability. Without a golden set and step-level traces, every subsequent improvement is unfalsifiable — you can't tell whether a change helped, and you can't diagnose a failure you can't reproduce. Improving quality before measuring it is the common sequencing mistake.

**Q: What's the biggest security concern?**
Tools running with service-account rather than end-user permissions, which turns the agent into a privilege escalation path. Close behind is post-filtering instead of pre-filtering retrieval, which both leaks and silently under-retrieves for the legitimate user.

**Q: What's the biggest cost lever?**
Routing — classifying requests and sending the majority through a deterministic pipeline rather than the agent. That's typically around a seventy percent reduction and it improves latency and reliability simultaneously, which no amount of prompt or index tuning matches.

**Q: What's most often forgotten?**
That checkpoints, traces, and session stores are customer data stores. They need encryption, access control, retention limits, and a deletion path reaching every checkpoint, not just current state. It's easy to classify them as framework infrastructure and miss entirely.

**Q: Which of these did you have?**
[Your honest answer. This is a forward-looking question, so naming what existed and what you'd add next is the expected shape — and far more credible than implying complete coverage.]

## 9. Common Mistakes

- Answering only about accuracy improvements.
- Generic recommendations with no specifics.
- Treating security as a later hardening step.
- No sequencing — a list rather than a plan.
- Implying everything was already in place.

## 10. What to Remember

- **Six areas:** security, evaluation, observability, cost, reliability, governance.
- **Lead with security** — it signals the right instincts for banking.
- **Evaluation and observability first**; quality work before them is unfalsifiable.
- **Name specifics**, then go deep on one area rather than shallow on all.
- **Say what you had and what you'd add** — it's a forward-looking question.
