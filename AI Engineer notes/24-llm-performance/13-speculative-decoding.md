# Speculative Decoding

> **Phase 24 · LLM PERFORMANCE · Topic 13**

## 1. Definition

Using a small fast model to draft several tokens ahead, then verifying them with the large model in a single pass — accepting the ones that match. It reduces latency without changing the output distribution.

## 2. Simple Explanation

Decoding is sequential: one token at a time, each requiring a full pass over the model. That's the bottleneck.

Speculative decoding has a small model guess the next few tokens, then the large model checks them all at once. Correct guesses are kept, so several tokens arrive for the cost of roughly one large-model pass.

## 3. How It Works

```
1. DRAFT    small model generates k tokens (say 4)
2. VERIFY   large model scores all k in ONE forward pass
3. ACCEPT   keep tokens matching what the large model would
            have produced; discard from the first mismatch
4. REPEAT

WHY IT'S FREE IN QUALITY TERMS
  The acceptance rule guarantees the output distribution is
  identical to the large model decoding alone.

  It's not an approximation — it's the same output, arrived
  at faster.
```

**That lossless property is what distinguishes it** from every other latency technique, which all trade something.

## 4. Practical Example

**Where the speedup comes from:**

```
Verifying k tokens costs ONE large-model pass — the same
as generating one token normally, because the bottleneck
is reading the weights, not the arithmetic.

So if 3 of 4 drafted tokens are accepted on average:
  → ~3 tokens per large-model pass instead of 1
  → roughly 2-3× decode speedup in practice

The acceptance rate drives everything, and it depends on
how well the draft model predicts the large one.
```

**When acceptance is high:**

```
Predictable text — boilerplate, structured output, common
phrasing, quoted material — drafts well.

A grounded RAG answer quoting a fee schedule contains a lot
of predictable text: "The international transfer fee is
$45.00 for standard accounts." Most of that is highly
predictable given the context.

So RAG generation is a relatively favourable case, which
isn't obvious.
```

**The honest scoping:**

```
This is a SERVING-SIDE technique. On a hosted API:
  · the provider may already use it
  · you can't enable, tune, or observe it
  · it's not a lever you have

It becomes relevant if you self-host — a reranker, a
classifier, or an open model on a dedicated endpoint.

For an interview, knowing the mechanism and being clear
that it's not applicable to hosted APIs is the right
answer. Describing it as something you'd "implement" in a
Vertex AI RAG system would be wrong.
```

**That scoping point matters** — it's a well-known technique that's frequently discussed as though it were generally available.

## 5. Why It Matters

- **It's lossless** — the output distribution is unchanged, unlike every other latency lever.
- **The acceptance rate drives the speedup**, and predictable text drafts well.
- **It's serving-side** — not a lever when calling a hosted API.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Not applicable on hosted APIs** | Provider-side; not yours to enable |
| **Low acceptance rate** | Wasted draft compute, little gain |
| **Draft model too large** | Drafting cost approaches the saving |
| **Draft model too small** | Poor acceptance |
| **Extra memory for two models** | Both resident |
| **Described as lossy** | It isn't — that's the distinguishing property |

**On the draft model trade-off:** it has to be fast enough that drafting is cheap and close enough to the large model that acceptance is high. Too small and few tokens are accepted; too large and you're paying most of the cost you were avoiding. In practice the draft model is typically an order of magnitude smaller.

**On what it doesn't help:** TTFT is unchanged, because prefill still has to process the whole input. Speculative decoding accelerates the decode phase only — so for a request with a large context and a short answer, it does very little. It helps most where output is long relative to input, which is the opposite of the typical RAG profile.

## 7. Interview Answer

> "Decoding is sequential — one token at a time, each requiring a full pass over the model, and that's the bottleneck. Speculative decoding has a small fast model draft several tokens ahead, then the large model verifies them all in a single forward pass and accepts the ones matching what it would have produced.
>
> The reason it works is that verifying k tokens costs one large-model pass — the same as generating one token normally, because the bottleneck is reading the weights rather than the arithmetic. So if three of four drafted tokens are accepted on average, you get about three tokens per large-model pass instead of one, which is typically a two to three times decode speedup.
>
> The property that distinguishes it from every other latency technique is that it's lossless. The acceptance rule guarantees the output distribution is identical to the large model decoding alone — it's not an approximation, it's the same output arrived at faster. Everything else on the latency list trades something; this doesn't.
>
> The acceptance rate drives everything, and it depends on how well the draft model predicts the large one. Predictable text drafts well — boilerplate, structured output, common phrasing, quoted material. And a grounded RAG answer quoting a fee schedule contains a lot of predictable text, so RAG generation is a relatively favourable case, which isn't obvious.
>
> But I'd be clear about scope. This is a serving-side technique. On a hosted API the provider may already use it, and you can't enable, tune, or observe it — it isn't a lever you have. It becomes relevant if you self-host something: a reranker, a classifier, or an open model on a dedicated endpoint. Describing it as something I'd implement in a Vertex AI RAG system would be wrong, and it's a technique that gets discussed as though it were generally available.
>
> Two limits worth knowing. It doesn't help TTFT at all, because prefill still processes the whole input — it accelerates decode only. So for a request with a large context and a short answer, which is the typical RAG profile, it does relatively little. It helps most where output is long relative to input.
>
> And the draft model is a balance: fast enough that drafting is cheap, close enough to the large model that acceptance is high. Too small and few tokens are accepted; too large and you're paying most of the cost you were trying to avoid. In practice it's typically an order of magnitude smaller."

## 8. Likely Follow-ups

**Q: How does it work?**
A small model drafts several tokens, the large model verifies them all in one forward pass, and tokens matching what the large model would have produced are accepted. Verifying k tokens costs one pass, so several tokens arrive for the price of one.

**Q: Does it change the output?**
No — that's what distinguishes it. The acceptance rule guarantees the output distribution is identical to the large model decoding alone. It's lossless, where every other latency technique trades something.

**Q: What determines the speedup?**
The acceptance rate, which depends on how well the draft model predicts the large one. Predictable text drafts well, so structured output and quoted material accept at a higher rate — making grounded RAG generation a relatively favourable case.

**Q: Is it available on a hosted API?**
No. It's serving-side, so the provider may use it but you can't enable, tune, or observe it. It's relevant only if you self-host a model, and it's frequently discussed as though it were generally available when it isn't.

**Q: What doesn't it help?**
TTFT, because prefill still processes the whole input — it accelerates decode only. For a large context and a short answer, which is the typical RAG profile, it does relatively little. It helps most where output is long relative to input.

## 9. Common Mistakes

- Proposing it as an optimization for a hosted-API system.
- Describing it as lossy or approximate.
- Expecting it to improve TTFT.
- A draft model sized wrongly in either direction.
- Assuming it helps a short-output, large-context workload.

## 10. What to Remember

- **Draft with a small model, verify k tokens in one large pass.**
- **Lossless** — identical output distribution, unlike every other lever.
- **The acceptance rate drives the speedup**; predictable text drafts well.
- **Serving-side only** — not available on hosted APIs.
- **Accelerates decode, not TTFT** — limited value for short answers.
