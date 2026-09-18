# Enterprise Agent Architecture

> **Phase 21 · GOOGLE ADK · Topic 19**

## 1. Definition

The complete shape of an agent system in a regulated enterprise — routing, identity, bounded execution, tool-level authorization, human approval, verification, and audit — with ADK components filling specific roles within it.

## 2. Simple Explanation

Enterprise agent architecture is mostly about containment: making sure most work doesn't reach the agent, and that what does can't cause harm.

The framework fills roles inside that structure. It doesn't provide the structure.

## 3. How It Works

```
request
  ▼
AUTHENTICATE ── identity → session state (immutable)
  ▼
CLASSIFY ────── LlmAgent, smallest tier
  ├── simple (≈80%) ──▶ DETERMINISTIC PIPELINE
  │                     retrieve → grade → generate → verify
  └── complex (≈20%) ─▶ AGENT
                        ParallelAgent gather (deterministic)
                        LlmAgent reason
                        before_tool: scope, authz, provenance,
                                     budget, audit
                        after_tool: truncate, record facts
  ▼
VERIFY ──────── per-claim grounding, zero tolerance on numbers
  ▼
consequential action? ──yes──▶ HUMAN APPROVAL (evidence in state)
  ▼
answer + citations  │  or ABSTAIN → handoff

throughout: trace ID, cost accounting, audit log
```

## 4. Practical Example

**The decisions that define it, with reasons:**

```
1. IDENTITY IMMUTABLE IN SESSION STATE
   Set at authentication, never written by a tool. Every
   retrieval and tool call scopes on it. A tool that could
   write it would let injection redirect data access.

2. CLASSIFY AND ROUTE
   Most traffic is a known shape. Routing it away from the
   agent is ~70% cost reduction with better latency and
   reliability — the highest-value decision in the system.

3. DETERMINISTIC WHERE THE STEPS ARE KNOWN
   ParallelAgent for independent lookups: one round trip,
   predictable, no model deciding.

4. EVERY CONTROL AT before_tool
   Scope, authorization as the end user, provenance,
   budget, audit — one function, every tool, reviewable in
   one place.

5. VERIFY ON BOTH PATHS
   The simple path hallucinates too. Grounding is an
   answer-level control, not an agent feature.

6. ABSTENTION AS A FIRST-CLASS OUTCOME
   Reached by rule, producing a handoff. Prevents loops and
   confident wrong answers.

7. READ-ONLY BY DEFAULT
   Write tools added individually, each justified, each
   behind approval.
```

**Point 5 is commonly misplaced** — teams verify inside the agent branch and leave the deterministic path unverified, assuming a simple pipeline can't hallucinate. It can; the model still generates.

**Build order:**

```
1. deterministic pipeline + verification   serves most traffic
2. evaluation and golden set               nothing after is
                                           measurable without it
3. observability                           before the agent
4. agent, read-only tools only
5. approval + write tools                  once read-only is proven

Agent-first with controls retrofitted doesn't converge.
```

## 5. Why It Matters

- **Containment is the architecture** — most work never reaches the agent.
- **Verification belongs on both paths**, which is commonly missed.
- **Build order matters** — evaluation and observability before the agent.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No classifier** | All traffic pays agent cost and variance |
| **Misclassifying downward** | Confident partial answers that pass metrics |
| **Verification only on the agent path** | Simple-path hallucinations unchecked |
| **Per-agent budgets** | Total unbounded in a nested tree |
| **Write tools before proven reliability** | Consequential actions on an unmeasured system |
| **Mutable identity** | Injection could redirect data access |

**On misclassification direction:** routing a multi-hop question to the simple path produces a confident partial answer that passes every grounding metric — true, cited, and not what was asked. Routing a simple question to the agent just costs more. So the classifier should bias toward escalation when uncertain.

**On what makes it defensible:** the agent handles a minority of traffic with read-only user-scoped tools, cannot take irreversible action without human approval, abstains rather than guessing, and produces a per-step audit trail. The non-determinism is real, acknowledged, and confined to where its consequences are acceptable.

