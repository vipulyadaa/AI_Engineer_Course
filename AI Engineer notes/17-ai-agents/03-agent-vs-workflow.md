# Agent vs Workflow

> **Phase 17 · AI AGENTS · Topic 03**

## 1. Definition

A workflow has steps defined in code, possibly with LLM calls inside them. An agent has steps chosen by the model at runtime. The choice is an engineering trade-off between capability and predictability.

## 2. Simple Explanation

A workflow is a recipe. An agent is a cook who decides what to do next based on how things are going.

Recipes are repeatable, testable, and cheap. Cooks handle situations the recipe didn't anticipate. Most tasks are recipes, and the skill is recognizing which ones aren't.

## 3. How It Works

**Workflows can still be sophisticated** — the distinction isn't complexity:

```
SEQUENTIAL    A → B → C
CONDITIONAL   A → (B if x else C) → D          ← still a workflow
PARALLEL      A → (B ‖ C) → merge → D
LOOPING       A → B → (repeat B until done)    ← still a workflow

All of these have paths WRITTEN IN CODE. Even a loop with an
LLM-evaluated exit condition is a workflow, because the loop
structure is fixed.

An agent differs because the SET OF POSSIBLE PATHS isn't
enumerated in advance.
```

## 4. Practical Example

**The decision, as a checklist:**

```
USE A WORKFLOW WHEN
  · the steps are known in advance
  · the same input should produce the same path
  · you need to test, audit, or explain the execution
  · latency or cost matters
  · failures must be handled at specific, known points

USE AN AGENT WHEN
  · the number of steps depends on what's discovered
  · the task decomposition varies per request
  · the tool set is large and selection is genuinely contextual
  · exploration is the point
```

**A concrete pair:**

```
WORKFLOW — "summarize this policy document"
  parse → chunk → summarize each → combine
  Always these steps. An agent here adds cost and variance
  for nothing.

AGENT — "investigate why this customer's fee was wrong"
  Could need 2 lookups or 8, depending on where the
  discrepancy is. Not enumerable in advance.
```

**The banking-specific consideration:**

```
Auditability often decides it outright.

If a regulator can ask "why did the system do X for this
customer", a workflow answers with a fixed, documented path.
An agent answers with a trace that differs per request and
was chosen by a model.

That's not disqualifying, but it raises the bar substantially,
and it's usually why customer-facing banking systems lean
toward workflows with narrow agentic escalation rather than
general agents.
```

## 5. Why It Matters

- **It's the most consequential architecture decision** in an LLM system.
- **Workflows can be complex** — conditionals and loops don't make something an agent.
- **Auditability often settles it** in regulated environments.

## 6. Trade-offs / Failure Modes

| | Workflow | Agent |
|---|---|---|
| Determinism | High | Low |
| Cost | Predictable | Variable, higher |
| Latency | Predictable | Variable, higher |
| Testability | Straightforward | Hard |
| Auditability | Fixed path | Per-request trace |
| Handles the unanticipated | No | Yes |

**On the failure that actually happens:** teams build an agent, find it unreliable, and add constraints — a forced first step, a restricted tool set, a required order — until it's a workflow with extra latency. Recognizing that trajectory early and just writing the workflow saves months.

**On the hybrid:** the strongest production pattern is a workflow with one agentic step, not an agent throughout. For instance a fixed retrieve-and-answer pipeline whose failure branch — retrieval found nothing relevant — escalates to an agent that can reformulate, search different sources, and decide whether to hand off. Predictable on the common path, capable on the exceptions.

## 7. Interview Answer

> "A workflow has steps defined in code; an agent has steps chosen by the model at runtime. It's a trade-off between capability and predictability.
>
> One clarification I'd make: workflows can be sophisticated. Conditionals, parallel branches, loops with LLM-evaluated exit conditions — all of those are still workflows, because the paths are written in code. What makes something an agent is that the set of possible paths isn't enumerated in advance.
>
> The decision checklist: workflow when the steps are known, the same input should take the same path, you need to test or audit the execution, or cost and latency matter. Agent when the number of steps depends on what's discovered, the decomposition varies per request, or the tool set is large enough that selection is genuinely contextual.
>
> Concretely — 'summarize this policy document' is a workflow: parse, chunk, summarize, combine, always the same. 'Investigate why this customer's fee was wrong' is an agent: it might need two lookups or eight depending on where the discrepancy is, and that isn't enumerable in advance.
>
> In banking, auditability often decides it outright. If a regulator asks why the system did something for a specific customer, a workflow answers with a fixed documented path; an agent answers with a trace that differs per request and was chosen by a model. That's not disqualifying but it raises the bar a lot, which is why customer-facing banking systems tend toward workflows with narrow agentic escalation rather than general agents.
>
> The failure I'd warn about is a pattern I've seen described repeatedly: teams build an agent, find it unreliable, and add constraints — a forced first step, a restricted tool set, a required order — until it's a workflow with extra latency. Recognizing that trajectory early and just writing the workflow saves months.
>
> So the strongest production pattern is a workflow with one agentic step. A fixed retrieve-and-answer pipeline whose failure branch — retrieval found nothing relevant — escalates to an agent that can reformulate, try other sources, and decide whether to hand off. Predictable on the common path, capable on the exceptions."

## 8. Likely Follow-ups

**Q: Does a conditional or a loop make something an agent?**
No. Conditionals, parallel branches, and loops with LLM-evaluated exit conditions are all still workflows, because the possible paths are written in code. An agent is distinguished by the set of paths not being enumerated in advance, not by structural complexity.

**Q: How do you decide between them?**
Workflow when the steps are known, determinism matters, or you need to audit and test the path. Agent when the number of steps depends on what's discovered and the decomposition genuinely varies per request. If you can draw the flowchart, write the flowchart.

**Q: Why does banking lean toward workflows?**
Auditability. A regulator asking why the system did something for a particular customer gets a fixed, documented path from a workflow, and a model-chosen per-request trace from an agent. That raises the bar for agents substantially in customer-facing contexts.

**Q: What's the common failure pattern?**
Building an agent, finding it unreliable, and adding constraints — forced first steps, restricted tools, required ordering — until it's effectively a workflow with extra latency and cost. Spotting that trajectory early and writing the workflow directly saves a lot of time.

**Q: What's the best production pattern?**
A workflow with one agentic step rather than an agent throughout. For example a fixed retrieval-and-answer pipeline that escalates to an agent only when retrieval finds nothing relevant. You get predictable economics on the common path and agent capability precisely where it's needed.

## 9. Common Mistakes

- Thinking loops or conditionals make a system an agent.
- Choosing an agent because it sounds more capable.
- Ignoring auditability requirements in regulated contexts.
- Constraining an agent into a workflow instead of writing one.
- Building agents end-to-end rather than as an escalation branch.

## 10. What to Remember

- **Workflow: steps in code. Agent: steps chosen at runtime.**
- **Complexity doesn't make a workflow an agent** — enumerable paths do.
- **If you can draw the flowchart, write the flowchart.**
- **Auditability often decides it** in regulated environments.
- **The best pattern is a workflow with one agentic escalation branch.**
