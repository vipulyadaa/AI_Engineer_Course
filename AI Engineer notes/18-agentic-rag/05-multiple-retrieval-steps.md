# Multiple Retrieval Steps

> **Phase 18 · AGENTIC RAG · Topic 05**

## 1. Definition

Performing more than one retrieval for a single question — either in parallel, when the queries are all known in advance, or sequentially, when each depends on what the last returned.

## 2. Simple Explanation

Sometimes one search isn't enough. Either the question has several parts, or answering it requires finding out something first and then searching for something else.

Parallel and sequential are very different in cost and latency, and treating them the same is where the design usually goes wrong.

## 3. How It Works

```
PARALLEL          all queries known up front
  q1 ┐
  q2 ├──▶ retrieve concurrently ──▶ merge ──▶ generate
  q3 ┘
  latency = ONE retrieval round

SEQUENTIAL        each query depends on the last
  q1 ──▶ r1 ──▶ q2(r1) ──▶ r2 ──▶ q3(r2) ──▶ generate
  latency = N retrieval rounds + N LLM calls
```

**Parallel is nearly free; sequential is expensive.** A parallel fan-out of three adds one retrieval's latency. A sequential chain of three adds three retrievals plus three model calls to decide each next query.

## 4. Practical Example

**Merging results properly:**

```
Three retrievals of top-10 each = 30 chunks, with overlap.

  1. DEDUPLICATE by chunk_id — the same chunk often appears
     for several sub-queries
  2. RERANK against the ORIGINAL question, not the sub-query
     — relevance to what the user actually asked is the goal
  3. TRUNCATE to the context budget
  4. PRESERVE COVERAGE — keep the top results from each
     sub-query rather than taking the global top-k

Point 4 matters: a global top-k after merging can return
ten chunks all answering sub-question 1, because that part
had stronger lexical signal. The coverage of sub-questions 2
and 3 is lost while the context looks full.
```

**That coverage failure is the characteristic bug of multi-retrieval**, and it produces confident answers to part of the question while ignoring the rest.

**Bounding sequential chains:**

```
Each step is a retrieval AND an LLM call. Cost and latency
both compound.

  · cap at 3-4 retrieval rounds
  · stop when a round adds nothing new — measure chunk
    overlap with what's already retrieved
  · stop when the model says it has enough
  · on hitting the cap: answer with what's available and
    state what couldn't be determined

The overlap check is the most useful stopping signal, because
it's mechanical — if round 3 returns chunks already seen in
rounds 1 and 2, further rounds won't help.
```

## 5. Why It Matters

- **Parallel and sequential have very different costs** — one round versus N rounds plus N calls.
- **Coverage loss on merge** is the characteristic failure and it's silent.
- **Mechanical stopping signals** beat asking the model whether it has enough.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Global top-k after merge** | Coverage of some sub-questions lost |
| **No deduplication** | The same chunk consumes several context slots |
| **Reranking against sub-queries** | Optimizes for the wrong target |
| **Unbounded sequential chains** | Cost and latency compound |
| **Not detecting exhaustion** | Rounds that add nothing still cost |
| **Context overflow** | Thirty chunks won't fit meaningfully |

**On context budget:** three retrievals of ten chunks each is far more than should reach the generator. More context isn't better — relevant chunks get diluted, and the lost-in-the-middle effect means material in the centre is used less. Merging down to five to eight well-chosen chunks usually produces better answers than passing twenty.

**On the stopping decision:** asking the model "do you have enough?" is unreliable — it tends toward yes. A mechanical check on new-chunk overlap is deterministic and cheap, and it should be the primary signal with the model's judgment as a secondary one.

## 7. Interview Answer

> "Multiple retrieval steps come in two forms with very different economics. Parallel, where all queries are known up front — three sub-queries retrieved concurrently add one retrieval round of latency, so it's nearly free. Sequential, where each query depends on the last — three rounds means three retrievals plus three LLM calls to decide each next query. Treating them the same is where the design usually goes wrong.
>
> Merging is where the interesting failure lives. Three retrievals of top-ten is thirty chunks with overlap. I'd deduplicate by chunk ID, rerank against the *original* question rather than the sub-query, truncate to the context budget — and critically, preserve coverage by keeping the top results from each sub-query rather than taking a global top-k.
>
> That last point is the characteristic bug. A global top-k after merging can return ten chunks all answering sub-question one, because that part had stronger lexical signal. Sub-questions two and three get no coverage, but the context looks full, so the model produces a confident answer to a third of what was asked. It's silent, which is what makes it dangerous.
>
> On context budget — thirty chunks shouldn't reach the generator. More context isn't better: relevant chunks get diluted and the lost-in-the-middle effect means material in the centre is used less. Merging down to five to eight well-chosen chunks usually beats passing twenty.
>
> For bounding sequential chains, I'd cap at three or four rounds and stop when a round adds nothing new — measuring chunk overlap with what's already retrieved. That mechanical signal is better than asking the model whether it has enough, because the model tends toward yes. I'd use the overlap check as primary and the model's judgment as secondary.
>
> And on hitting the cap, answer with what's available while stating explicitly what couldn't be determined, rather than generating around the gap."

## 8. Likely Follow-ups

**Q: Parallel or sequential — what's the difference in cost?**
Parallel adds one retrieval round regardless of how many queries, so it's nearly free. Sequential adds a retrieval plus an LLM call per round, so three rounds triples both latency and model cost. Whenever the queries are knowable up front, parallel is strictly better.

**Q: How do you merge results from several retrievals?**
Deduplicate by chunk ID, rerank against the original question rather than the sub-queries, and preserve coverage by keeping top results per sub-query rather than taking a global top-k. Then truncate to a context budget of roughly five to eight chunks.

**Q: What's the characteristic failure?**
Coverage loss. A global top-k after merging can fill the context with chunks answering one sub-question, leaving the others unaddressed while the context looks full. The model then answers part of the question confidently, and nothing signals that the rest was ignored.

**Q: How do you decide when to stop retrieving?**
Primarily by measuring whether a round returns anything new — if the chunks overlap heavily with what's already retrieved, further rounds won't help. That's mechanical and cheap. The model's own judgment is a secondary signal, because it tends to say it has enough.

**Q: Should all retrieved chunks go to the generator?**
No. Thirty chunks dilutes the relevant ones and the lost-in-the-middle effect means central material is underused. Merging down to five to eight well-chosen chunks typically produces better answers than passing everything retrieved.

## 9. Common Mistakes

- Taking a global top-k after merging, losing sub-question coverage.
- Reranking against sub-queries instead of the original question.
- Passing all retrieved chunks to the generator.
- Running known queries sequentially instead of in parallel.
- Relying on the model to decide when retrieval is sufficient.

## 10. What to Remember

- **Parallel = one round; sequential = N rounds plus N calls.**
- **Preserve per-sub-query coverage** on merge, not a global top-k.
- **Rerank against the original question.**
- **Cap sequential chains at 3–4** and stop on low new-chunk overlap.
- **Merge down to 5–8 chunks** — more context isn't better.
