# Prompt Length

> **Phase 24 · LLM PERFORMANCE · Topic 04**

## 1. Definition

The total size of the input sent to the model. It directly determines prefill time and therefore time to first token, and it also affects answer quality — not always in the direction people assume.

## 2. Simple Explanation

Longer prompts take longer to process before generation starts, and they cost more.

The less obvious part is that longer prompts can produce *worse* answers, because relevant material gets diluted and material in the middle of a long context is attended to less reliably.

## 3. How It Works

```
PROMPT COMPOSITION in a RAG request

  system instruction        400
  conversation history      600
  retrieved context      16,000   ← 94%
  user query                 50

EFFECTS OF LENGTH
  prefill time      scales with total input
  cost              scales with total input
  quality           NOT monotonic — improves with relevant
                    content, degrades with irrelevant
```

**The non-monotonic quality relationship is the point.** More context is not more information; past a point it's more noise.

## 4. Practical Example

**Lost in the middle:**

```
Models attend more reliably to content at the beginning and
end of a long context than to the middle.

So with 20 chunks, the chunk that answers the question
sitting at position 11 is used less reliably than the same
chunk at position 2.

CONSEQUENCES
  · rank order matters — put the best chunks first
  · with fewer chunks, everything is near an edge
  · adding marginal chunks can push the good one to the
    middle, making the answer worse

That last point is the one people don't expect: adding
context can lose information you already had.
```

**Measuring the actual relationship:**

```
Run the golden set at k = 20, 12, 8, 5 with reranking
constant, measuring groundedness, answer correctness, TTFT,
and cost.

Typical shape:
  quality  flat from 20 down to ~8, then falls
  TTFT     falls steadily with k
  cost     falls steadily with k

So the operating point is the k where quality starts
falling — and everything above it was costing time and
money for nothing.
```

**History as the silent growth:**

```
Retrieved context is bounded per request. History isn't —
it grows every turn and is re-sent every turn.

  turn 1:   600 tokens
  turn 10:  6,000 tokens

Policy: last 3-4 exchanges verbatim, older ones summarized,
original question always unchanged.
```

**What not to shorten:** breadcrumb prefixes, qualifying conditions in retrieved text, and the grounding and abstention instructions. Small, load-bearing, and cutting them saves nothing meaningful while removing either interpretability or a control.

## 5. Why It Matters

- **Quality is not monotonic in prompt length** — more context can be worse.
- **Lost in the middle** means adding chunks can bury the one that mattered.
- **The k inflection point** is measurable and everything above it is waste.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Assuming more context is better** | Dilution and lost-in-the-middle |
| **k set generously "to be safe"** | Costs time, money, and sometimes quality |
| **Rank order ignored** | Best chunks buried mid-context |
| **Unbounded history** | Grows every turn, re-sent every turn |
| **Cutting conditions to shorten** | Omission, not concision |
| **Never measuring the inflection** | Operating point chosen by guess |

**On rank order:** since position matters, the reranked order should be preserved when assembling context rather than re-sorted by document or date. And with a small number of chunks the effect largely disappears, which is another argument for fewer — everything sits near an edge.

**On long-context models:** a large context window means you *can* send a million tokens, not that you should. The lost-in-the-middle effect, cost, and TTFT all still apply. Long context loosens the constraint on chunk size and parent-document retrieval; it doesn't make filling the window a good idea.

## 7. Interview Answer

> "Prompt length determines prefill time and therefore time to first token, and it determines cost. The less obvious part is that it affects quality non-monotonically — more context is not more information, and past a point it's more noise.
>
> In a RAG request the retrieved context is about ninety-four percent of the input, so this is really a question about how many chunks to send.
>
> The mechanism that matters is lost in the middle. Models attend more reliably to content at the beginning and end of a long context than to the middle. So with twenty chunks, the one that answers the question sitting at position eleven is used less reliably than the same chunk at position two.
>
> That has a consequence people don't expect: adding marginal chunks can push the good one into the middle, so adding context can lose information you already had. The system gets worse by being given more.
>
> So I'd measure the relationship rather than assume it. Run the golden set at k of twenty, twelve, eight, and five with reranking held constant, measuring groundedness, answer correctness, TTFT, and cost. The typical shape is quality flat from twenty down to around eight and then falling, with TTFT and cost falling steadily throughout. The operating point is where quality starts to fall — and everything above it was costing time and money for nothing.
>
> Two consequences for assembly. Rank order matters, so the reranked order should be preserved when building the context rather than re-sorted by document or date. And with a small number of chunks the position effect largely disappears because everything sits near an edge — another argument for fewer.
>
> History is the silent growth. Retrieved context is bounded per request; history isn't. Six hundred tokens at turn one, six thousand by turn ten, re-sent every turn. The policy is the last three or four exchanges verbatim, older ones summarized, and the original question always unchanged as the anchor.
>
> What I wouldn't shorten: breadcrumb prefixes, qualifying conditions in retrieved text, and the grounding and abstention instructions. They're small, load-bearing, and cutting them saves nothing meaningful while removing either interpretability or a control.
>
> And on long-context models — a large window means you can send a million tokens, not that you should. Lost in the middle, cost, and TTFT all still apply. Long context loosens the constraint on chunk size and lets you use parent-document retrieval; it doesn't make filling the window a good idea."

## 8. Likely Follow-ups

**Q: Does more context improve answers?**
Not monotonically. Relevant content helps; irrelevant content dilutes, and the lost-in-the-middle effect means material in the centre of a long context is used less reliably. Adding marginal chunks can push the useful one into the middle and make the answer worse.

**Q: How do you choose k?**
By measuring. Run the golden set at several k values with reranking constant and find where quality starts falling — typically flat from twenty down to around eight. Everything above that inflection was costing TTFT and money without improving anything.

**Q: Does chunk order matter?**
Yes, because of position effects. The reranked order should be preserved when assembling context rather than re-sorted by document or date. And with fewer chunks the effect largely disappears, since everything sits near an edge — another reason fewer is better.

**Q: What about conversation history?**
It's the silent growth — bounded per request for retrieval but unbounded across turns, and re-sent every turn. Keep the last three or four exchanges verbatim, summarize older ones, and never compress the original question, which is the anchor against drift.

**Q: Does a long context window change this?**
It loosens the constraint on chunk size and enables parent-document retrieval, but lost in the middle, cost, and TTFT all still apply. A large window means you can send a million tokens, not that filling it is a good idea.

## 9. Common Mistakes

- Assuming more retrieved context is always better.
- Setting k generously without measuring the inflection.
- Re-sorting chunks by document or date after reranking.
- Unbounded conversation history.
- Treating a long context window as permission to fill it.

## 10. What to Remember

- **Quality is non-monotonic in length** — more context can be worse.
- **Lost in the middle** means adding chunks can bury the useful one.
- **Measure the k inflection** — everything above it is waste.
- **Preserve reranked order**; fewer chunks reduces the position effect.
- **A large window isn't permission to fill it.**
