# Tool Use

> **Phase 19 · GOOGLE GEMINI · Topic 11**

## 1. Definition

The broader pattern of Gemini calling capabilities — your own functions, Google Search grounding, code execution, and Vertex AI Search — within one request, with different tools carrying very different trust and governance implications.

## 2. Simple Explanation

Function calling is one kind of tool. Gemini also offers built-in tools: grounding with Google Search, code execution, and retrieval from Vertex AI Search.

The important distinction is that built-in tools execute on Google's side, while your functions execute on yours — and that changes what controls you have.

## 3. How It Works

```
YOUR FUNCTIONS       you execute → you validate, authorize,
                     audit, and bound

GOOGLE SEARCH        Google executes → the model sees public
GROUNDING            web content you didn't vet

CODE EXECUTION       Google executes → sandboxed code the
                     model wrote

VERTEX AI SEARCH     Google executes → your indexed corpus,
                     with its own access controls
```

**That column on the right is the whole governance story.** With your own functions you hold every control point; with built-in tools you hold fewer.

## 4. Practical Example

**Google Search grounding, assessed honestly:**

```
WHAT IT GIVES
  current information beyond the training cutoff, with
  source links

WHAT IT COSTS IN BANKING
  · the model sees public web content nobody reviewed
  · that content can contain injected instructions —
    indirect prompt injection from an uncontrolled source
  · an answer about your products might be grounded in a
    third-party comparison site that's wrong or outdated
  · you cannot restrict which sources it reaches

For a customer-facing banking assistant, answers must be
grounded in OUR documentation. Web grounding is the opposite
of that requirement.
```

**So my position:** Google Search grounding is excellent for general-knowledge assistants and wrong for a system whose core requirement is answering from an approved corpus. That's not a limitation of the feature — it's a mismatch with the use case.

**Code execution:**

```
Useful for arithmetic and data manipulation the model would
otherwise do unreliably — computing a fee difference across
several transactions, for instance.

The value is that a computed number is correct, where a
model-generated number may not be.

But it's sandboxed code written by the model, so I'd use it
for calculation over data already in context, not as a
general capability. And a computed result still needs its
inputs cited.
```

**Combining tools:** a request can declare your functions alongside a built-in tool, and the model chooses among them. That makes source selection a model decision, which is another reason to be deliberate about which built-in tools are enabled at all.

## 5. Why It Matters

- **Built-in tools execute on Google's side**, so you hold fewer controls.
- **Web grounding contradicts the grounded-in-our-corpus requirement** — the key judgment.
- **Code execution makes numbers correct**, which model generation doesn't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Web grounding in a closed-corpus system** | Answers from unvetted sources |
| **Indirect injection via web content** | An uncontrolled attack surface |
| **No source restriction on Search** | Can't limit what it reaches |
| **Code execution as a general capability** | Sandboxed model-written code |
| **Built-in tools reducing your control** | Fewer validation and audit points |
| **Mixing tools without governance** | Source selection becomes a model decision |

**On the injection surface:** with your own retrieval you control what enters the corpus and can review it. Web grounding means arbitrary public content enters the context, and content containing instruction-like text is a genuine indirect injection vector. The defence is the same as always — tool-level limits on what the model can actually do — but the surface is much larger and not yours to manage.

**On Vertex AI Search as a built-in tool:** unlike web grounding, this retrieves from *your* indexed corpus with its own access controls, so it's a legitimate option. The trade is less control over retrieval parameters than calling your own retrieval function, which matters if you need custom filtering, thresholds, or reranking.

## 7. Interview Answer

> "Tool use in Gemini covers your own functions plus built-in tools: Google Search grounding, code execution, and Vertex AI Search. The distinction that matters is where they execute. Your functions execute on your side, so you hold every control point — validation, authorization, audit, bounding. Built-in tools execute on Google's side, so you hold fewer.
>
> On Google Search grounding, I'd be direct: it's excellent for general-knowledge assistants and wrong for a banking system. Our core requirement is that answers are grounded in approved documentation. Web grounding means the model sees public content nobody reviewed, that content can contain injected instructions from a source we don't control, and an answer about our own products might be grounded in a third-party comparison site that's wrong or outdated. You also can't restrict which sources it reaches. That's a mismatch with the use case rather than a flaw in the feature.
>
> The injection point is worth drawing out. With our own retrieval we control what enters the corpus and can review it. Web grounding means arbitrary public content enters the context, which is a genuine indirect injection vector — and the surface is much larger and not ours to manage. The defence is the same as always, tool-level limits on what the model can actually do, but I'd rather not open the surface at all.
>
> Code execution I'd use narrowly and for a specific reason: a computed number is correct, where a model-generated number may not be. Computing a fee difference across several transactions in code rather than having the model do arithmetic removes a real error source. But it's sandboxed code the model wrote, so I'd use it for calculation over data already in context rather than as a general capability — and the computed result still needs its inputs cited.
>
> Vertex AI Search as a built-in tool is different from web grounding — it retrieves from our own indexed corpus with its own access controls, so it's a legitimate option. The trade is less control over retrieval parameters than calling our own retrieval function, which matters if we need custom filtering, thresholds, or reranking.
>
> And one governance point: a request can declare our functions alongside built-in tools, and the model chooses among them. That makes source selection a model decision, which is a reason to be deliberate about which built-in tools are enabled at all."

## 8. Likely Follow-ups

**Q: Would you use Google Search grounding in banking?**
No, for a customer-facing assistant. The requirement is answers grounded in our approved documentation, and web grounding does the opposite — unvetted public content, no source restriction, and answers about our products potentially grounded in a third-party site that's wrong.

**Q: What's the security concern with web grounding?**
Indirect prompt injection from an uncontrolled source. With our own corpus we control and review what's indexed; web grounding admits arbitrary public content, and content containing instruction-like text is a real vector. The surface is large and not ours to manage.

**Q: Is code execution useful?**
Narrowly. Its value is that a computed number is correct where a model-generated one may not be, so it's worth using for arithmetic over data already in context. But it's sandboxed model-written code, so I'd keep it to calculation rather than treating it as a general capability.

**Q: What about Vertex AI Search as a built-in tool?**
That's different from web grounding — it retrieves from your own indexed corpus with its own access controls, so it's a legitimate option. The trade is less control over retrieval parameters than calling your own retrieval function, which matters if you need custom filtering or reranking.

**Q: Can you mix your functions with built-in tools?**
Yes, and the model chooses among them. That makes source selection a model decision, which is a reason to be deliberate about which built-in tools are enabled — an unintended web-grounded answer in a closed-corpus system is a governance failure, not just a quality one.

## 9. Common Mistakes

- Enabling web grounding in a closed-corpus banking system.
- Treating built-in tools as equivalent to your own in terms of control.
- Using code execution as a general capability rather than for calculation.
- Not citing the inputs to a computed result.
- Mixing tool types without deciding how source selection should work.

## 10. What to Remember

- **Your functions: full control. Built-in tools: less.**
- **Web grounding contradicts the grounded-in-our-corpus requirement.**
- **It's also an uncontrolled indirect injection surface.**
- **Code execution makes numbers correct** — use it for arithmetic, narrowly.
- **Vertex AI Search is legitimate**, with less retrieval control than your own function.
