# Parallel Tool Calls

> **Phase 24 · LLM PERFORMANCE · Topic 16**

## 1. Definition

Executing multiple independent tool calls concurrently rather than sequentially. In an agent it's the largest latency lever available, because it collapses rounds rather than speeding up individual steps.

## 2. Simple Explanation

An agent that needs three independent lookups can do them one at a time — three rounds — or ask for all three at once and execute them together.

Three rounds become one. That's a structural improvement, not an incremental one.

## 3. How It Works

```
SEQUENTIAL
  model → tool A → model → tool B → model → tool C → model
  = 4 model calls + 3 tool calls, serially
  ≈ 4 × 2s + 3 × 0.3s ≈ 9 seconds

PARALLEL
  model → [tool A ‖ tool B ‖ tool C] → model
  = 2 model calls + 1 tool round
  ≈ 2 × 2s + max(0.3s) ≈ 4.3 seconds

The saving is in the MODEL CALLS removed, not the tool
execution — tools are fast; model calls are not.
```

**That's the point people miss:** the win comes from collapsing model round-trips, not from running the tools faster.

## 4. Practical Example

**Enabling it, which has three requirements:**

```
1. THE MODEL MUST RETURN MULTIPLE CALLS
   Gemini and others support this. It happens when the
   model recognizes the calls as independent.

2. THE PROMPT MUST ENCOURAGE IT
   "When several pieces of information are needed and the
    lookups don't depend on each other, request them
    together."
   Without this, models often serialize by default.

3. THE EXECUTOR MUST RUN THEM CONCURRENTLY
   The natural implementation loops over the returned calls
   one at a time — which discards the benefit entirely
   while the model did its part correctly.

Point 3 is where it's most often lost, and it's invisible
unless you look at the timing.
```

**Planning makes independence explicit:**

```
A plan that marks dependencies — step 3 depends on step 1,
steps 1 and 2 are independent — tells the executor exactly
what can run concurrently.

That's the strongest concrete argument for planning agents
over purely reactive ones: ReAct is sequential by
construction, because each step is conditioned on the
previous observation. It structurally cannot parallelize.
```

**A banking example:**

```
"Why was I charged $45 on my international transfer?"

INDEPENDENT (parallel)
  get_customer_tier
  get_transaction
  count_waivers_mtd

DEPENDENT (must follow)
  get_fee_schedule(tier)   ← needs the tier
  reconcile                ← needs all of the above

So: one parallel round, then one dependent call, then
reconcile. Three model rounds instead of five.
```

## 5. Why It Matters

- **It collapses model rounds**, which is where agent latency lives.
- **The executor is where the benefit is usually lost** — silently.
- **ReAct cannot parallelize** — the strongest argument for planning agents.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Executor loops sequentially** | The benefit discarded invisibly |
| **Prompt doesn't encourage grouping** | Models serialize by default |
| **Purely reactive agent** | Sequential by construction |
| **One slow tool blocks the round** | Latency is the max of the group |
| **Failure handling per branch** | One failure shouldn't kill the round |
| **Concurrency without limits** | Downstream services overwhelmed |

**On failure in a parallel round:** if one of three concurrent tools fails, the round shouldn't fail. Each should catch its own error and return a status, so the model sees "tier: unavailable" alongside two successful results and can produce a partial answer or abstain. A raised exception in one branch discarding two successful lookups is a common and avoidable waste.

**On the slowest tool:** the round takes as long as its slowest member, so one tool with a three-second timeout sets the floor for the whole group. That's an argument for per-tool timeouts derived from the overall budget rather than chosen individually — and for not grouping a known-slow tool with fast ones if it can be deferred.

## 7. Interview Answer

> "An agent needing three independent lookups can do them one at a time — three rounds — or ask for all three at once and execute them together. Three rounds become one, which is a structural improvement rather than an incremental one.
>
> And the saving is in the model calls removed, not the tool execution. Sequentially that's four model calls and three tool calls serially, maybe nine seconds. In parallel it's two model calls and one tool round, around four. Tools are fast; model calls are not — so collapsing round-trips is where the win is, and that's the part people miss when they think of it as running tools faster.
>
> There are three requirements. The model has to return multiple calls, which Gemini and others support. The prompt has to encourage it — something like 'when several pieces of information are needed and the lookups don't depend on each other, request them together' — because models often serialize by default without that.
>
> And the executor has to actually run them concurrently. That's where it's most often lost: the natural implementation loops over the returned calls one at a time, which discards the benefit entirely while the model did its part correctly. It's invisible unless you look at the timing, because everything works — just slowly.
>
> Planning makes the independence explicit. A plan marking dependencies tells the executor exactly what can run concurrently, and that's the strongest concrete argument for planning agents over purely reactive ones. ReAct is sequential by construction — each step is conditioned on the previous observation, so it structurally cannot parallelize regardless of how well it's prompted.
>
> Concretely: 'why was I charged forty-five dollars on my international transfer' needs the tier, the transaction, and the waiver count — all independent, so one parallel round. Then the fee schedule for that tier, which depends on the first round. Then reconcile. Three model rounds instead of five.
>
> Two things I'd handle. Failure in a parallel round: if one of three tools fails, the round shouldn't fail. Each should catch its own error and return a status, so the model sees 'tier unavailable' alongside two successful results and can give a partial answer or abstain. A raised exception in one branch discarding two successful lookups is common and entirely avoidable.
>
> And the round takes as long as its slowest member, so one tool with a three-second timeout sets the floor for the group. That's an argument for per-tool timeouts derived from the overall latency budget rather than chosen individually — and for not grouping a known-slow tool with fast ones if it can be deferred to a later round."

## 8. Likely Follow-ups

**Q: Where does the saving come from?**
Removed model calls, not faster tool execution. Tools take hundreds of milliseconds; model calls take seconds. Collapsing three rounds into one removes two model round-trips, which is the bulk of the latency in an agent step.

**Q: Where is the benefit usually lost?**
In the executor. The natural implementation loops over returned tool calls one at a time, discarding the concurrency the model correctly identified. Nothing breaks, so it's invisible unless you look at per-round timing.

**Q: Why can't a reactive agent parallelize?**
Because each step is conditioned on the previous observation, so it's sequential by construction. That's the strongest concrete argument for planning agents — a plan marking dependencies tells the executor exactly what can run together.

**Q: What if one parallel tool fails?**
The round shouldn't fail. Each tool catches its own error and returns a status, so the model sees the gap alongside the successful results and can produce a partial answer or abstain. A raised exception discarding two successful lookups is avoidable waste.

**Q: What sets the round's latency?**
Its slowest member. One tool with a three-second timeout sets the floor for the whole group, which argues for per-tool timeouts derived from the overall budget, and for deferring a known-slow tool to a later round rather than grouping it with fast ones.

## 9. Common Mistakes

- Executing returned parallel calls sequentially.
- No prompt guidance encouraging grouped calls.
- Using a reactive agent where planning would enable parallelism.
- One failing branch aborting the whole round.
- Grouping a known-slow tool with fast ones.

## 10. What to Remember

- **It collapses model rounds** — that's where agent latency lives.
- **Three requirements:** model support, prompt guidance, concurrent executor.
- **The executor is where it's silently lost.**
- **ReAct can't parallelize** — the argument for planning agents.
- **The round is as slow as its slowest tool** — budget timeouts accordingly.
