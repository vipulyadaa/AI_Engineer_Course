# Orchestration (ADK)

> **Phase 21 · GOOGLE ADK · Topic 09**

## 1. Definition

How work is coordinated in an ADK system — deterministic workflow agents for known structure, LLM-driven agents where the path depends on intermediate results, and agent-as-tool delegation between them.

## 2. Simple Explanation

Orchestration is deciding what runs when, and who decides.

ADK's useful property is that both options are first-class: you can express a fixed pipeline or a model-driven loop with the same abstraction, and mix them freely.

## 3. How It Works

```
DETERMINISTIC
  SequentialAgent   fixed order
  ParallelAgent     concurrent
  LoopAgent         repeat until a condition

MODEL-DRIVEN
  LlmAgent          the model chooses tools and ordering
  agent-as-tool     the model chooses which sub-agent

The choice per step: do the steps depend on intermediate
results?
  no  → deterministic
  yes → model-driven
```

## 4. Practical Example

**A banking orchestration that mixes both:**

```
SequentialAgent "handle_query"
  ├─ classify_agent          LlmAgent, smallest tier
  │     → simple | investigative
  ├─ ParallelAgent "gather"  deterministic, concurrent
  │     ├─ retrieve_policy
  │     ├─ fetch_tier
  │     └─ fetch_transaction
  ├─ reason_agent            LlmAgent, only for investigative
  └─ verify_agent            deterministic check

Classification is model-driven because it has to interpret
the question. Gathering is deterministic and parallel
because the three lookups are independent and known.
Reasoning is model-driven. Verification is deterministic.

Four steps, two of them with no model deciding anything.
```

**That mix is the target**, and it's the concrete answer to "how would you orchestrate this."

**The parallel gather is a real win:**

```
Three lookups sequentially is three round trips. A
ParallelAgent makes it one — declared in the structure, not
dependent on the model choosing to batch its calls.

That's faster AND predictable, which is a rare combination.
```

**Agent-as-tool for delegation:**

```
Exposing a specialist agent as a tool means the parent's
model chooses when to delegate, from a declared set. The
set of possible delegations is fixed, which keeps the
system's behaviour enumerable.

The cost is the same as any handoff — the sub-agent sees
only what it's passed. So the delegation call needs the
task plus the relevant verified facts, which requires the
parent to maintain explicit state.
```

**Budgets across the tree:** a sequential agent containing parallel agents containing LLM agents multiplies the potential call count. The budget belongs in shared state and is decremented across the whole tree, checked before each model call — per-agent limits don't bound the total.

## 5. Why It Matters

- **Both deterministic and model-driven are first-class**, so the mix is natural.
- **ParallelAgent is faster and predictable** — declared rather than model-dependent.
- **Budgets must span the tree**, since nesting multiplies call counts.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **LlmAgent where deterministic fits** | Cost and variance for nothing |
| **Deep nesting** | Hard to read and to bound |
| **Per-agent budgets** | Total unbounded |
| **Delegation without context** | Sub-agent guesses |
| **Sub-agent failures unhandled** | One failure ends the run |
| **Structure not readable** | Nobody can predict behaviour |

**On readability:** the orchestration structure is documentation. If someone can read the agent tree and predict what happens for a given request, the design is right. If they have to trace through several layers of delegation to work it out, it's too deep — and that matters more in a regulated system, where a reviewer who isn't the author needs to understand it.

**On failure handling in a sequential agent:** if a sub-agent fails, the default is usually that the sequence stops. For a gather step where one of three lookups failed, that's wrong — the right behaviour is each sub-agent handling its own failure and returning a status, so the downstream step sees a gap and can produce a partial answer or abstain.

## 7. Interview Answer

> "ADK makes both deterministic and model-driven orchestration first-class, so you can mix them with the same abstraction. The choice per step is whether the steps depend on intermediate results — if they don't, deterministic; if they do, model-driven.
>
> A concrete banking shape: a SequentialAgent containing a classification agent, then a ParallelAgent gathering facts, then a reasoning agent, then a verification step. Classification is model-driven because it has to interpret the question. Gathering is deterministic and parallel because the three lookups — policy retrieval, tier, transaction — are independent and known. Reasoning is model-driven. Verification is deterministic. So four steps, two of them with no model deciding anything.
>
> That mix is the target. The parallel gather in particular is a real win — three lookups sequentially is three round trips, and a ParallelAgent makes it one. And it's declared in the structure rather than dependent on the model choosing to batch its calls, so it's faster and predictable, which is a rare combination.
>
> For delegation, exposing a specialist agent as a tool means the parent's model chooses when to delegate from a declared set — so the set of possible delegations is fixed and the system's behaviour stays enumerable. The cost is the same as any handoff: the sub-agent sees only what it's passed, so the delegation call needs the task plus the relevant verified facts, which requires the parent to maintain explicit state rather than relying on conversation history.
>
> Two things I'd get right. Budgets have to span the whole tree — a sequential agent containing parallel agents containing LLM agents multiplies the potential call count quickly, so the budget lives in shared state and is decremented across everything, checked before each model call. Per-agent limits don't bound the total.
>
> And readability. The orchestration structure is documentation — if someone can read the agent tree and predict what happens for a given request, the design is right. If they have to trace through several layers of delegation to work it out, it's too deep. That matters more in a regulated system, where a reviewer who isn't the author needs to understand it.
>
> One failure detail: in a sequential agent, a failing sub-agent usually stops the sequence. For a gather step where one of three lookups failed that's wrong — each sub-agent should handle its own failure and return a status, so the downstream step sees the gap and can produce a partial answer or abstain."

## 8. Likely Follow-ups

**Q: How do you decide deterministic versus model-driven?**
Whether the steps depend on intermediate results. Three known independent lookups are a ParallelAgent. A path that changes based on what was found needs an LlmAgent. Using a model where the steps are known buys non-determinism and cost for nothing.

**Q: What's the benefit of ParallelAgent?**
Declared concurrency — three lookups become one round trip rather than three, and it doesn't depend on the model choosing to batch its calls. That makes it both faster and predictable, which most latency optimizations aren't.

**Q: How does agent-as-tool delegation work?**
The parent's model chooses which sub-agent to call from a declared set, so possible delegations stay enumerable. The sub-agent only sees what's passed, so the call needs the task plus relevant verified facts — which requires the parent to maintain explicit state.

**Q: How do you bound a nested agent tree?**
A budget in shared state, decremented across the whole tree and checked before each model call. Nesting multiplies potential call counts — a sequential agent containing parallel agents containing LLM agents — so per-agent limits leave the total unbounded.

**Q: What if a sub-agent fails?**
Each sub-agent should handle its own failure and return a status rather than propagating. In a parallel gather where one of three lookups failed, stopping the sequence is wrong — the downstream step should see the gap and produce a partial answer or abstain.

## 9. Common Mistakes

- Using an LlmAgent where the steps are known in advance.
- Budgeting per agent in a nested tree.
- Delegating without passing the facts the sub-agent needs.
- Nesting deeply enough that behaviour can't be predicted from the structure.
- Letting one failing sub-agent stop the whole sequence.

## 10. What to Remember

- **Deterministic and model-driven are both first-class** — mix them per step.
- **ParallelAgent is faster and predictable** — declared, not model-dependent.
- **Delegation passes task plus verified facts**, requiring explicit state.
- **Budget across the whole tree**, not per agent.
- **The structure is documentation** — keep it readable by a non-author.
