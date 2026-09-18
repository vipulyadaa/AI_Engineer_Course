# Agents (ADK)

> **Phase 21 · GOOGLE ADK · Topic 03**

## 1. Definition

ADK's agent abstraction — a model, an instruction, and a set of tools — plus workflow agent types that run sub-agents in fixed sequential, parallel, or looping patterns rather than letting the model decide.

## 2. Simple Explanation

An ADK agent is a model with instructions and tools. That's the LLM-driven kind, where the model decides what to do.

ADK also provides workflow agents that run sub-agents in a fixed order. Those aren't model-driven at all — they're deterministic orchestration wearing the agent interface, which is a genuinely useful distinction.

## 3. How It Works

```python
from google.adk.agents import Agent, SequentialAgent, ParallelAgent

fetch = ParallelAgent(name="gather",
                      sub_agents=[tier_agent, txn_agent, waiver_agent])

pipeline = SequentialAgent(
    name="fee_investigation",
    sub_agents=[fetch, reconcile_agent, verify_agent],
)
```

| Type | Control flow |
|---|---|
| **LlmAgent / Agent** | The model decides |
| **SequentialAgent** | Fixed order, deterministic |
| **ParallelAgent** | Concurrent, deterministic |
| **LoopAgent** | Repeats until a condition, deterministic |

## 4. Practical Example

**Why the workflow agents matter:**

```
They let you express deterministic structure using the same
abstraction as model-driven behaviour — so a system can be
mostly deterministic with model decisions only where needed.

  ParallelAgent gathering three independent facts
  → concurrent, predictable, no model call to decide

  SequentialAgent for a known pipeline
  → the steps are code, not a model's choice

  LlmAgent only where the path genuinely depends on what
  was found

That mix is exactly the architecture I'd want in banking:
deterministic where the steps are known, model-driven where
they aren't.
```

**That's the substantive point** — ADK makes the deterministic option a first-class citizen rather than something you drop out of the framework to do.

**The parallel agent is a concrete latency win:**

```
Fetching tier, transaction, and waiver count sequentially
is three round trips. A ParallelAgent makes it one.

No model call decides that — the parallelism is declared,
so it's both faster and predictable.
```

**Instruction design for an LlmAgent:**

```
· state the grounding rule: use only retrieved context
· state the abstention rule: say so if the context doesn't
  answer it
· state the prohibitions: no financial advice, no
  guarantees, no figures not in context
· name tools and when to use each, including what NOT to
  use them for

The instruction is a prompt and behaves like one — tool
disambiguation belongs in the tool descriptions, but the
overall policy belongs here.
```

## 5. Why It Matters

- **Workflow agents make determinism first-class**, which is the right default for most steps.
- **ParallelAgent is a declared latency win** with no model call to decide it.
- **The mix — deterministic structure, model decisions where needed** — is the target architecture.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **LlmAgent where a workflow agent fits** | Cost and non-determinism for nothing |
| **Too many tools on one agent** | Selection degrades past ~15–20 |
| **Vague instructions** | Inconsistent behaviour |
| **Deep agent nesting** | Hard to follow and to bound |
| **No budget across sub-agents** | Per-agent limits multiply |
| **Sub-agent failures unhandled** | One failure ends the run |

**On nesting and budgets:** a sequential agent containing parallel agents containing LLM agents multiplies the potential call count quickly. The budget has to be tracked across the whole tree rather than per agent, and the nesting depth kept shallow enough that someone can read the structure and predict what it does.

**On choosing the agent type:** the test is whether the steps depend on intermediate results. If they don't, a workflow agent is correct — it's cheaper, faster, deterministic, and testable. Reaching for an LlmAgent because it's the more capable option is how systems become expensive and unpredictable for no gain.

## 7. Interview Answer

> "An ADK agent is a model, an instruction, and a set of tools — that's the LLM-driven kind where the model decides what to do. But ADK also provides workflow agents: Sequential, Parallel, and Loop, which run sub-agents in a fixed pattern with no model deciding anything.
>
> That distinction is the part I'd emphasize, because it makes determinism a first-class citizen rather than something you drop out of the framework to do. A ParallelAgent gathering tier, transaction, and waiver count is concurrent and predictable with no model call to decide the parallelism — three round trips become one. A SequentialAgent expresses a known pipeline as code. And an LlmAgent is used only where the path genuinely depends on what was found.
>
> That mix is exactly the architecture I'd want in banking: deterministic where the steps are known, model-driven where they aren't. The test for which to use is whether the steps depend on intermediate results — if they don't, a workflow agent is correct because it's cheaper, faster, deterministic, and testable. Reaching for an LlmAgent because it's the more capable option is how systems become expensive and unpredictable for no gain.
>
> For instruction design on an LlmAgent, I'd state the grounding rule — use only retrieved context — the abstention rule, the prohibitions on financial advice and guarantees and figures not in context, and which tools to use when. Tool disambiguation belongs in the tool descriptions, but overall policy belongs in the instruction.
>
> Two things I'd manage. Tool count — selection accuracy degrades past roughly fifteen to twenty, so beyond that I'd split by domain or consolidate related operations.
>
> And nesting with budgets. A sequential agent containing parallel agents containing LLM agents multiplies the potential call count quickly, so the budget has to be tracked across the whole tree rather than per agent. And I'd keep the nesting shallow enough that someone can read the structure and predict what it does — a deeply nested agent tree is as hard to reason about as deeply nested code."

## 8. Likely Follow-ups

**Q: What agent types does ADK provide?**
LlmAgent, where the model decides control flow, plus Sequential, Parallel, and Loop workflow agents that run sub-agents in fixed patterns deterministically. The workflow types are what let a system be mostly deterministic with model decisions only where needed.

**Q: When would you use a workflow agent?**
Whenever the steps don't depend on intermediate results. A known pipeline is a SequentialAgent; three independent lookups are a ParallelAgent. Those are cheaper, faster, deterministic, and testable, and reaching for an LlmAgent instead buys non-determinism for nothing.

**Q: What's the benefit of ParallelAgent?**
Declared concurrency. Three independent lookups become one round trip instead of three, and no model call decides the parallelism — so it's both faster and predictable. It's a latency win that's structural rather than dependent on the model choosing well.

**Q: What goes in the instruction?**
Overall policy — the grounding rule, the abstention rule, prohibitions on financial advice, guarantees, and unsupported figures, and which tools apply when. Tool disambiguation belongs in the tool descriptions; the instruction carries the behavioural contract.

**Q: How do you bound a nested agent tree?**
Budget across the whole tree rather than per agent, since nesting multiplies the potential call count quickly. And keep the depth shallow enough that someone can read the structure and predict its behaviour — a deeply nested tree is as hard to reason about as deeply nested code.

## 9. Common Mistakes

- Using an LlmAgent where a workflow agent fits.
- Loading one agent with more than fifteen to twenty tools.
- Per-agent budgets in a nested tree.
- Putting tool disambiguation in the instruction rather than tool descriptions.
- Nesting deeply enough that the structure can't be read.

## 10. What to Remember

- **LlmAgent decides; Sequential, Parallel, and Loop don't.**
- **Workflow agents make determinism first-class** — use them where steps are known.
- **ParallelAgent collapses round trips** with no model call to decide.
- **Instruction carries policy**; tool descriptions carry disambiguation.
- **Budget across the whole tree**, and keep nesting shallow.
