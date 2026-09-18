# Context Length

> **Phase 03 · TRANSFORMERS · Topic 22**

## 1. Definition

The maximum number of tokens a model can process in one forward pass — prompt plus generated output together. It's bounded by what the model was trained on (positional encoding range) and by memory (KV cache and attention).

## 2. Simple Explanation

The context window is everything the model can see at once: system prompt, conversation history, retrieved documents, the question, and the answer being generated.

Exceed it and something must be dropped. Approach it and cost and latency rise steeply, and quality often degrades before you hit the limit.

## 3. How It Works

**Two separate constraints:**

```
1. TRAINED RANGE
   Positional encodings were learned or applied over positions
   0..max_train_len. Beyond that the model has never seen the
   positional signal.
   → RoPE can be EXTENDED (interpolation, NTK-aware, YaRN)
   → learned position tables CANNOT — no embedding exists

2. MEMORY
   KV cache = 2 · layers · kv_heads · head_dim · n · batch · bytes
   Attention scores = O(n²) per head per layer
   → both scale with n; the cache usually binds first
```

**Where context is consumed:**

```
system prompt        400
conversation history 2,000
retrieved chunks     3,000
question               50
reserved for answer  1,000
                     ──────
                     6,450 of your window
```

## 4. Practical Example

**Long context is not free capacity, and that's the practical point:**

```
COST       input tokens are billed per request. 100k context at
           high volume is a substantial recurring bill.

LATENCY    prefill is compute-bound and scales with prompt length.
           A 100k-token prompt has a materially worse TTFT
           than a 5k one.

QUALITY    the "lost in the middle" effect — models retrieve
           information from the start and end of a long context
           more reliably than from the middle (Liu et al., TACL 2024).

MEMORY     KV cache grows linearly with n, reducing how many
           concurrent requests fit in memory.
```

**The RAG-vs-long-context question, answered honestly:**

```
"Long context makes RAG obsolete" — no.

· Most enterprise corpora far exceed any window. 12,000 documents
  doesn't fit regardless.
· Cost and latency scale with tokens; retrieval is a relevance
  filter that keeps the prompt small.
· Quality degrades on buried information.
· No access control — you can't put only what a user is entitled
  to see into a window you're filling indiscriminately.

What long context DOES change: chunks can be larger, top-k can
be higher, and the penalty for imperfect retrieval is lower.
It makes RAG more forgiving, not unnecessary.
```

**Context extension, mechanically:**

```
Model trained at 4k, want 32k:

Position interpolation — scale positions so 32k maps into the
  trained 4k range. Short fine-tune. Cheap and effective.
NTK-aware / YaRN — adjust rotation frequencies non-uniformly
  rather than compressing everything, preserving high-frequency
  detail better.

Both require RoPE. You cannot extend a learned position table.
Naive extrapolation without adaptation degrades badly.
```

## 5. Why It Matters

- **Context budgeting is a real design constraint** in any RAG or agent system.
- **The "lost in the middle" effect** means more context isn't monotonically better.
- **The RAG-vs-long-context question comes up constantly**, and the nuanced answer is the differentiator.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Filling the window because it's there** | Cost, latency, and quality all degrade |
| **Key information mid-context** | Lower retrieval reliability |
| **No budget accounting** | Overflow truncates something, often silently |
| **Truncating mid-chunk** | Half a fact is worse than none |
| **History crowding out retrieval** | Summarize old turns instead |
| **Naive context extension** | Repetitive or incoherent output at long range |

**Budget management, in order of preference:**

```
1. Retrieve fewer, better chunks (rerank, similarity floor)
2. Summarize older conversation turns
3. Drop whole chunks — never truncate one mid-content
4. Order by relevance to the EDGES, not top-to-bottom
```

**On advertised vs. effective context:** a model may advertise 128k while performing measurably worse on information retrieval beyond a much shorter range. "Needle in a haystack" evaluations test this, and results vary by model and by where the needle sits. Worth evaluating on your own data rather than trusting the number on the spec sheet.

