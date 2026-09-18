# Text

> **Phase 19 · GOOGLE GEMINI · Topic 04**

## 1. Definition

Gemini's core text generation interface — messages in, generated text out, controlled by generation config parameters and a system instruction.

## 2. Simple Explanation

The text path is the one you'll use most. A system instruction sets behaviour, the conversation provides context, and generation config controls how the output is sampled.

The parameters that matter for a grounded banking system are temperature, max output tokens, and the safety settings — and the right temperature is lower than most defaults.

## 3. How It Works

```python
model = GenerativeModel(
    "gemini-2.0-flash-001",                    # pinned version
    system_instruction=(
        "You answer questions about banking products using "
        "ONLY the provided context. Cite the source for every "
        "factual claim. If the context does not contain the "
        "answer, say so."
    ),
)

response = model.generate_content(
    contents,
    generation_config=GenerationConfig(
        temperature=0.1,           # near-deterministic
        max_output_tokens=1024,
        top_p=0.95,
    ),
)
```

**System instruction is separate from the conversation.** It persists across turns and is the right place for behavioural rules, which makes it more robust than prepending instructions to the user message.

## 4. Practical Example

**Generation config for a banking RAG system:**

```
temperature = 0 to 0.2
  The task is faithful reporting of retrieved content, not
  creative variation. Higher temperature means the same
  question can produce different figures on different runs —
  which is indefensible when the answer is a fee.

max_output_tokens
  Set it. Without a cap, a runaway generation costs money
  and latency for output nobody reads.

top_p / top_k
  Leave near defaults. Tuning both temperature and top_p
  simultaneously makes behaviour hard to reason about;
  temperature is the lever to use.

stop_sequences
  Useful when output must end at a boundary.
```

**Temperature zero is not fully deterministic** — the same request can still produce slightly different output due to floating-point non-determinism in distributed inference. For a banking system that means you can't promise identical answers; what you *can* promise is that answers are grounded and cited, which is the stronger guarantee anyway.

**Streaming:**

```python
for chunk in model.generate_content(contents, stream=True):
    yield chunk.text
```

**Streaming is the largest perceived-latency improvement available** — a four-second wait becomes a sub-second time-to-first-token plus reading time. For a chat interface it should be the default.

**Token counting before sending:** `model.count_tokens(contents)` lets you check against the context limit and estimate cost before making the call, which is what makes budget enforcement possible rather than retrospective.

## 5. Why It Matters

- **Low temperature** is the correct setting for grounded answering, and the reason is auditability.
- **Streaming** is the biggest perceived-latency win and costs nothing.
- **Temperature 0 isn't fully deterministic** — an honest point most people get wrong.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Default temperature** | Too high for grounded answering |
| **No max output tokens** | Runaway generations |
| **Tuning temperature and top_p together** | Behaviour hard to reason about |
| **Claiming determinism at temperature 0** | Not strictly true |
| **Instructions in the user message** | Less robust than a system instruction |
| **Not counting tokens before sending** | Budget enforcement becomes retrospective |

**On finish reasons:** always check why generation stopped. `MAX_TOKENS` means the answer was cut off mid-sentence; `SAFETY` means a filter blocked it. Treating a truncated response as a complete answer is a real bug, and the finish reason is the only signal.

**On system instruction placement:** behavioural rules in the system instruction survive across turns and are harder for user input to override than instructions prepended to a user message. It isn't a security boundary — tool-level controls are — but it's meaningfully more robust.

## 7. Interview Answer

> "The text path is a system instruction setting behaviour, the conversation providing context, and a generation config controlling sampling.
>
> For a banking RAG system I'd run temperature at zero to 0.2. The task is faithful reporting of retrieved content, not creative variation — and at higher temperature the same question can produce different figures on different runs, which is indefensible when the answer is a fee.
>
> I'd set max output tokens explicitly, because without a cap a runaway generation costs money and latency for output nobody reads. And I'd leave top_p and top_k near defaults — tuning both temperature and top_p simultaneously makes behaviour hard to reason about, and temperature is the lever that does the work.
>
> One honest point: temperature zero isn't fully deterministic. Floating-point non-determinism in distributed inference means the same request can produce slightly different output. So I wouldn't promise identical answers. What I can promise is that answers are grounded and cited, which is the stronger guarantee anyway — and it's better to state that than to claim determinism that doesn't hold.
>
> The behavioural rules go in the system instruction rather than prepended to the user message. It persists across turns and is harder for user input to override. It isn't a security boundary — tool-level controls are — but it's meaningfully more robust.
>
> On latency, streaming is the biggest perceived improvement available and it costs nothing. A four-second wait becomes a sub-second time to first token plus reading time, so for a chat interface it should be the default.
>
> Two operational details. I'd use count_tokens before sending, so I can check against the context limit and estimate cost before the call — that's what makes budget enforcement proactive rather than retrospective.
>
> And I'd always check the finish reason. MAX_TOKENS means the answer was cut off mid-sentence; SAFETY means a filter blocked it. Treating a truncated response as complete is a real bug, and the finish reason is the only signal you get."

## 8. Likely Follow-ups

**Q: What temperature for a RAG system?**
Zero to 0.2. The task is faithful synthesis from retrieved context, not creative generation, and higher temperature means the same question can yield different figures on different runs — which can't be defended when the answer is a fee or an eligibility determination.

**Q: Is temperature 0 deterministic?**
Not strictly. Floating-point non-determinism in distributed inference means identical requests can produce slightly different output. So I wouldn't promise identical answers — the promise worth making is that answers are grounded and cited, which is stronger and actually holds.

**Q: Where do behavioural rules belong?**
The system instruction, which persists across turns and is harder for user input to override than instructions prepended to a user message. It's more robust, though it's not a security boundary — tool-level controls are what actually contain behaviour.

**Q: What's the biggest latency improvement?**
Streaming. It doesn't reduce total generation time but it changes a four-second wait into a sub-second time-to-first-token plus reading time. For a chat interface that's a larger perceived improvement than any retrieval optimization, and it costs nothing to enable.

**Q: What do you check on the response?**
The finish reason. MAX_TOKENS means the answer was truncated mid-sentence and SAFETY means a filter blocked it — both look like ordinary responses otherwise. Treating a truncated response as a complete answer is a real and easily-missed bug.

## 9. Common Mistakes

- Leaving temperature at the default for grounded answering.
- Claiming temperature 0 gives deterministic output.
- Not setting max output tokens.
- Putting behavioural instructions in the user message.
- Not checking the finish reason.

## 10. What to Remember

- **Temperature 0–0.2** for grounded banking answers.
- **Temperature 0 isn't strictly deterministic** — promise grounding instead.
- **System instruction for behavioural rules**, not the user message.
- **Stream** — the biggest perceived-latency win, for free.
- **Count tokens before sending; check the finish reason after.**
