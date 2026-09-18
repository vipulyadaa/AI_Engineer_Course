# Agent Reliability

> **Phase 17 · AI AGENTS · Topic 21**

## 1. Definition

How consistently an agent completes tasks correctly. It degrades multiplicatively with the number of steps, which is the central constraint on how ambitious an agent can safely be.

## 2. Simple Explanation

If every step is 95% reliable, two steps are 90%, and ten steps are 60%.

Nothing about that is unusual — it's how any chain of independent operations behaves. But it means the intuition "add more steps for more capability" is exactly backwards for reliability.

## 3. How It Works

```
P(success) ≈ p^n     for n steps at per-step reliability p

  p = 0.99   10 steps → 90%
  p = 0.95   10 steps → 60%
  p = 0.90   10 steps → 35%
  p = 0.95   20 steps → 36%

Two consequences:
  1. FEWER STEPS beats better steps, for the same effort
  2. Per-step reliability matters more the longer the task
```

**The three levers:**

```
1. REDUCE n    consolidate tools, plan to merge steps,
               handle common cases without the agent
2. RAISE p     better tool descriptions, tighter schemas,
               validation at the tool boundary
3. ADD RECOVERY  turn a failure into a retry rather than
               a lost task
```

## 4. Practical Example

**Where reliability actually leaks:**

```
Tool selection          most common — wrong tool, wrong path
Argument construction   hallucinated IDs, wrong formats
Result interpretation   misreading what a tool returned
Termination             stopping early, or not stopping
Synthesis               a correct path, a wrong final answer

Measuring these separately shows which p to raise. Most
teams assume it's the model and it's usually the tool
descriptions.
```

**The most effective reliability measure is reducing scope:**

```
Instead of ONE agent handling all fee questions in 8 steps:

  · a fixed pipeline for the 80% that are "what is the fee
    for X" — retrieval, one call, no agent
  · the agent only for discrepancy investigations

The common path becomes a single deterministic operation.
The agent handles a small fraction of traffic where its
flexibility is genuinely needed.

Overall reliability rises sharply because most requests no
longer traverse a probabilistic multi-step path at all.
```

**That's the answer I'd actually give**, because it addresses the exponent rather than the base.

**Checkpointing for recovery:**

```
Persist state after each successful step. On failure, resume
from the last good state rather than restarting.

Turns a 60% end-to-end success rate into something much
higher with retries — because a retry doesn't repeat the
seven steps that already worked.
```

## 5. Why It Matters

- **The multiplicative model** is the single most important quantitative idea about agents.
- **Reducing step count beats improving steps**, because n is in the exponent.
- **Checkpointing converts failures into retries** instead of lost work.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Long agent paths** | Reliability collapses exponentially |
| **No checkpointing** | Every failure restarts from zero |
| **Unmeasured per-step reliability** | Can't tell which stage to fix |
| **Correct-path, wrong-answer** | Synthesis failures missed by process metrics |
| **Success rate measured on easy cases** | Flatters the system |

**On what "reliable" means in banking:** for a customer-facing system, an 85% success rate means 15% of customers get a wrong or failed interaction. The acceptable failure *mode* matters more than the rate — an agent that abstains and hands off when uncertain can have a lower completion rate and be entirely acceptable, whereas one that produces confident wrong answers at the same rate is not. Reliability targets should be set per failure mode, not as a single number.

**On the honest framing:** agents are less reliable than deterministic code, and they will remain so. The engineering task is bounding where that unreliability can reach — which is what scope reduction, tool-level validation, and human checkpoints all do.

## 7. Interview Answer

> "Agent reliability degrades multiplicatively with step count. If each step is ninety-five percent reliable, ten steps is about sixty percent. At ninety percent per step it's thirty-five. That's the central quantitative fact about agents, and it means the intuition that more steps buys more capability is backwards for reliability.
>
> Since n is in the exponent, reducing step count beats improving individual steps for the same effort. So the most effective measure is reducing scope. Instead of one agent handling all fee questions in eight steps, I'd use a fixed pipeline for the eighty percent that are 'what is the fee for X' — retrieval, one call, no agent — and reserve the agent for discrepancy investigations. The common path becomes a single deterministic operation, and most requests no longer traverse a probabilistic multi-step path at all. That addresses the exponent rather than the base.
>
> For raising per-step reliability, I'd measure where it actually leaks: tool selection, argument construction, result interpretation, termination, and synthesis. Selection is usually the biggest, and it's usually the tool descriptions rather than the model — but you only know that by measuring the stages separately.
>
> The third lever is recovery. Persisting state after each successful step means a failure resumes from the last good state rather than restarting. That turns a sixty percent end-to-end rate into something much higher with retries, because the retry doesn't repeat the seven steps that already worked.
>
> On what reliable means in banking specifically — an eighty-five percent success rate means fifteen percent of customers get a wrong or failed interaction. But the failure mode matters more than the rate. An agent that abstains and hands off when uncertain can have a lower completion rate and be entirely acceptable; one producing confident wrong answers at the same rate is not. So I'd set targets per failure mode rather than as one number.
>
> And I'd be honest that agents are less reliable than deterministic code and will remain so. The engineering task is bounding where that unreliability can reach — which is what scope reduction, tool-level validation, and human checkpoints all do."

## 8. Likely Follow-ups

**Q: Why do agents become unreliable with more steps?**
Because per-step reliability multiplies. Ninety-five percent across ten steps is about sixty percent end to end; ninety percent across ten is thirty-five. The step count is in the exponent, so length degrades reliability far faster than improving individual steps can compensate.

**Q: What's the most effective improvement?**
Reducing the number of steps, usually by narrowing scope — handling the common cases with a deterministic pipeline and reserving the agent for the minority that genuinely need it. That attacks the exponent rather than the base, which is where the leverage is.

**Q: Where does reliability leak?**
Tool selection most often, then argument construction, result interpretation, termination, and synthesis. Measuring those separately is what tells you which to fix — most teams assume the model is the problem when it's usually the tool descriptions.

**Q: How does checkpointing help?**
By turning failures into retries rather than lost work. Persisting state after each successful step means a failure at step eight resumes from step seven instead of starting over, so the effective success rate with retries is far higher than the single-pass rate.

**Q: What reliability is acceptable?**
It depends on the failure mode more than the rate. An agent that abstains and escalates when uncertain can have a lower completion rate and still be acceptable; one producing confident wrong answers at the same rate isn't. So targets should be set per failure mode rather than as a single completion percentage.

## 9. Common Mistakes

- Not knowing that per-step reliability compounds.
- Trying to improve step quality when reducing step count would help more.
- No checkpointing, so every failure loses all prior work.
- Quoting a single reliability number without distinguishing failure modes.
- Measuring success rates on curated easy cases.

## 10. What to Remember

- **P(success) ≈ p^n.** 0.95 over ten steps is ~60%.
- **Reducing steps beats improving steps** — n is in the exponent.
- **Narrow scope:** deterministic pipeline for the common path, agent for the rest.
- **Checkpoint state** so failures become retries, not restarts.
- **Failure mode matters more than rate** — abstention is acceptable, confident error isn't.
