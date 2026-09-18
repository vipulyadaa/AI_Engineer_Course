# Prompt Compression

> **Phase 24 · LLM PERFORMANCE · Topic 14**

## 1. Definition

Reducing input tokens by removing or condensing content before sending — through token-level pruning, summarization, or extraction. In a RAG system it's usually the wrong tool, because it treats a retrieval problem as a compression problem.

## 2. Simple Explanation

If the context is too long, you can compress it or you can retrieve less.

Retrieving less is better: it's cheaper, it's lossless with respect to what you kept, and it doesn't risk dropping the condition that makes an answer correct.

## 3. How It Works

```
APPROACHES

TOKEN PRUNING      remove low-information tokens from the
                   context
                   → lossy in an unpredictable way

SUMMARIZATION      condense chunks with a model call
                   → costs a call; lossy

EXTRACTION         pull only the sentences relevant to the
                   query
                   → costs a call; can drop conditions

RETRIEVE LESS      fewer, better-reranked chunks
                   → free, and usually improves quality
```

**The fourth option dominates the first three in a RAG system**, which is why compression rarely earns its place there.

## 4. Practical Example

**Why compression is dangerous in banking specifically:**

```
SOURCE   "International transfer fees are waived for the
          first two transactions per calendar month for
          Premier and Private tier customers."

COMPRESSED (extractive, query = "are transfers free?")
         "International transfer fees are waived for the
          first two transactions per calendar month."

The tier condition is gone — and it was dropped by a
compression step, not by the model.

That's the omission failure, introduced by an
optimization. The model then generates a correct summary
of incorrect context, so grounding verification passes.
```

**That's the decisive argument:** compression can manufacture the exact failure the verification layer is designed to catch, in a way verification can't detect.

**Where compression does have a place:**

```
CONVERSATION HISTORY
  Summarizing older turns is legitimate — the detail
  matters less once the exchange is complete, and the
  alternative is unbounded growth.
  Keep recent turns verbatim and the original question
  unchanged.

AGENT REASONING
  Dropping the model's reasoning from completed steps while
  keeping tool results. Results are facts; reasoning is
  process.

NOT retrieved document content, where conditions live.
```

**The distinction is what the content is:** process and conversation compress safely; normative text with conditions does not.

**The cost arithmetic against compression:**

```
Summarization or extraction costs a model call per request.
For a RAG system that's:
  · added latency on the critical path
  · added cost
  · added failure surface

To save input tokens that fewer chunks would have saved for
free. It's paying to do worse.
```

## 5. Why It Matters

- **Retrieving less dominates compressing** in a RAG system — free and better.
- **Compression can manufacture the omission failure** that verification can't catch.
- **History and reasoning compress safely**; normative document text doesn't.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Compressing retrieved document text** | Conditions dropped; verification passes |
| **A model call per request to compress** | Latency and cost to save tokens |
| **Token pruning** | Lossy in unpredictable ways |
| **Compressing recent conversation turns** | Loses detail still in use |
| **Compressing the original question** | Removes the anchor against drift |
| **Used instead of fixing retrieval** | Treating a symptom |

**On why verification doesn't catch it:** the grounding check compares the answer against the context it was given. If the context was already compressed and lost a condition, the answer faithfully reflects the compressed context and passes. The failure happened before the check, which is why compression is more dangerous than an equivalent generation error.

**On when it's genuinely needed:** if a single document must be processed in full and exceeds the context window — a long contract, a complete policy — then summarization or chunked processing is unavoidable. That's a different situation from RAG, where the whole point is retrieving the relevant part rather than processing everything.

## 7. Interview Answer

> "If the context is too long you can compress it or you can retrieve less. In a RAG system retrieving less dominates — it's free, it's lossless with respect to what you kept, and it doesn't risk dropping the condition that makes an answer correct.
>
> The argument against compression in banking specifically is decisive. Take a source saying fees are waived for the first two transactions per calendar month for Premier and Private tier customers. An extractive compressor answering 'are transfers free?' might keep 'fees are waived for the first two transactions per calendar month' and drop the tier condition.
>
> That's the omission failure — the most consequential hallucination type — introduced by an optimization step rather than by the model. And the model then produces a correct summary of incorrect context, so grounding verification passes. The check compares the answer against the context it was given, and the context was already wrong.
>
> So compression can manufacture exactly the failure the verification layer exists to catch, in a way verification structurally cannot detect. That's worse than an equivalent generation error, which verification would find.
>
> There's also a cost argument. Summarization or extraction costs a model call per request — added latency on the critical path, added cost, added failure surface — to save input tokens that fewer chunks would have saved for free. It's paying to do worse.
>
> Where compression does have a place is conversation history and agent reasoning. Summarizing older turns is legitimate, because the detail matters less once the exchange is complete and the alternative is unbounded growth — keeping recent turns verbatim and the original question unchanged. And dropping the model's reasoning from completed agent steps while keeping tool results, since results are facts and reasoning is process.
>
> The distinction is what the content is: process and conversation compress safely, normative text with conditions doesn't.
>
> The one case where it's genuinely unavoidable is processing a single document in full that exceeds the context window — a long contract, a complete policy. But that's a different situation from RAG, where the entire point is retrieving the relevant part rather than processing everything. If I'm reaching for compression in a RAG system, the real answer is usually that retrieval is returning too much."

## 8. Likely Follow-ups

**Q: Why not compress retrieved context?**
Because it can drop qualifying conditions, producing the omission failure — and the model then faithfully summarizes the compressed context, so grounding verification passes. The failure happened before the check, which verification structurally can't detect.

**Q: What should you do instead?**
Retrieve fewer, better-reranked chunks. It's free, it doesn't cost a model call, it's lossless with respect to what you kept, and it usually improves quality because relevance stops being diluted. Compression pays latency and cost to do worse.

**Q: Is compression ever right?**
For conversation history and completed agent reasoning, yes — the detail matters less once the exchange is done, and the alternative is unbounded growth. And for processing a single oversized document in full, which is a different problem from RAG.

**Q: What's the distinction?**
What the content is. Process and conversation compress safely. Normative document text, where conditions live, doesn't — because dropping a condition changes the meaning while leaving text that reads as complete.

**Q: What does reaching for compression usually indicate?**
That retrieval is returning too much. In a RAG system the point is retrieving the relevant part, so needing to compress what was retrieved is a symptom of the retrieval stage rather than a problem compression should solve.

## 9. Common Mistakes

- Compressing retrieved document text.
- Paying a model call per request to save input tokens.
- Compressing recent conversation turns still in use.
- Compressing the original question, losing the drift anchor.
- Using compression instead of fixing retrieval.

## 10. What to Remember

- **Retrieve less rather than compress** — free, and usually better.
- **Compression can manufacture the omission failure** verification can't catch.
- **History and agent reasoning compress safely**; document text doesn't.
- **A model call per request** to save tokens fewer chunks would save free.
- **Reaching for it signals a retrieval problem.**
