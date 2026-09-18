# Agent Cost Control

> **Phase 17 · AI AGENTS · Topic 28**

## 1. Definition

Bounding what an agent spends per task and in aggregate. Agent cost is variable and can be an order of magnitude above a single LLM call, so it has to be controlled by design rather than observed after the fact.

## 2. Simple Explanation

An LLM call has a predictable cost. An agent might take three steps or fifteen, and context grows at every one — so each step costs more than the last.

That makes cost quadratic-ish in steps rather than linear, which is why agent bills surprise people.

## 3. How It Works

```
Step 1: 1,500 prompt tokens
Step 2: 3,200   (step 1's reasoning + result added)
Step 3: 5,800
Step 4: 9,100
Step 5: 13,000
...

Cost per step RISES because the whole history is re-sent.
Total cost grows faster than linearly in step count.
```

**The controls, roughly by effectiveness:**

```
1. DON'T USE AN AGENT for the common path
2. FEWER STEPS — consolidate tools, plan to merge
3. SMALLER CONTEXT — truncate results, drop old reasoning
4. CHEAPER MODEL for mechanical steps
5. CACHING — prompt caching, and result caching
6. HARD BUDGETS — per task and per user
```

## 4. Practical Example

**A worked estimate, because the numbers matter:**

```
Assume ~$1.25 / 1M input tokens, ~$5 / 1M output.

SINGLE RAG CALL
  4,000 in + 400 out  ≈  $0.0070

AGENT, 6 steps, growing context
  ~45,000 in total + 2,000 out  ≈  $0.067

~10× per request.

At 50,000 requests/day:
  pipeline   ≈ $350/day
  agent      ≈ $3,350/day     → ~$1.2M/year difference
```

**This is why "use an agent" is a budget decision, not only an architecture one** — and why the hybrid matters so much.

**The hybrid, quantified:**

```
80% handled by a fixed pipeline   → 40,000 × $0.007 = $280
20% by the agent                  → 10,000 × $0.067 = $670
                                                      ─────
                                                       $950/day

vs $3,350 for agent-everything. A 70% reduction, and the
80% that changed path got FASTER and more reliable too.
```

**Prompt caching** is the other large lever: the system prompt and tool definitions are identical on every step of every run, so caching them can cut input cost substantially — often 50–90% of the cached portion depending on the provider.

## 5. Why It Matters

- **Agent cost is ~10× a single call**, and grows faster than linearly in steps.
- **The hybrid architecture is the biggest lever**, typically a ~70% reduction.
- **Prompt caching on the repeated prefix** is nearly free to implement.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No per-task budget** | One runaway task costs hundreds |
| **No per-user budget** | Abuse or a loop in one session |
| **Context never trimmed** | Later steps dominate the bill |
| **Strong model for every step** | Paying reasoning prices for mechanical work |
| **No caching** | Re-paying for identical prefixes |
| **Cost unmeasured per step** | No way to target optimization |

**On budget enforcement:** a token budget checked each iteration, with the agent instructed to conclude with what it has when approaching the limit, degrades gracefully. A hard cut at the limit produces no answer at all after paying for everything — so the budget should trigger a summarize-and-conclude step rather than a termination.

**On measuring:** recording tokens and cost per step, per tool, and per query type is what turns optimization from guesswork into targeting. Usually a small number of query types account for most of the spend, and they're addressable specifically — often by moving exactly those to a fixed pipeline.

## 7. Interview Answer

> "Agent cost is variable and roughly an order of magnitude above a single call, and it grows faster than linearly in steps because the whole history is re-sent each time. Step one might be fifteen hundred prompt tokens and step five thirteen thousand — so later steps cost far more than early ones, which is why agent bills surprise people.
>
> Concretely: a single RAG call at four thousand input and four hundred output tokens is under a cent. A six-step agent with growing context is around forty-five thousand input tokens total — roughly ten times the cost. At fifty thousand requests a day that's the difference between about three hundred and fifty dollars a day and three and a half thousand, which is over a million a year.
>
> So the biggest lever is architectural: don't use an agent for the common path. If eighty percent of requests go through a fixed pipeline and twenty percent through the agent, total cost drops around seventy percent — and the eighty percent that changed path got faster and more reliable too. That's the decision I'd lead with, because everything else is optimizing within a choice that was already expensive.
>
> After that: fewer steps by consolidating tools, smaller context by truncating tool results and dropping completed reasoning, a cheaper model for mechanical steps while keeping a strong one for planning, and prompt caching — the system prompt and tool definitions are identical on every step of every run, so caching that prefix cuts a large share of input cost for almost no implementation effort.
>
> On budgets, I'd enforce per task and per user, and importantly I'd degrade gracefully. A hard cut at the limit means paying for everything and producing no answer. Instead, when approaching the budget, instruct the agent to conclude with what it has — so the spend produces something.
>
> And I'd measure cost per step, per tool, and per query type. Usually a small number of query types account for most of the spend, and they're addressable specifically — often by moving exactly those onto a fixed pipeline, which closes the loop back to the first lever."

## 8. Likely Follow-ups

**Q: Why is agent cost hard to predict?**
Because step count varies and context grows at every step, so cost grows faster than linearly. A three-step run and a twelve-step run on similar-looking inputs can differ by much more than four times, which makes per-request cost a distribution rather than a number.

**Q: What's the biggest cost lever?**
Architecture — handling the common path with a fixed pipeline and reserving the agent for cases that need it. That's typically a seventy percent reduction, and it improves latency and reliability at the same time. Everything else optimizes within an already expensive choice.

**Q: How much does prompt caching help?**
Substantially, because the system prompt and tool definitions are identical on every step of every run. Caching that prefix removes a large share of repeated input cost for almost no implementation work, and the savings scale with how many steps the agent takes.

**Q: How do you enforce a budget?**
Check tokens each iteration and, when approaching the limit, instruct the agent to conclude with what it has rather than cutting it off. A hard termination means paying for the whole run and producing nothing, whereas a graceful conclusion at least returns something useful for the spend.

**Q: How do you find what to optimize?**
Measure cost per step, per tool, and per query type. Usually a small number of query types dominate spend, and those can be addressed specifically — most often by routing exactly those through a deterministic pipeline instead of the agent.

## 9. Common Mistakes

- Estimating agent cost as a multiple of steps, ignoring context growth.
- No per-task or per-user budget.
- Hard-terminating at the budget, producing nothing after paying for everything.
- Using the strongest model for mechanical execution steps.
- Not caching the identical system prompt and tool definitions.

## 10. What to Remember

- **~10× a single call**, and growing faster than linearly in steps.
- **The hybrid is the biggest lever** — typically ~70% reduction.
- **Cache the repeated prefix** — system prompt and tool definitions.
- **Budget per task and per user**, degrading gracefully rather than cutting.
- **Measure cost per query type** — a few types usually dominate.
