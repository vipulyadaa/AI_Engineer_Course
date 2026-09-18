# Streaming

> **Phase 24 · LLM PERFORMANCE · Topic 07**

## 1. Definition

Returning generated tokens as they're produced rather than waiting for the complete response. It doesn't reduce total generation time — it changes what the user waits for, which is the largest perceived-latency improvement available.

## 2. Simple Explanation

Without streaming, the user waits three seconds and then sees everything. With streaming, they wait six hundred milliseconds and then read as it arrives.

Same total time. Completely different experience — and reading time overlaps with generation, so the effective wait is only until the first token.

## 3. How It Works

```
WITHOUT STREAMING
  request ──────────────────────────────▶ full response
          [ 3 seconds of nothing ]

WITH STREAMING
  request ──▶ first token ──▶ ──▶ ──▶ complete
          600ms              then text appears steadily

The user is reading while the model is still generating,
so perceived latency ≈ TTFT rather than total time.
```

**That's why TTFT becomes the metric that matters** once streaming is enabled — total time stops being what the user experiences.

## 4. Practical Example

**What streaming complicates:**

```
STRUCTURED OUTPUT
  Partial JSON isn't parseable mid-stream. So a response
  forced into a schema can't stream.

  Resolution: stream the prose answer as text and return
  structured metadata separately — citations, confidence,
  abstention flag — rather than forcing everything into one
  schema and losing streaming.

OUTPUT VERIFICATION
  A grounding check needs the complete answer. If the check
  might cause abstention, you've already shown the user
  text you're about to retract.

  Resolutions:
    · verify first, then stream — loses the TTFT benefit
    · stream with a visible "checking sources" state before
      committing
    · stream, and correct visibly if verification fails

  For banking I'd verify before streaming anything
  containing a figure, and stream freely for explanatory
  content. That's a per-answer-type decision rather than a
  global one.
```

**That verification tension is the real design problem**, and it's specific to grounded systems — a general chatbot doesn't face it.

**Error handling mid-stream:**

```
A failure after 200 tokens have been sent can't be undone.

So: validate what can be validated before starting, and
have a defined behaviour for mid-stream failure — usually
appending a clear message rather than leaving a truncated
response that reads as complete.

A response cut off mid-sentence looks like the system
broke, which is worse than an explicit "I wasn't able to
complete that".
```

**Implementation notes:** streaming requires the whole path to support it — the model call, any middleware, and the client. A buffering proxy silently defeats it, and that's a common cause of "we enabled streaming and nothing changed".

## 5. Why It Matters

- **The largest perceived-latency improvement available**, and it's free.
- **It makes TTFT the metric that matters** rather than total time.
- **Verification before streaming** is a real tension specific to grounded systems.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Not streaming** | Users experience full generation time |
| **Buffering proxy in the path** | Streaming silently defeated |
| **Structured output forced** | Loses streaming entirely |
| **Streaming before verification** | Showing text you may retract |
| **Truncated response on error** | Reads as a complete answer |
| **Client not handling partial state** | UI flicker or incomplete rendering |

**On the per-answer-type decision:** verifying before streaming costs the TTFT benefit, so applying it universally throws away the main advantage. Verifying before streaming anything containing a figure or an eligibility determination, and streaming explanatory content freely, keeps the benefit where it's safe and the control where it matters.

**On what streaming doesn't fix:** total generation time, cost, and throughput are unchanged. A system with a genuine latency problem — a six-step agent taking twenty seconds — still has one; streaming just makes the first output appear sooner. It's a perception improvement, and describing it as a latency optimization overstates it.

## 7. Interview Answer

> "Streaming returns tokens as they're produced. It doesn't reduce total generation time — it changes what the user waits for. Three seconds of silence becomes six hundred milliseconds to first token and then text appearing, and the user reads while the model is still generating, so perceived latency is essentially TTFT rather than total time.
>
> That's the largest perceived-latency improvement available and it's free, so I'd enable it before any other latency work. It also makes TTFT the metric that matters, because total time stops being what the user experiences.
>
> What it complicates is worth being specific about. Structured output first: partial JSON isn't parseable mid-stream, so a response forced into a schema can't stream. The resolution is streaming the prose answer as text and returning structured metadata separately — citations, confidence, abstention flag — rather than forcing everything into one schema and losing streaming entirely.
>
> The harder one is output verification, and it's specific to grounded systems. A grounding check needs the complete answer, so if the check might cause abstention, streaming means you've already shown the user text you're about to retract.
>
> My resolution is a per-answer-type decision rather than a global one. Verify before streaming anything containing a figure or an eligibility determination — those are where being wrong matters and where a retraction is unacceptable. Stream explanatory content freely. That keeps the benefit where it's safe and the control where it counts, whereas verifying everything before streaming throws away the main advantage.
>
> On errors mid-stream: a failure after two hundred tokens can't be undone, so there needs to be a defined behaviour — usually appending a clear message rather than leaving a truncated response. A response cut off mid-sentence looks like the system broke, which is worse than an explicit statement that it couldn't complete.
>
> One implementation note that catches people: streaming requires the whole path to support it — the model call, any middleware, and the client. A buffering proxy silently defeats it, and that's the usual cause of 'we enabled streaming and nothing changed'.
>
> And I'd be precise that it's a perception improvement. Total generation time, cost, and throughput are unchanged. A six-step agent taking twenty seconds still takes twenty seconds — streaming just makes the first output appear sooner. Calling it a latency optimization overstates what it does."

## 8. Likely Follow-ups

**Q: Does streaming reduce latency?**
Not total latency — it changes what the user waits for. Perceived latency becomes TTFT rather than total time, because reading overlaps with generation. It's the largest perceived improvement available, but describing it as a latency optimization overstates it.

**Q: What does it conflict with?**
Structured output, since partial JSON isn't parseable mid-stream. The resolution is streaming the prose as text and returning structured metadata separately, rather than forcing the whole response into a schema and losing streaming.

**Q: How do you handle verification with streaming?**
Per answer type. Verify before streaming anything containing a figure or eligibility determination, where a retraction is unacceptable; stream explanatory content freely. Verifying everything first is safe and throws away the main benefit.

**Q: What happens on a mid-stream error?**
It can't be undone, so there needs to be defined behaviour — usually appending a clear message rather than leaving a truncated response. A cut-off sentence reads as a complete answer and looks like the system broke, which is worse than an explicit failure statement.

**Q: Why might enabling streaming change nothing?**
A buffering proxy or middleware in the path. Streaming needs support end to end — model call, middleware, and client — and any component that buffers the full response silently defeats it. It's the usual cause of that symptom.

## 9. Common Mistakes

- Not streaming at all.
- A buffering proxy silently defeating it.
- Forcing the whole response into a schema and losing streaming.
- Streaming figures before verifying them.
- Leaving a truncated response on a mid-stream failure.

## 10. What to Remember

- **Same total time, different experience** — perceived latency becomes TTFT.
- **Enable it before any other latency work** — free and largest impact.
- **Stream prose, return structure separately.**
- **Verify before streaming figures**; stream explanatory content freely.
- **Check the whole path** — a buffering proxy defeats it silently.
