# Context Length

> **Phase 24 · LLM PERFORMANCE · Topic 05**

## 1. Definition

The maximum number of tokens a model can process in one request — input plus output. It's a hard architectural ceiling with performance and memory consequences well before you reach it.

## 2. Simple Explanation

Context length is the window. Exceeding it is an error; approaching it is expensive.

The performance story is that attention cost grows quadratically with sequence length and the KV cache grows linearly — so the limit that bites first is usually memory and latency, not the ceiling itself.

## 3. How It Works

```
ATTENTION COST     O(n²) in sequence length
KV CACHE           O(n) in sequence length, held for the
                   whole generation

So a request at 100k tokens isn't 10× a request at 10k —
attention is ~100×, though modern implementations
(FlashAttention and similar) reduce the constant
substantially.

WHAT THIS MEANS PRACTICALLY
  · TTFT grows faster than linearly with input
  · memory per concurrent request grows with context
  · throughput falls as contexts get longer
```

**The KV cache is the memory story.** It holds keys and values for every token processed, for the duration of generation — which is why long contexts reduce how many requests can run concurrently.

## 4. Practical Example

**Why the ceiling isn't the constraint:**

```
A model with a 1M-token window doesn't make 1M-token
requests practical:

  cost      scales with input
  TTFT      grows faster than linearly
  memory    KV cache for 1M tokens is large
  quality   lost in the middle applies

So the operating limit is set by latency and cost targets
long before the architectural ceiling. In practice a RAG
system operates at 5-20k tokens while the window allows
far more.

The window matters for what it ENABLES — larger parent
chunks, less aggressive truncation — not as a target.
```

**Handling the limit safely:**

```
count_tokens BEFORE sending, always.

Then:
  · if over budget, trim the lowest-ranked chunks first
  · never truncate mid-chunk — a half chunk is worse than
    no chunk, because a cut-off rule reads as a complete one
  · reserve headroom for the output; input + output share
    the window
  · summarize history rather than dropping the system
    instruction

Discovering the limit at request time means a failed
request; checking beforehand means a degraded but correct
one.
```

**The mid-chunk truncation point is worth dwelling on:** a chunk cut halfway through a conditional rule produces text that reads as complete and states the rule without its condition. That's the omission failure introduced by a truncation strategy.

**Reserved output headroom:** if input fills the window, there's no room to generate. Sizing input at the window minus the expected output plus a margin avoids a class of failure that looks like the model refusing to answer.

## 5. Why It Matters

- **Attention is quadratic, KV cache is linear** — the practical limit precedes the ceiling.
- **Mid-chunk truncation creates omission failures** — never truncate inside a chunk.
- **Output headroom must be reserved** — input and output share the window.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Treating the window as a target** | Cost, latency, and quality all degrade |
| **No token counting before sending** | Failed requests at runtime |
| **Mid-chunk truncation** | A rule without its condition |
| **No output headroom** | No room to generate |
| **KV cache memory ignored** | Concurrency falls with context length |
| **History dropped before old chunks** | Losing the conversation, keeping noise |

**On what to trim first:** when over budget, drop the lowest-ranked retrieved chunks before touching history or the system instruction. The lowest-ranked chunk contributed least; the system instruction carries the grounding and abstention rules. Trimming in the wrong order removes a control to keep a marginal document.

**On concurrency:** KV cache memory per request scales with context length, so longer contexts reduce how many requests a given deployment can serve simultaneously. On a hosted API that manifests as throughput limits rather than an explicit memory error, which makes it easy to misattribute — a system that's slower under load with long contexts is hitting this rather than anything in your code.

## 7. Interview Answer

> "Context length is the hard ceiling on input plus output tokens, but the constraints that actually bind arrive well before it.
>
> Attention cost grows quadratically with sequence length and the KV cache grows linearly and is held for the whole generation. So a hundred-thousand-token request isn't ten times a ten-thousand-token one — attention is far more, though FlashAttention-style implementations reduce the constant substantially. Practically that means TTFT grows faster than linearly with input, and memory per concurrent request grows with context.
>
> Which is why a million-token window doesn't make million-token requests practical. Cost scales with input, TTFT grows superlinearly, the KV cache is large, and lost-in-the-middle applies. In practice a RAG system operates at five to twenty thousand tokens while the window allows far more — so the window matters for what it enables, like larger parent chunks and less aggressive truncation, not as a target.
>
> For handling the limit, I'd always count tokens before sending. Discovering the limit at request time means a failed request; checking beforehand means a degraded but correct one.
>
> And the trimming strategy matters. Drop the lowest-ranked retrieved chunks first, before touching history or the system instruction — the lowest-ranked chunk contributed least, while the system instruction carries the grounding and abstention rules. Trimming in the wrong order removes a control to keep a marginal document.
>
> The detail I'd emphasize is never truncating mid-chunk. A chunk cut halfway through a conditional rule produces text that reads as complete and states the rule without its condition — so a truncation strategy has introduced the omission failure, which is the most consequential hallucination type in banking. A half chunk is worse than no chunk.
>
> And reserve headroom for the output, because input and output share the window. If input fills it there's no room to generate, and that failure looks like the model refusing to answer rather than a sizing problem.
>
> One thing that's easy to misattribute: KV cache memory per request scales with context length, so longer contexts reduce how many requests a deployment can serve concurrently. On a hosted API that shows up as throughput limits rather than a memory error — so a system that's slower under load specifically with long contexts is hitting this, not something in your code."

## 8. Likely Follow-ups

**Q: Why isn't the window size the real constraint?**
Because cost, TTFT, KV cache memory, and the lost-in-the-middle effect all bind earlier. A RAG system typically operates at five to twenty thousand tokens while the window allows far more — the window matters for what it enables, not as a target.

**Q: What's the KV cache's role?**
It holds keys and values for every processed token for the duration of generation, growing linearly with context length. That's the memory story, and it's why long contexts reduce how many requests can run concurrently on a given deployment.

**Q: What should you trim when over budget?**
The lowest-ranked retrieved chunks first, before history or the system instruction. The lowest-ranked chunk contributed least; the system instruction carries the grounding and abstention rules. Wrong-order trimming removes a control to keep a marginal document.

**Q: Why never truncate mid-chunk?**
Because a chunk cut halfway through a conditional rule reads as complete and states the rule without its condition. That's the omission failure — the most consequential hallucination type in banking — introduced by a truncation strategy rather than by the model.

**Q: What's easy to misattribute?**
Throughput degradation under load with long contexts. KV cache memory scales with context length, so concurrency falls — and on a hosted API that appears as slowness rather than a memory error, so it gets blamed on application code.

## 9. Common Mistakes

- Treating the context window as a target to fill.
- No token counting before sending.
- Truncating mid-chunk.
- Not reserving headroom for the output.
- Trimming history or instructions before low-ranked chunks.

## 10. What to Remember

- **Attention is quadratic; KV cache is linear** — practical limits precede the ceiling.
- **The window enables larger chunks**, it isn't a target.
- **Count tokens before sending**; degrade rather than fail.
- **Never truncate mid-chunk** — it creates omission failures.
- **Reserve output headroom**; input and output share the window.
