# Iterative Retrieval

> **Phase 18 · AGENTIC RAG · Topic 07**

## 1. Definition

Retrieving, reading what came back, and retrieving again with a query informed by it. Each round's query depends on the previous round's results, which is what distinguishes it from parallel fan-out.

## 2. Simple Explanation

You search, read the results, realize what you actually need to look for, and search again.

That's necessary when the second question only becomes apparent after the first answer — which is exactly the case a single retrieval cannot handle, no matter how well it's tuned.

## 3. How It Works

```
ROUND 1   query from the user's question
          → results
ROUND 2   query informed by round 1's results
          → results
ROUND 3   ...
STOP      sufficient, or exhausted, or capped

Each round = 1 retrieval + 1 LLM call to decide the next query.
```

**Two distinct reasons to iterate:**

```
DEPENDENCY   round 2's query genuinely requires round 1's
             answer — "does Premier qualify?" needs the tier
             first. This is multi-hop.

REFINEMENT   round 1 retrieved nothing useful, so try a
             different phrasing or source. This is recovery.

They stop differently: dependency stops when the chain is
complete; refinement stops when results stop improving.
```

## 4. Practical Example

**A dependency chain:**

```
"Am I eligible for the fee waiver on my account?"

R1  "fee waiver eligibility criteria"
    → "Waivers apply to Premier and Private tiers on accounts
       opened before 2020, up to 2 per calendar month."
    → now I know I need: the tier, the opening date, and
      the count this month

R2  (structured) get_customer_tier → "Premier"
    (structured) get_account_opened → 2018-04-11
    (structured) count_waivers_mtd → 1

    → eligible, 1 waiver remaining

The second round's queries were UNKNOWABLE before round 1,
because the criteria themselves had to be retrieved first.
```

**That's the clearest illustration of why single retrieval fails here** — the system didn't know what facts mattered until it read the policy.

**Stopping, mechanically:**

```
· CAP at 3-4 rounds — hard bound
· NEW-INFORMATION CHECK — if round N's chunks overlap
  heavily with rounds 1..N-1, stop
· SUFFICIENCY — the model says it can answer (secondary
  signal only; it tends toward yes)
· DEGRADE — on hitting the cap, answer with what's known
  and state what couldn't be determined

The overlap check is the reliable one because it's mechanical.
```

**The cost, stated plainly:** four rounds is four retrievals plus four LLM calls plus growing context — roughly 8–10× a single-shot pipeline and 15–25 seconds. That's why iteration should be reserved for questions that genuinely need it, identified by a router rather than entered by default.

## 5. Why It Matters

- **Dependency chains are unreachable by single or parallel retrieval** — a structural gap.
- **Two different reasons to iterate** with different stopping conditions.
- **Mechanical stopping on new-information overlap** beats asking the model.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **8–10× cost** | Retrieval plus LLM call per round |
| **15–25 s latency** | Sequential by nature |
| **Drifting away from the question** | Later queries chasing tangents |
| **Repeating queries** | Rounds adding nothing |
| **Context accumulation** | Every round's chunks retained |
| **Never converging** | No cap, no exhaustion check |

**On drift:** by round 3 the queries are generated from generated queries, and they can wander from what the user asked. Re-injecting the original question into the query-generation prompt each round — "the user asked X; what do you still need to answer it?" — keeps rounds anchored, which is cheap and effective.

**On context accumulation:** keeping every chunk from every round overflows the budget and dilutes relevance. After each round I'd rerank the accumulated set against the original question and keep the best five to eight, rather than appending indefinitely.

## 7. Interview Answer

> "Iterative retrieval is retrieving, reading the results, and retrieving again with a query informed by what came back. What distinguishes it from parallel fan-out is that each round's query depends on the previous round's results.
>
> The clearest case: 'am I eligible for the fee waiver on my account?' Round one retrieves the waiver criteria and learns they depend on tier, account opening date, and waivers used this month. Only then can round two look up those three facts. Those queries were unknowable before round one, because the system didn't know which facts mattered until it read the policy. That's the structural gap single retrieval can't close.
>
> There are two distinct reasons to iterate and they stop differently. Dependency — where round two genuinely requires round one's answer, which is multi-hop, and stops when the chain is complete. And refinement — where round one retrieved nothing useful so you try a different phrasing or source, which is recovery, and stops when results stop improving.
>
> For stopping I'd use a hard cap of three or four rounds plus a mechanical new-information check: if round N's chunks overlap heavily with what's already retrieved, stop. That's reliable because it's deterministic. The model's own sufficiency judgment is a secondary signal at best, since it tends toward saying yes.
>
> Two things I'd manage. Drift — by round three the queries are generated from generated queries and can wander from what was asked. Re-injecting the original question into each round's query-generation prompt — 'the user asked X, what do you still need' — keeps them anchored cheaply.
>
> And context accumulation. Keeping every chunk from every round overflows the budget and dilutes relevance, so after each round I'd rerank the accumulated set against the original question and keep the best five to eight rather than appending indefinitely.
>
> On cost: four rounds is four retrievals, four LLM calls, and growing context — roughly eight to ten times a single-shot pipeline and fifteen to twenty-five seconds. That's why iteration should be routed to, not entered by default."

## 8. Likely Follow-ups

**Q: Why can't a single retrieval handle these questions?**
Because the second thing to look for only becomes apparent after reading the first result. If the waiver criteria have to be retrieved before you know that tier and opening date matter, no single query — however well tuned — can retrieve all of it, since the relevant facts weren't known in advance.

**Q: What are the two reasons to iterate?**
Dependency, where a later query genuinely requires an earlier answer — that's multi-hop and stops when the chain completes. And refinement, where the first attempt retrieved nothing useful so you rephrase or change source — that's recovery and stops when results stop improving.

**Q: How do you decide when to stop?**
A hard cap of three or four rounds, plus a mechanical check on whether new rounds return anything not already retrieved. Heavy overlap means further rounds won't help. The model's own sufficiency judgment is a weak secondary signal because it tends to say yes.

**Q: How do you stop the queries drifting?**
Re-inject the original question into each round's query-generation prompt — "the user asked X, what do you still need to answer it." By round three the queries are generated from generated queries, so without that anchor they wander from what was actually asked.

**Q: What does it cost?**
Roughly eight to ten times a single-shot pipeline and fifteen to twenty-five seconds for four rounds, since each round is a retrieval plus an LLM call with growing context. That's why it should be reached through a router for questions that need it, not used as the default path.

## 9. Common Mistakes

- Entering iterative retrieval by default rather than via routing.
- No cap or exhaustion check, so rounds continue without progress.
- Letting later queries drift from the original question.
- Accumulating all chunks from all rounds into the context.
- Relying on the model's sufficiency judgment as the stopping signal.

## 10. What to Remember

- **Each round's query depends on the last** — that's what makes it iterative.
- **Dependency (multi-hop) and refinement (recovery)** stop differently.
- **Cap at 3–4 rounds** and stop on low new-information overlap.
- **Re-inject the original question** each round to prevent drift.
- **Rerank and trim accumulated chunks**, don't append indefinitely.