## 7. Interview Answer

> "Context length is the maximum tokens the model processes in one pass — prompt and generated output together. It's bounded by two things: the positional range the model was trained on, and memory, primarily the KV cache.
>
> The practical point I'd make is that a long context window is not free capacity to fill. Cost scales with input tokens on every request. Prefill is compute-bound and scales with prompt length, so a hundred-thousand-token prompt has materially worse time-to-first-token. And quality degrades — there's a documented 'lost in the middle' effect where models retrieve information from the start and end of a long context more reliably than from the middle.
>
> On the RAG-versus-long-context question: long context doesn't make RAG obsolete. Most enterprise corpora far exceed any window — twelve thousand documents doesn't fit regardless. Cost and latency scale with tokens, and retrieval is a relevance filter keeping the prompt small. Quality degrades on buried information. And crucially, there's no access control in a window you fill indiscriminately — retrieval is where you enforce entitlements.
>
> What long context does change is that chunks can be larger, top-k can be higher, and the penalty for imperfect retrieval is lower. It makes RAG more forgiving rather than unnecessary.
>
> On extension: a model trained at 4k can be extended to 32k with position interpolation — scaling positions into the trained range, plus a short fine-tune — or NTK-aware scaling and YaRN, which adjust rotation frequencies non-uniformly. Both require RoPE; you can't extend a learned position table. And naive extrapolation without adaptation degrades badly, typically into repetitive or incoherent output at long range.
>
> One caveat: advertised context and effective context differ. I'd evaluate retrieval reliability across positions on my own data rather than trusting the spec sheet number."

## 8. Likely Follow-ups

**Q: Does long context make RAG obsolete?**
No. Enterprise corpora exceed any window, cost and latency scale with tokens, quality degrades on buried information, and you can't enforce access control by filling a window indiscriminately. What it changes is that chunks can be larger and imperfect retrieval is less costly — it makes RAG more forgiving, not unnecessary.

**Q: What is "lost in the middle"?**
A documented finding that models retrieve information from the beginning and end of a long context more reliably than from the middle, producing a U-shaped accuracy curve by position. The practical response is placing the highest-relevance chunks at the edges rather than in straight ranked order, and keeping contexts shorter so there's less middle.

**Q: How do you extend a model's context?**
Position interpolation scales positions so the longer range maps into the trained range, followed by a short fine-tune. NTK-aware scaling and YaRN adjust rotation frequencies non-uniformly, preserving high-frequency positional detail better. Both require RoPE — a learned position table has no embedding for unseen positions and can't be extended.

**Q: How do you manage the context budget?**
Account for everything up front — system prompt, history, retrieved chunks, question, and reserved space for the answer. Then in order: retrieve fewer and better chunks, summarize older conversation turns, and drop whole chunks rather than truncating one. And order the final context with the best chunks at the edges.

**Q: Is advertised context the same as usable context?**
Often not. A model may advertise 128k while performing measurably worse at retrieving information beyond a much shorter range, and the degradation pattern varies by model and by position. Needle-in-a-haystack evaluations test this, and I'd run one on my own data rather than trusting the spec sheet.

## 9. Common Mistakes

- Treating the context window as free capacity to fill.
- Claiming long context makes RAG obsolete.
- Ordering chunks top-to-bottom by rank, burying the best one mid-context.
- Truncating a chunk to fit rather than dropping it.
- Assuming advertised context equals effective context.

## 10. What to Remember

- **Prompt + output, bounded by trained positional range and memory.**
- **Not free capacity** — cost, latency, and quality all degrade as you fill it.
- **Lost in the middle:** put the best chunks at the start and end.
- **Long context makes RAG more forgiving, not unnecessary** — corpus size, cost, and access control all remain.
- **Extension needs RoPE** (interpolation / NTK / YaRN); learned tables can't extend.
