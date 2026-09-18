# Output Tokens

> **Phase 25 · LLM COST OPTIMIZATION · Topic 02**

## 1. Definition

The tokens the model generates. Priced several times higher per token than input, and the component with the most direct relationship to latency — total generation time is roughly linear in output length.

## 2. Simple Explanation

Output is smaller in volume than input in a RAG system but costs more per token, and it's what the user waits for.

So a shorter answer is cheaper *and* faster — and in a grounded banking system it's usually a better answer too.

## 3. How It Works

```
cost  = input_tokens × input_rate
      + output_tokens × output_rate      ← higher rate

latency ≈ TTFT + (output_tokens × per-token time)

Output is typically 300-800 tokens in a RAG answer against
17,000 input — so it's a smaller share of cost despite the
higher rate, but it's most of the latency.
```

**Output is where latency lives and input is where cost lives.** Both matter and they respond to different levers, which is why treating them together obscures the decision.

## 4. Practical Example

**Controlling length without degrading answers:**

```
1. INSTRUCT CONCISENESS EXPLICITLY
   "Answer in 2-4 sentences. State the figure and the
    condition. Do not restate the question."
   → the single largest lever, and free

2. CAP max_output_tokens
   A safety bound, not a length control. It truncates
   mid-sentence, which is worse than a short answer — so
   set it above the intended length, as a runaway guard.

3. STRUCTURE THE OUTPUT
   A short answer plus citations beats a paragraph
   restating the context.

4. NO PREAMBLE
   "Based on the information provided, I can tell you
    that..." is 12 wasted tokens on every single answer.
```

**Point 4 compounds:** twelve tokens per answer across ten million answers a day is a hundred and twenty million tokens for text nobody reads.

**Why shorter is usually better in banking:**

```
A customer asking about a fee wants the figure and the
condition. A four-paragraph answer:
  · buries the figure
  · states things that weren't asked and weren't verified
  · increases the surface for an unsupported claim
  · takes longer to arrive

So conciseness isn't a cost compromise here — it's the
correct product behaviour that happens to be cheaper.
```

**Where output length must not be cut:** conditions and qualifications. "The fee is $25" is shorter than "The fee is $25 for Premier customers, with the first two transfers each calendar month waived" — and dropping the conditions is the omission hallucination, not a conciseness win.

## 5. Why It Matters

- **Output is most of the latency**; input is most of the cost.
- **Explicit length instruction** is the largest lever and it's free.
- **Never cut conditions** — that's omission, not concision.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **max_output_tokens as a length control** | Truncates mid-sentence |
| **No length instruction** | Models default to verbose |
| **Preamble on every answer** | Compounds at volume |
| **Cutting conditions to be concise** | Omission hallucination |
| **Streaming absent** | The user waits for the whole generation |
| **Reasoning tokens uncounted** | Thinking modes generate billable tokens |

**On thinking modes:** models with reasoning modes generate tokens before the answer, and those are billable output. For a mechanical task like grounded synthesis that's cost with no gain, so reasoning should be applied by step type rather than globally — on for planning, off for straightforward answering.

**On streaming:** it doesn't reduce output tokens or total generation time, but it changes what the user experiences from a four-second wait to a sub-second first token plus reading time. It's the largest perceived-latency improvement available and it's free — so it should be enabled before any length optimization is considered.

## 7. Interview Answer

> "Output tokens are priced several times higher per token than input, but in a RAG system they're a smaller share of the bill — maybe three to eight hundred tokens against seventeen thousand of input. Where output dominates is latency, because total generation time is roughly linear in output length.
>
> So the useful framing is: input is where cost lives, output is where latency lives. They respond to different levers, and treating them together obscures the decision.
>
> The largest lever on output is instructing conciseness explicitly — 'answer in two to four sentences, state the figure and the condition, do not restate the question.' That's free and models default to verbose without it.
>
> I'd use max_output_tokens as a runaway guard rather than a length control, set above the intended length. It truncates mid-sentence, which is worse than a short answer — a cut-off response looks like a system failure.
>
> And I'd remove preamble. 'Based on the information provided, I can tell you that...' is twelve wasted tokens on every answer, which at ten million answers a day is a hundred and twenty million tokens for text nobody reads.
>
> In banking, shorter is usually better anyway. A customer asking about a fee wants the figure and the condition. A four-paragraph answer buries the figure, states things that weren't asked and weren't verified, increases the surface for an unsupported claim, and takes longer to arrive. So conciseness isn't a cost compromise — it's correct product behaviour that happens to be cheaper.
>
> With one hard exception: conditions and qualifications must never be cut. 'The fee is twenty-five dollars' is shorter than 'the fee is twenty-five dollars for Premier customers, with the first two transfers each calendar month waived' — and dropping those conditions is the omission hallucination, not a concision win. That's the most consequential failure in banking answers, so concision instructions need to be explicit that conditions are preserved.
>
> Two other things. Thinking modes generate billable tokens before the answer. For a mechanical task like grounded synthesis that's cost with no gain, so reasoning should be applied per step type — on for planning, off for straightforward answering.
>
> And streaming. It doesn't reduce output tokens or generation time, but it turns a four-second wait into a sub-second first token plus reading time. It's the largest perceived-latency improvement available and it's free, so I'd enable it before considering any length optimization at all."

## 8. Likely Follow-ups

**Q: How do output and input differ in impact?**
Input is most of the cost in RAG because retrieved context is large; output is most of the latency because generation time is roughly linear in tokens produced. Different levers, so treating them together obscures which to pull.

**Q: What's the largest output lever?**
An explicit conciseness instruction — stating a target length and what to include. Models default to verbose without one, and it costs nothing. max_output_tokens is a runaway guard rather than a length control, since it truncates mid-sentence.

**Q: Is shorter always better?**
Usually, with one hard exception: conditions and qualifications must be preserved. "The fee is twenty-five dollars" versus "for Premier customers, with the first two each month waived" — dropping that is omission hallucination, which is the most consequential failure in banking answers.

**Q: What about reasoning modes?**
They generate billable tokens before the answer. For mechanical grounded synthesis that's cost with no gain, so reasoning should be applied per step type rather than globally — enabled for planning steps, disabled for straightforward answering.

**Q: Where does streaming fit?**
Before any length optimization. It doesn't reduce tokens or generation time, but it changes a four-second wait into a sub-second first token plus reading time. Largest perceived-latency improvement available, and free.

## 9. Common Mistakes

- Using max_output_tokens to control length rather than as a guard.
- No explicit conciseness instruction.
- Preamble phrases on every answer.
- Cutting qualifying conditions in the name of brevity.
- Enabling reasoning modes globally rather than per step type.

## 10. What to Remember

- **Input is cost; output is latency.** Different levers.
- **Explicit length instruction** is the largest and cheapest lever.
- **`max_output_tokens` is a guard**, not a length control.
- **Never cut conditions** — that's omission, not concision.
- **Stream first** — free, and the biggest perceived improvement.
