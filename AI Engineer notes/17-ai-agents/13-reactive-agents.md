# Reactive Agents (ReAct)

> **Phase 17 · AI AGENTS · Topic 13**

## 1. Definition

Agents that interleave reasoning and acting one step at a time — think, act, observe, think again — without producing a plan up front. The pattern is known as ReAct.

## 2. Simple Explanation

A reactive agent doesn't decide the whole approach in advance. It looks at the situation, reasons about the immediate next move, does it, sees what happened, and reasons again.

That makes it good at tasks where you genuinely don't know what you'll find, and prone to drifting on tasks with many steps.

## 3. How It Works

```
Thought:      I need the customer's tier to know the correct fee.
Action:       get_customer_tier(customer_id)
Observation:  "Premier"
Thought:      Premier is $25. They were charged $45. Something
              is wrong — check whether a waiver was consumed.
Action:       count_waivers_mtd(customer_id)
Observation:  2
Thought:      Both waivers used, so a fee applies — but $25,
              not $45. The tier was misapplied.
Answer:       ...
```

**Each thought is conditioned on everything observed so far**, which is exactly what makes it adaptive — and exactly what makes context grow.

## 4. Practical Example

**ReAct versus planning, honestly:**

| | ReAct | Planning |
|---|---|---|
| Adapts to surprises | Well | Poorly without re-planning |
| Parallel execution | No — inherently sequential | Yes, with dependencies |
| Token cost | Higher per step (reasoning each time) | Lower per step |
| Goal drift on long tasks | Higher | Lower |
| Good for | Exploration, unknown paths | Known decomposition |

**ReAct's structural limitation is that it cannot parallelize.** Each step depends on the previous observation by construction, so four independent lookups take four sequential rounds. For a latency-sensitive system that's a real cost, and it's the strongest argument for planning when the steps are knowable.

**Where ReAct is clearly right:**

```
· The next action genuinely depends on what was just found
· The task is short — under about four steps
· Exploration is the point, and the path isn't enumerable
· A plan would be guesswork
```

**Preventing drift on longer tasks:**

```
Re-inject the ORIGINAL request verbatim each iteration, not
just at the start.

  System: <instructions>
  User:   <original request>          ← stays verbatim
  ...accumulated history...
  System: "Reminder — the user asked: <original request>.
           Facts established: tier=Premier, charged=$45."

Cheap, and it addresses ReAct's main weakness directly.
```

## 5. Why It Matters

- **It's the default agent pattern** and the baseline everything else is compared to.
- **It cannot parallelize by construction**, which is the real trade against planning.
- **Goal drift on long tasks** is its characteristic failure, with a cheap mitigation.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Inherently sequential** | No parallel execution, ever |
| **Goal drift** | The original task buried under accumulated context |
| **Token cost** | Reasoning regenerated at every step |
| **Loops** | Can repeat the same action without progress |
| **No global view** | Can't see that two steps were redundant |

**On loops:** a reactive agent has no plan to check progress against, so it can call the same tool repeatedly with slightly different arguments and never notice. Hashing (tool, arguments) and injecting "you already did this and got X" is the cheap fix, and it matters more for ReAct than for planning agents precisely because there's no plan to measure against.

**On the hybrid:** plan-and-solve — produce a rough plan, execute reactively within it, re-plan when something contradicts — gets most of both. The plan anchors the goal and exposes obvious parallelism; the reactive execution adapts. That's usually what I'd actually build rather than either pure form.

## 7. Interview Answer

> "ReAct interleaves reasoning and acting one step at a time — think, act, observe, think again — with no plan up front. Each thought is conditioned on everything observed so far, which is what makes it adaptive.
>
> It's the right choice when the next action genuinely depends on what was just found, when the task is short — under about four steps — or when exploration is the point and a plan would be guesswork.
>
> Its structural limitation is that it can't parallelize, by construction. Every step depends on the previous observation, so four independent lookups take four sequential rounds. For a latency-sensitive system that's a real cost, and it's the strongest argument for planning whenever the steps are knowable in advance.
>
> Its characteristic failure is goal drift. On a long task the original request gets buried under accumulated reasoning and tool results, and the agent starts optimizing for something adjacent to what was asked. The mitigation is cheap: re-inject the original request verbatim each iteration, along with a compact list of established facts, rather than only at the start. That addresses the main weakness directly for almost no cost.
>
> Loops are the other issue, and they matter more for ReAct than for planning agents specifically because there's no plan to check progress against. The agent can call the same tool repeatedly with slightly varied arguments and never notice. Hashing tool plus arguments and injecting 'you already did this and got X' is a few lines and breaks it.
>
> What I'd actually build is usually the hybrid — plan-and-solve. Produce a rough plan, execute reactively within it, re-plan when something contradicts it. The plan anchors the goal and exposes obvious parallelism; reactive execution handles the surprises. That gets most of both rather than committing to either pure form."

## 8. Likely Follow-ups

**Q: What is ReAct?**
Interleaved reasoning and acting — the agent thinks about the immediate next step, acts, observes the result, and thinks again, with no plan produced in advance. Each decision is conditioned on everything seen so far, which makes it adaptive to whatever it encounters.

**Q: What's ReAct's main limitation?**
It can't parallelize. Every step depends on the previous observation by construction, so independent lookups run sequentially even when nothing forces that order. For latency-sensitive systems that's the strongest reason to plan instead when the steps are knowable.

**Q: What's goal drift and how do you prevent it?**
On long tasks the original request gets buried under accumulated reasoning and results, and the agent starts pursuing something adjacent to what was asked. Re-injecting the original request verbatim each iteration, plus a compact list of established facts, is cheap and addresses it directly.

**Q: When would you use ReAct over planning?**
When the next action genuinely depends on what was just discovered, when the task is short enough that planning is overhead, or when the path isn't enumerable so a plan would be guesswork. For anything with a knowable decomposition, planning wins on latency.

**Q: Which would you build in practice?**
The hybrid — plan-and-solve. A rough plan to anchor the goal and expose obvious parallelism, reactive execution within it to handle surprises, and re-planning when something contradicts the plan. That captures most of both rather than committing to a pure form.

## 9. Common Mistakes

- Using ReAct for long tasks with knowable steps.
- Not re-injecting the original request, allowing drift.
- Omitting loop detection, which ReAct needs more than planning agents.
- Claiming ReAct can parallelize — it can't, structurally.
- Treating ReAct and planning as a binary when the hybrid is usually best.

## 10. What to Remember

- **Think → act → observe → repeat**, with no upfront plan.
- **Inherently sequential** — no parallel execution, ever.
- **Goal drift is the characteristic failure**; re-inject the original request.
- **Needs loop detection** more than planning agents do.
- **Plan-and-solve is usually the right build** — anchor with a plan, execute reactively.
