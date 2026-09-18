# Planning Agents

> **Phase 17 · AI AGENTS · Topic 12**

## 1. Definition

Agents that generate an explicit plan before acting and then execute it, usually separating the planner from the executor. The structure makes long tasks more coherent and exposes which steps can run in parallel.

## 2. Simple Explanation

A planning agent decides the whole approach first, then works through it. Often the planner and the executor are different calls — sometimes different models — because the two jobs need different things.

Planning benefits from a strong model that reasons well. Execution is mostly mechanical tool calls, which a cheaper model handles fine.

## 3. How It Works

```
PLANNER      strong model, sees the task and tool descriptions
               ↓ produces a structured plan
EXECUTOR     cheaper model, executes one step at a time
               ↓ results accumulate
RE-PLANNER   invoked when a result contradicts the plan
               ↓ revised plan
SYNTHESIZER  produces the final answer from all results
```

**Splitting planner and executor is the practical design point:** a plan is one call to an expensive model; execution might be six calls to a cheap one. Using the same strong model throughout costs several times more for no gain on the mechanical steps.

## 4. Practical Example

**A plan with explicit dependencies:**

```json
{
  "steps": [
    {"id": 1, "tool": "get_customer_tier",   "depends_on": []},
    {"id": 2, "tool": "get_transaction",     "depends_on": []},
    {"id": 3, "tool": "get_fee_schedule",    "depends_on": [1]},
    {"id": 4, "tool": "count_waivers_mtd",   "depends_on": [1]},
    {"id": 5, "tool": "reconcile",           "depends_on": [2,3,4]}
  ]
}
```

```
Steps 1 and 2 run in PARALLEL.
Then 3 and 4 run in PARALLEL.
Then 5.

Three rounds instead of five sequential calls. Asking the
planner for dependencies rather than a flat list is what
makes that possible, and it's a small schema change for a
substantial latency win.
```

**When the plan breaks:**

```
Step 3 returns "no fee schedule exists for tier=Premier on
this product."

RIGID       continue to steps 4 and 5 with missing input →
            a wrong answer built on a gap
RE-PLAN     the planner sees the failure and revises →
            correct, costs one more call
ABORT       escalate to a human → correct, costs a handoff

Re-planning is usually right, WITH a cap — two or three
cycles, then escalate. Uncapped re-planning is an expensive
infinite loop.
```

## 5. Why It Matters

- **Dependency-aware plans enable parallel execution**, which is a real latency reduction.
- **Splitting planner and executor models** cuts cost substantially.
- **Capped re-planning** is what keeps the pattern from becoming an expensive loop.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Upfront planning cost** | An extra strong-model call before any work |
| **Plans made without information** | Steps that turn out wrong or unnecessary |
| **Rigid execution** | Following an invalidated plan to the end |
| **Uncapped re-planning** | Expensive loop with no progress |
| **Over-decomposition** | Ten steps where three would do |
| **Planner unaware of tool limits** | Plans referencing capabilities that don't exist |

**On plan quality:** the planner can only plan around tools it knows about, so the tool descriptions in the planning prompt determine plan quality more than the planning instructions do. A plan that assumes a capability you don't have fails at execution and wastes the whole cycle.

**On over-decomposition:** models asked to plan tend to produce more steps than necessary, because more steps look thorough. Each step is an LLM call and a failure opportunity, so instructing the planner to use the fewest steps that accomplish the task — and to combine steps where one tool call suffices — is worth saying explicitly.

## 7. Interview Answer

> "A planning agent generates an explicit plan before acting and then executes it, usually with the planner and executor as separate calls.
>
> Splitting them is the practical design point. Planning benefits from a strong model that reasons well; execution is mostly mechanical tool calls that a cheaper model handles fine. A plan is one expensive call and execution might be six cheap ones — using the strong model throughout costs several times more for no gain on the mechanical steps.
>
> The thing I'd do that's often missed is ask the planner for dependencies, not a flat list. If the plan says step three depends on step one and step five depends on two, three, and four, then one and two run in parallel, three and four run in parallel, then five — three rounds instead of five sequential calls. That's a small schema change for a substantial latency win, and it's the strongest concrete argument for planning over one-step-at-a-time.
>
> Handling plan failure is where the design matters. If step three comes back saying no fee schedule exists for that tier and product, rigid execution continues to steps four and five with missing input and builds a wrong answer on a gap. Re-planning lets the planner revise with what was learned, which costs one more call and is usually right — but capped at two or three cycles before escalating, because uncapped re-planning is an expensive infinite loop.
>
> Two things that determine whether this works. Plan quality depends on the tool descriptions in the planning prompt more than the planning instructions — a plan assuming a capability you don't have fails at execution and wastes the whole cycle. And models asked to plan tend to over-decompose, because more steps look thorough. Each step is a call and a failure opportunity, so I'd explicitly instruct the planner to use the fewest steps that accomplish the task and combine where one tool call suffices."

## 8. Likely Follow-ups

**Q: Why separate the planner and executor?**
Because the jobs need different things. Planning benefits from a strong reasoning model; execution is mechanical tool calls a cheaper model handles fine. One expensive planning call plus several cheap execution calls costs far less than using the strong model throughout, with no quality loss on the mechanical steps.

**Q: What's the main benefit of an explicit plan?**
Dependency structure, which enables parallel execution. Asking the planner for dependencies rather than a flat list means independent steps run concurrently — three rounds instead of five sequential calls. That's a measurable latency reduction, not just better organization.

**Q: What happens when a step fails?**
Ideally re-planning: the planner sees the failure and revises with what was learned. Rigid execution would continue with missing input and build a wrong answer on a gap. Re-planning needs a cap of two or three cycles before escalating, otherwise it's an expensive loop.

**Q: What determines plan quality?**
Tool descriptions more than planning instructions. The planner can only plan around capabilities it knows about and understands, so a vague description produces plans referencing things the system can't do — which fail at execution and waste the entire cycle.

**Q: What's the over-decomposition problem?**
Models asked to plan produce more steps than necessary because thoroughness looks like more steps. Every step is an LLM call and a failure opportunity, so the planner should be explicitly instructed to use the fewest steps that accomplish the task and merge steps a single tool call can cover.

## 9. Common Mistakes

- Using the same strong model for planning and mechanical execution.
- Producing flat plans without dependency information.
- Executing rigidly after a step invalidates the plan.
- Re-planning without a cycle cap.
- Blaming the planning prompt when tool descriptions are the real problem.

## 10. What to Remember

- **Separate planner and executor** — strong model plans, cheap model executes.
- **Ask for dependencies, not a flat list** — that's what enables parallelism.
- **Re-plan on contradiction, capped at 2–3 cycles**, then escalate.
- **Tool descriptions determine plan quality** more than planning instructions.
- **Instruct against over-decomposition** — each step is a call and a risk.
