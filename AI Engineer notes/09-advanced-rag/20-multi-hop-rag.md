# Multi-Hop RAG

> **Phase 09 · ADVANCED RAG · Topic 20**

## 1. Definition

Answering questions that require chaining facts across multiple retrievals, where each step's query depends on the previous step's result. Single-pass retrieval cannot do this, because you don't know the second query until you've seen the first answer.

## 2. Simple Explanation

Some questions have a dependency chain:

> *"What's the fee for the account type recommended for freelancers?"*

You can't search for the fee until you know which account type. Two hops:
1. Which account is recommended for freelancers? → *Business Flex*
2. What's the fee for Business Flex? → *$18/month*

A single retrieval embeds the whole question and matches neither hop well.

## 3. How It Works

**Two strategies, and the distinction matters:**

| | Decomposition (parallel) | Iterative (sequential) |
|---|---|---|
| **When** | Sub-questions are independent | Each depends on the previous answer |
| **Example** | "Compare A's fee to B's fee" | "Fee of the account recommended for X" |
| **Execution** | All retrievals in parallel | Strictly ordered |
| **Latency** | 1 retrieval round | N rounds |
| **Complexity** | Low | High — needs a loop and state |

**Iterative multi-hop:**

```
question
   ↓
extract hop 1 query ──▶ retrieve ──▶ extract the entity/fact found
   ↓                                          │
   └──────── build hop 2 query using it ◀─────┘
   ↓
retrieve ──▶ sufficient? ──no──▶ hop 3...
   ↓ yes
generate
```

**The critical diagnostic question:** *does hop 2's query depend on hop 1's answer?* If no, decompose and run in parallel — much cheaper and more predictable. If yes, you need the sequential loop.

## 4. Practical Example

**Independent (decompose, parallel):**

```
"How do our overdraft fees compare to our credit line interest?"

  Q1: "overdraft fee amount"          ─┐
  Q2: "credit line interest rate"     ─┴─ both known upfront, run together
  → fuse, generate.  ~1 retrieval round.
```

**Dependent (iterative, sequential):**

```
"What's the fee for the account type we recommend for freelancers?"

  Hop 1: "recommended account for freelancers"
         → "Business Flex is recommended for freelancers and
            contractors."
  Extract: account_type = "Business Flex"

  Hop 2: "Business Flex monthly fee"           ← could not be formed
         → "$18 per month, waived above..."      before hop 1

  → generate.  2 sequential rounds.
```

**Error compounding is the defining risk:**

```
Hop 1 accuracy 0.90
Hop 2 accuracy 0.90
End-to-end ≈ 0.81

Three hops ≈ 0.73.  Each hop multiplies, it doesn't average.
```

That arithmetic is why deep multi-hop chains are unreliable, and why most production systems cap at two or three hops.

## 5. Why It Matters

- **It's a structural limitation of single-pass RAG**, not a tuning problem — no chunk size or reranker fixes it.
- **The decomposition-vs-iterative distinction** determines cost and latency, and getting it right matters.
- **Error compounding** is the honest constraint on how far this scales.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Error compounding** | Per-hop accuracy multiplies; three hops from 0.9 each gives 0.73 |
| **Latency** | Sequential rounds can't be parallelized |
| **Extraction failure** | Hop 1 retrieved correctly but the entity wasn't extracted from it |
| **Unbounded hops** | Without a limit, the loop can run indefinitely |
| **Wrong strategy chosen** | Running independent sub-questions sequentially wastes latency |
| **Losing the thread** | By hop 3 the model may have drifted from the original question |

**Mitigations that actually help:** cap hops at 2–3, carry the original question forward into every hop's prompt so the model doesn't drift, validate that each hop actually produced the needed entity before proceeding, and fall back to returning partial results with an explicit caveat rather than a wrong complete answer.

## 7. Interview Answer

> "Multi-hop RAG answers questions requiring facts chained across multiple retrievals. The defining case is when the second query depends on the first answer — 'what's the fee for the account type we recommend for freelancers' can't be searched in one pass, because you don't know which account until you've retrieved the recommendation.
>
> The distinction I'd draw first is decomposition versus iterative. If the sub-questions are independent — 'compare A's fee to B's fee' — I can decompose upfront and retrieve in parallel, which is one round and predictable latency. If they're dependent, I need a sequential loop. Getting that classification right matters, because running independent sub-questions sequentially wastes latency for nothing.
>
> The honest constraint is error compounding. Per-hop accuracy multiplies rather than averages — two hops at ninety percent each gives about eighty-one percent end to end, three hops gives seventy-three. That arithmetic is why I'd cap at two or three hops in production rather than letting a loop run deep.
>
> The failure mode that's easy to miss is extraction. Hop one might retrieve the right chunk, but if the system fails to extract 'Business Flex' from it, hop two's query can't be formed. So I'd validate that each hop produced the entity the next hop needs, and fail explicitly rather than searching with a malformed query.
>
> I'd also carry the original question forward into every hop's prompt, because by hop three the model can drift from what was actually asked. And I'd prefer returning a partial answer with a caveat over a confident complete answer built on a broken chain."

## 8. Likely Follow-ups

**Q: Decomposition or iterative — how do you decide?**
Ask whether the second query can be formed without the first answer. "Compare A and B" — yes, both queries are known upfront, so decompose and parallelize. "The fee for the account recommended for X" — no, you need the recommendation first, so it's iterative. An LLM can make this classification, or heuristics on whether the question contains a referring expression.

**Q: How many hops is too many?**
Two or three in production. Error compounding makes deeper chains unreliable — three hops at ninety percent per-hop accuracy is seventy-three percent end to end, and real per-hop accuracy is often lower. Beyond that, I'd rather return partial results with an explicit statement of what couldn't be resolved than a confident answer built on a long fragile chain.

**Q: How do you prevent the model drifting from the question?**
Carry the original question in every hop's prompt alongside the accumulated findings, and make the hop-planning step explicitly reference what's still unknown relative to the original question. Without that, by hop three the model is answering a question it constructed rather than the one the user asked.

**Q: What happens when a hop fails?**
Detect it explicitly rather than proceeding with a malformed query. If hop one retrieved nothing relevant, or the needed entity couldn't be extracted, the chain should stop and report what it could and couldn't establish. Continuing with a guessed entity produces a confident answer about the wrong thing, which is the worst outcome.

**Q: How does this relate to agentic RAG?**
Iterative multi-hop is essentially a constrained form of agentic RAG — the model decides the next query based on what it found. The difference is scope: multi-hop is specifically about chaining retrievals to gather facts, while agentic RAG may also choose among tools, reformulate, or decide to stop. In implementation they're the same loop with different degrees of freedom.

## 9. Common Mistakes

- Running independent sub-questions sequentially instead of in parallel.
- Allowing unbounded hops without a limit.
- Not validating that each hop produced the entity the next one needs.
- Losing the original question by hop three.
- Ignoring that per-hop accuracy multiplies rather than averages.

## 10. What to Remember

- **Chained retrievals where each query may depend on the previous answer.**
- **Decompose in parallel when independent; iterate sequentially only when dependent.**
- **Error compounds multiplicatively** — cap at 2–3 hops.
- **Validate entity extraction between hops**, and fail explicitly rather than guessing.
- **Carry the original question forward** so the model doesn't drift.