## 7. Interview Answer

> "Enterprise agent architecture is mostly about containment — making sure most work doesn't reach the agent, and that what does can't cause harm. The framework fills roles inside that structure; it doesn't provide the structure.
>
> The shape: authenticate first, writing identity into session state as immutable — every retrieval and tool call scopes on it, and a tool that could write it would let a prompt injection redirect whose data is accessed. Then classify. Roughly eighty percent of banking assistant traffic is a known shape and goes through a deterministic pipeline: retrieve, grade, generate, verify. The remainder enters the agent.
>
> That routing decision is the highest-value one in the system — around seventy percent cost reduction with better latency and reliability, and it shrinks the surface where non-determinism can cause problems.
>
> Inside the agent, I'd use a ParallelAgent for independent lookups because that's one round trip, predictable, with no model deciding. And every control goes at the before-tool callback: argument scope, authorization as the authenticated end user, identifier provenance, budget, and audit. One function, every tool, reviewable in one place — which for a regulated system is worth as much as the code saving.
>
> Both paths converge on verification. That's the part commonly misplaced: teams verify inside the agent branch and leave the deterministic path unverified, assuming a simple pipeline can't hallucinate. It can — the model still generates. Grounding is an answer-level control, not an agent feature.
>
> Then consequential actions go through human approval with the evidence in state, and abstention is a first-class outcome reached by rule, producing a handoff rather than an error.
>
> On the classifier, I'd bias toward escalation when uncertain. Misclassifying downward — a multi-hop question sent to the simple path — produces a confident partial answer that passes every grounding metric, because the general rule it retrieved is true and correctly cited. Misclassifying upward just costs more.
>
> Build order: deterministic pipeline with verification first since it serves most traffic, then evaluation and a golden set because nothing afterwards is measurable without them, then observability, then the agent with read-only tools, then approval and write tools once read-only is measurably reliable. Agent-first with controls retrofitted doesn't converge.
>
> What makes the whole thing defensible is that the agent handles a minority of traffic with read-only user-scoped tools, can't take irreversible action without approval, abstains rather than guessing, and produces a per-step audit trail. The non-determinism is real, acknowledged, and confined to where its consequences are acceptable."

## 8. Likely Follow-ups

**Q: What's the highest-value architectural decision?**
Classifying and routing — sending most traffic through a deterministic pipeline and reserving the agent for the minority that needs it. Roughly seventy percent cost reduction, better latency and reliability, and a smaller surface for non-determinism.

**Q: Where does verification belong?**
On both paths. It's commonly added only inside the agent branch on the assumption that a simple pipeline can't hallucinate — but the model still generates on that path and can still produce unsupported claims. Grounding is an answer-level control.

**Q: Which misclassification is worse?**
Downward. A multi-hop question on the simple path yields a confident partial answer that passes grounding metrics, because the general rule retrieved is true and correctly cited. Upward misclassification just costs more, so the classifier should bias toward escalation.

**Q: Where do the controls live?**
At the before-tool callback — argument scope, authorization as the end user, identifier provenance, budget, and audit. One function covering every tool, which is both fewer places to get wrong and a single place a reviewer can verify.

**Q: What build order would you follow?**
Deterministic pipeline with verification, then evaluation and a golden set, then observability, then a read-only agent, then approval and write tools. Building the agent first and retrofitting controls onto something already live doesn't converge.

## 9. Common Mistakes

- No classifier, so all traffic pays agent cost.
- Verification only on the agent path.
- Per-agent budgets in a nested tree.
- Write tools before read-only reliability is measured.
- Identity fields writable by tools.

## 10. What to Remember

- **Containment is the architecture** — the framework fills roles inside it.
- **Route most traffic away from the agent** — the highest-value decision.
- **Verify on both paths**; the simple path hallucinates too.
- **Every control at `before_tool`** — one function, reviewable once.
- **Pipeline → evals → observability → read-only agent → writes.**
