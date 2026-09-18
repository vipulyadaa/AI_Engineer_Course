# Agent Latency

> **Phase 17 · AI AGENTS · Topic 29**

## 1. Definition

Total time from request to final answer. It's the sum of every model call plus every tool call in sequence — which makes agents fundamentally slower than single-call systems, and variably so.

## 2. Simple Explanation

A RAG pipeline answers in a couple of seconds. An agent taking six steps takes six model calls plus six tool calls, one after another.

The problem isn't only that it's slow. It's that the user has no idea whether it will take three seconds or thirty, and silence feels like failure.

## 3. How It Works

```
Per step:
  model call      1-4 s   (depends on reasoning length)
  tool call     0.1-2 s
                ───────
  ~1.5-6 s per step

6 steps → 9-36 seconds

Two properties that matter:
  · it's SEQUENTIAL by default
  · it's HIGHLY VARIABLE, so p99 is far above p50
```

**Variability is the harder problem.** A system that always takes fifteen seconds can be designed around. One that takes three seconds usually and forty occasionally cannot.

## 4. Practical Example

**What reduces it, roughly by impact:**

```
1. FEWER STEPS
   Consolidated tools, a fixed pipeline for the common path.
   Removing a step removes ~1.5-6 seconds.

2. PARALLEL TOOL CALLS
   Independent calls in one step, executed concurrently.
   Four lookups become one round instead of four.

3. STREAMING PROGRESS
   Not faster — but transforms the experience.

4. FASTER MODEL FOR MECHANICAL STEPS
   A small model for tool selection where the choice is
   obvious.

5. SPECULATIVE EXECUTION
   Start likely tool calls before the model asks. Complex,
   occasionally worth it.
```

**Streaming progress is the highest-value change relative to effort:**

```
SILENT           [ 22 seconds of nothing ]  → feels broken
                                              users abandon

WITH PROGRESS    "Looking up your account..."      (2s)
                 "Checking the fee schedule..."    (5s)
                 "Comparing against what you were
                  charged..."                      (9s)
                 [ answer ]                        (14s)

Same latency. Completely different experience, because the
user can see it working and knows roughly where it is.
```

**Setting a latency budget backwards:**

```
Target p95 = 12 seconds
  ÷ ~4 seconds per step
  = 3 steps maximum

That constraint then drives the architecture: consolidate
tools, handle the common path without the agent, parallelize
what remains.

Deriving the step budget from the latency target — rather
than measuring latency after building — is what makes this
tractable.
```

## 5. Why It Matters

- **Agents are several times slower** than single-call systems, and variably so.
- **Streaming progress** is the highest-impact change for perceived latency.
- **Deriving the step budget from a latency target** drives the whole architecture.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Sequential by default** | Latency is the sum of everything |
| **High variance** | p99 far above p50; hard to design around |
| **No progress indication** | Users abandon silent waits |
| **Tool timeouts not budgeted** | Worst case exceeds any sensible limit |
| **Latency measured after building** | Architecture already committed |
| **Reasoning length uncontrolled** | Verbose thinking adds seconds per step |

**On reasoning length:** more reasoning improves decisions and costs generation time. For mechanical steps where the choice is obvious, instructing brevity — "think briefly, then act" — saves real time without measurable quality loss. It's worth tuning per step type rather than applying one instruction globally.

**On timeouts:** the worst case is the sum of every tool's timeout plus every model call. Five tools at thirty seconds is a hundred and fifty seconds before the model time is counted. Per-tool timeouts have to be derived from the overall budget, and there should be a global deadline that returns partial results rather than letting the worst case happen.

## 7. Interview Answer

> "Agent latency is the sum of every model call and tool call in sequence. Roughly one and a half to six seconds per step, so a six-step agent is nine to thirty-six seconds. That's fundamentally slower than a single-call system.
>
> But the harder problem is variance rather than absolute latency. A system that always takes fifteen seconds can be designed around. One that takes three seconds usually and forty occasionally can't — p99 far above p50 is what breaks user experience and capacity planning both.
>
> On reduction, the biggest lever is fewer steps: consolidated tools, and a fixed pipeline for the common path so most requests never enter the agent at all. Removing a step removes several seconds. Then parallel tool calls — independent lookups issued in one step and executed concurrently, turning four rounds into one.
>
> But the highest-value change relative to effort is streaming progress. Twenty-two seconds of silence feels broken and users abandon. The same twenty-two seconds with 'looking up your account', 'checking the fee schedule', 'comparing against what you were charged' is a completely different experience — identical latency, but the user can see it working and roughly where it is. I'd do that before any optimization work.
>
> The approach I'd actually take is deriving the step budget from the latency target rather than measuring afterwards. If p95 has to be twelve seconds and a step is about four, that's three steps maximum — and that constraint then drives the architecture: consolidate tools, handle the common path without the agent, parallelize what remains. Measuring latency after building means the architecture is already committed.
>
> Two details. Reasoning length is tunable — more reasoning improves decisions and costs generation time, so for mechanical steps where the choice is obvious, instructing brevity saves real time with no measurable quality loss. And timeouts need budgeting globally: five tools at thirty seconds each is a hundred and fifty seconds before model time, so there should be a global deadline that returns partial results rather than letting the worst case actually occur."

## 8. Likely Follow-ups

**Q: Why are agents slow?**
Because latency is the sum of every model call and tool call, executed sequentially by default. Each step is roughly one and a half to six seconds, so a six-step run is nine to thirty-six. The sequential structure is inherent to reacting to each result before choosing the next action.

**Q: What's the biggest problem — latency or variance?**
Variance. A consistently slow system can be designed around with expectations and capacity planning; one that's usually fast and occasionally very slow can't. A p99 far above p50 is what actually breaks the user experience and makes provisioning guesswork.

**Q: What would you do first?**
Stream progress. It doesn't reduce latency at all, but silence feels like failure and users abandon, whereas visible progress through the steps makes the same wait acceptable. It's the highest-impact change relative to effort, and I'd do it before optimizing anything.

**Q: How do you set the step budget?**
Backwards from the latency target. If p95 must be twelve seconds and a step is about four, that's three steps maximum — and that constraint drives consolidation, moving the common path off the agent, and parallelizing what's left. Measuring after building means the architecture is already fixed.

**Q: How do you handle timeouts?**
Derive per-tool timeouts from the overall budget rather than setting them per tool in isolation, and add a global deadline that returns partial results. Otherwise the worst case is the sum of every timeout plus model time, which no interactive system can tolerate.

## 9. Common Mistakes

- Optimizing per-step latency before reducing step count.
- No progress indication during long runs.
- Setting per-tool timeouts without a global budget.
- Measuring latency after the architecture is committed.
- Reporting average latency rather than p95 and p99.

## 10. What to Remember

- **~1.5–6 seconds per step**, summed sequentially.
- **Variance is the harder problem** — p99 far above p50.
- **Stream progress first** — same latency, different experience.
- **Derive the step budget from the latency target**, not the reverse.
- **Global deadline with partial results**, not a sum of per-tool timeouts.
