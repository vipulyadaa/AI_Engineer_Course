# Tool Call Optimization

> **Phase 25 · LLM COST OPTIMIZATION · Topic 12**

## 1. Definition

Reducing the number of agent steps and the cost of each — the dominant cost factor in an agentic system, because every step is a full model call with a context that grows.

## 2. Simple Explanation

In an agent, cost isn't linear in steps — it's worse. Each step re-sends everything before it, so step eight costs far more than step one.

Reducing step count therefore saves more than the arithmetic suggests.

## 3. How It Works

```
CONTEXT GROWTH PER STEP

  step 1:   1,500 prompt tokens
  step 3:   5,800
  step 5:  13,000
  step 8:  24,000

Total input across 8 steps ≈ 80,000 tokens, not 12,000.

Removing steps 6-8 saves far more than three-eighths of the
cost, because those were the most expensive ones.
```

**That superlinearity is the point.** Cutting the tail of an agent run is disproportionately valuable.

## 4. Practical Example

**Reducing step count, in order of effect:**

```
1. CONSOLIDATE TOOLS
   get_balance + get_tier + get_transactions
   → get_account_info(fields=[...])
   Three steps become one, and tool selection accuracy
   improves because there are fewer options.

2. PARALLEL TOOL CALLS
   Independent lookups returned in one response and
   executed concurrently → three rounds become one.
   Free latency AND fewer model calls.

3. PLAN WITH DEPENDENCIES
   A plan exposing which steps are independent enables
   the parallelism above.

4. ROUTE AWAY FROM THE AGENT
   The largest saving — most requests shouldn't enter the
   loop at all.
```

**Consolidation is underrated** because it improves two things at once: fewer steps and better tool selection, since accuracy degrades past roughly fifteen to twenty tools.

**Reducing per-step cost:**

```
TRUNCATE TOOL RESULTS at the tool boundary
  A tool returning 30,000 tokens of JSON destroys the run.
  Truncate with the full result retrievable by reference —
  this is the single highest-value per-step control.

DROP OLD REASONING
  Keep tool results; summarize or drop the model's
  reasoning from completed steps. Results are facts,
  reasoning is process.

CHEAPER TIER FOR MECHANICAL STEPS
  Tool selection is not a reasoning task.

CACHE THE PREFIX
  System prompt and tool definitions are identical on
  every step of every run — in an 8-step agent that's the
  same 2,000 tokens sent 8 times.
```

**Prefix caching matters more in agents** than anywhere else, precisely because of that repetition per run.

**Bounding the tail:** a token budget checked each iteration, with the agent instructed to conclude when approaching it, degrades gracefully. A hard cut means paying for every step and returning nothing — the worst outcome available at that point.

## 5. Why It Matters

- **Cost is superlinear in steps** — cutting the tail saves disproportionately.
- **Tool consolidation** reduces steps and improves selection accuracy together.
- **Prefix caching matters most in agents**, because the prefix repeats per step.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unbounded tool results** | One call destroys the run's economics |
| **Many granular tools** | More steps and worse selection |
| **Sequential parallel calls** | Avoidable rounds and latency |
| **Old reasoning retained** | Growing context for no benefit |
| **No prefix caching** | The same tokens re-sent every step |
| **Hard budget cut** | Paid for everything, delivered nothing |

**On loop detection as a cost control:** an agent repeating the same call burns the most expensive steps in the run. Hashing tool plus arguments and injecting "you already tried this — do something different" breaks the cycle several steps before the budget would, and those are exactly the steps that cost the most.

**On measuring:** log tokens and cost per step, not just per run. That shows where the cost concentrates and usually reveals that one or two tools return far more than they need to — which is a bounded, specific fix rather than general optimization.

## 7. Interview Answer

> "In an agent, cost isn't linear in steps — it's worse, because each step re-sends everything before it. Step one might be fifteen hundred prompt tokens and step eight twenty-four thousand, so eight steps is around eighty thousand input tokens rather than twelve thousand.
>
> That superlinearity means cutting the tail of a run is disproportionately valuable — removing steps six to eight saves far more than three-eighths of the cost, because those were the most expensive ones.
>
> For reducing step count: consolidate tools first. Replacing separate balance, tier, and transaction lookups with one get_account_info taking a fields parameter turns three steps into one — and it improves tool selection accuracy at the same time, since accuracy degrades past roughly fifteen to twenty tools. Two benefits from one change, which is why it's underrated.
>
> Then parallel tool calls: independent lookups returned in one response and executed concurrently collapse three rounds into one. That's free latency and fewer model calls together. It requires planning with dependencies so the independence is visible, and it's frequently left unused because the natural implementation loops over calls one at a time.
>
> And the largest saving is routing away from the agent entirely — most requests shouldn't enter the loop at all.
>
> For per-step cost, the highest-value control is truncating tool results at the tool boundary. A tool returning thirty thousand tokens of JSON destroys the run's economics, and no agent-side handling recovers context that's already been spent. Truncate with the full result retrievable by reference.
>
> Then drop old reasoning while keeping tool results — results are facts the agent may still need, reasoning is process that matters less once the step is done. Use a cheaper tier for mechanical steps, since tool selection isn't a reasoning task. And cache the prefix.
>
> Prefix caching matters more in agents than anywhere else, precisely because of the repetition. The system prompt and tool definitions are identical on every step of every run — in an eight-step agent that's the same two thousand tokens sent eight times per run.
>
> Two more. Loop detection is a cost control, not just a reliability one: an agent repeating the same call burns the most expensive steps in the run, and hashing tool plus arguments to inject 'you already tried this' breaks the cycle several steps before the budget would.
>
> And I'd log tokens and cost per step rather than per run. That shows where cost concentrates, and it usually reveals one or two tools returning far more than they need to — which is a specific bounded fix rather than general optimization."

## 8. Likely Follow-ups

**Q: Why isn't agent cost linear in steps?**
Because each step re-sends the entire history, so context grows monotonically. Step eight might be twenty-four thousand prompt tokens against fifteen hundred at step one — which means cutting the tail of a run saves disproportionately more than the step count suggests.

**Q: What reduces step count most?**
Routing away from the agent entirely, then tool consolidation. Merging separate lookups into one call with a fields parameter turns three steps into one and improves selection accuracy simultaneously, since fewer tools means fewer ways to choose wrong.

**Q: What's the highest-value per-step control?**
Truncating tool results at the tool boundary. One call returning thirty thousand tokens destroys the run's economics, and no downstream handling recovers context already spent. Truncate with the full result retrievable by reference.

**Q: Why does prefix caching matter more in agents?**
Because the system prompt and tool definitions are identical on every step of every run. In an eight-step agent that's the same two thousand tokens sent eight times per run, so the repetition is multiplied by step count rather than being once per request.

**Q: Is loop detection a cost control?**
Yes. An agent repeating the same call burns the most expensive steps in the run, so hashing tool plus arguments and injecting a message to change approach breaks the cycle several steps before the budget would — and those late steps are the costly ones.

## 9. Common Mistakes

- Unbounded tool results consuming the context.
- Many granular tools instead of consolidated ones.
- Executing parallel tool calls sequentially.
- No prefix caching in a multi-step agent.
- Hard-terminating at the budget rather than concluding.

## 10. What to Remember

- **Cost is superlinear in steps** — cutting the tail saves most.
- **Consolidate tools** — fewer steps and better selection together.
- **Truncate tool results at the tool** — the highest-value per-step control.
- **Cache the prefix** — repeated every step of every run.
- **Log cost per step**, not per run, to find where it concentrates.
