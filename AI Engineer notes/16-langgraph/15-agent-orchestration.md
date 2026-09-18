# Agent Orchestration

> **Phase 16 · LANGGRAPH · Topic 15**

## 1. Definition

The overall structure that coordinates retrieval, reasoning, tools, verification, and escalation into one governed flow — routing simple requests deterministically and reserving agentic behaviour for cases that need it.

## 2. Simple Explanation

Orchestration is the shape of the whole system, not one feature of it.

The decision that defines it is how much traffic goes through the deterministic path and how much through the agentic one — because that choice sets cost, latency, reliability, and auditability together.

## 3. How It Works

```
entry ──▶ authenticate ──▶ classify
                             │
            ┌────────────────┴───────────────┐
            ▼                                ▼
     SIMPLE (deterministic)           COMPLEX (agentic)
     retrieve → grade → generate      plan → retrieve ⇄ tools
            │                              → reason → verify
            ▼                                ▼
         verify ────────┬───────────────────┘
                        ▼
              approve? ──yes──▶ interrupt → human → resume
                        │no
                        ▼
                 answer + citations   │   abstain → handoff
```

**Classification is the highest-leverage node.** It determines the cost, latency, and reliability profile of every request downstream.

## 4. Practical Example

**The orchestration decisions, with reasons:**

```
1. AUTHENTICATE FIRST, into immutable state
   user_id and tenant_id set at entry, never node-writable.
   Every retrieval and tool call filters on them.

2. CLASSIFY AND ROUTE
   Most banking FAQ traffic is simple lookups. Sending those
   through a deterministic path is cheaper, faster, more
   reliable, and auditable.

3. VERIFY BEFORE ANSWERING — on both paths
   The grounding check is not an agentic feature; it applies
   to every answer.

4. INTERRUPT ON CONSEQUENTIAL ACTIONS
   Irreversible or money-moving actions reach a human, with
   the evidence in state.

5. ABSTENTION AS A DECLARED TERMINAL NODE
   Not an error path — a legitimate outcome, reached by rule.

6. ONE BUDGET IN STATE
   Steps, tokens, and wall clock, decremented across
   sub-graphs and checked by routing functions.
```

**Point 2 is the one that determines the system's economics** — it's the difference between paying agentic cost on every request and paying it on the minority that need it.

**Point 3 is worth stating because it's often misplaced:** teams add verification inside the agentic branch and leave the simple path unverified, on the assumption that a simple path can't hallucinate. It can — the model still generates.

**Build order:**

```
1. deterministic path + verification   — serves most traffic
2. evaluation and golden set           — nothing is measurable without it
3. observability and tracing           — before the agent, not after
4. agentic branch, read-only tools
5. interrupts + write tools            — only once read-only is proven

Building the agent first and adding governance afterwards
means retrofitting controls onto something already live.
```

## 5. Why It Matters

- **Classification sets cost, latency, and reliability** for every request.
- **Verification belongs on both paths**, not only the agentic one.
- **Build order matters** — deterministic path, evals, observability, then the agent.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No classifier** | All traffic pays agentic cost and variance |
| **Misclassification downward** | A multi-hop question gets a partial answer |
| **Verification only on the agentic path** | Simple-path hallucinations unchecked |
| **Per-branch budgets** | Total cost unbounded |
| **Identity writable by nodes** | Injection could change whose data is used |
| **Agent built before evals** | No baseline to measure governance against |

**On misclassification:** routing a multi-hop question to the simple path produces a confident partial answer that passes every grounding metric. That's worse than routing a simple question to the agentic path, which just costs more. So the classifier should be biased toward escalation when uncertain — over-escalation costs money, under-escalation costs correctness.

**On what makes this defensible:** most traffic on a deterministic path, the agentic branch bounded and read-only by default, irreversible actions gated by human approval with evidence, abstention as a first-class outcome, and a per-step audit trail. The non-determinism is real and confined to where its consequences are acceptable.

## 7. Interview Answer

> "Orchestration is the shape of the whole system, and the decision that defines it is how much traffic goes through a deterministic path versus an agentic one — because that single choice sets cost, latency, reliability, and auditability together.
>
> The flow I'd build: authenticate first, writing user and tenant into immutable state that every retrieval and tool call filters on. Then classify. Most banking FAQ traffic is simple lookups, and sending those through a deterministic retrieve-grade-generate path is cheaper, faster, more reliable, and auditable. The minority that are multi-part, comparative, or investigative go to the agentic branch with planning, iterative retrieval, tools, and reasoning.
>
> Both paths converge on verification before answering. That's worth stating because it's commonly misplaced — teams add a grounding check inside the agentic branch and leave the simple path unverified, assuming a simple path can't hallucinate. It can; the model still generates.
>
> Then consequential actions interrupt for human approval with the evidence already in state, and abstention is a declared terminal node reached by rule — not an error path but a legitimate outcome.
>
> One budget lives in state, covering steps, tokens, and wall clock, decremented across sub-graphs and checked by routing functions. Per-branch budgets multiply and don't bound the total.
>
> The classifier is where I'd be careful. Misclassifying downward — sending a multi-hop question to the simple path — produces a confident partial answer that passes every grounding metric, because the general rule it retrieved is true and correctly cited. That's worse than misclassifying upward, which just costs more. So I'd bias toward escalation when uncertain.
>
> On build order: the deterministic path with verification first, since it serves most traffic; then evaluation and a golden set, because nothing afterwards is measurable without it; then observability; then the agentic branch with read-only tools; then interrupts and write tools once read-only is proven reliable. Building the agent first and adding governance afterwards means retrofitting controls onto something already live, which doesn't converge.
>
> What makes the whole thing defensible is that the non-determinism is real, confined to a minority of traffic, bounded, read-only by default, gated by human approval for anything irreversible, and traced per step."

## 8. Likely Follow-ups

**Q: What's the defining orchestration decision?**
The split between a deterministic path and an agentic one, and where the classifier draws that line. It determines cost, latency, reliability, and auditability simultaneously — every other optimization operates within whatever that choice already committed you to.

**Q: Where does verification belong?**
On both paths. It's commonly added only inside the agentic branch on the assumption that a simple pipeline can't hallucinate, but the model still generates on the simple path and can still produce unsupported claims. Grounding is an answer-level control, not an agent feature.

**Q: Which misclassification is worse?**
Downward. Routing a multi-hop question to the simple path yields a confident partial answer that passes grounding metrics, because the general rule retrieved is true and correctly cited. Routing a simple question upward just costs more, so the classifier should bias toward escalation.

**Q: How do you bound the whole system?**
One budget in shared state — steps, tokens, and wall clock — decremented across sub-graphs and checked by routing functions. Per-branch budgets multiply: a supervisor with ten steps calling sub-graphs with ten each is a hundred executions worst case.

**Q: What order would you build it in?**
Deterministic path with verification, then evaluation and a golden set, then observability, then a read-only agentic branch, then interrupts and write tools. Building the agent first and retrofitting governance onto something already live doesn't converge.

## 9. Common Mistakes

- No classifier, so all traffic pays agentic cost.
- Verification only on the agentic branch.
- Per-branch budgets rather than one global budget.
- Identity fields writable by nodes.
- Building the agent before evaluation and observability exist.

## 10. What to Remember

- **Classification sets the system's economics** — most traffic deterministic.
- **Verify on both paths.** The simple path hallucinates too.
- **Bias the classifier toward escalation** — downward errors are worse.
- **One budget in state**, decremented across sub-graphs.
- **Build order:** pipeline → evals → observability → read-only agent → writes.
