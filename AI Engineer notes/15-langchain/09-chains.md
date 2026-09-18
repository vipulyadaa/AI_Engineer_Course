# Chains and LCEL

> **Phase 15 · LANGCHAIN · Topic 09**

## 1. Definition

The composition model: components joined with the `|` operator into a runnable that supports invoke, batch, stream, and async uniformly. LCEL replaced the older class-based chains.

## 2. Simple Explanation

You write `prompt | model | parser` and get an object you can call synchronously, asynchronously, in batch, or streaming — without implementing any of those four paths yourself.

That uniformity is the real benefit. The composition syntax is cosmetic; the free streaming and async are not.

## 3. How It Works

```python
chain = (
    {"context": retriever | format_docs,
     "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

chain.invoke(q)                 # sync
await chain.ainvoke(q)          # async
chain.batch([q1, q2, q3])       # batched
for tok in chain.stream(q): ... # streaming
```

**The dict form runs branches in parallel.** In the example, `retriever | format_docs` and `RunnablePassthrough` execute concurrently — which matters when several retrievals or lookups are independent.

**Useful primitives:** `RunnablePassthrough` (pass input through), `RunnableLambda` (wrap a function), `RunnableParallel` (explicit parallel branches), `.with_fallbacks()`, `.with_retry()`, `.bind()`.

## 4. Practical Example

**Where LCEL genuinely earns its place:**

```python
chain = (
    prompt
    | llm.with_fallbacks([backup_llm]).with_retry(
          stop_after_attempt=3)
    | parser
)
```

```
Retry with backoff and fallback to a second model, applied
to any composition, without writing that logic.

Streaming is the bigger one though. Implementing token
streaming through a multi-step pipeline — where only the
final step streams and earlier steps must complete first —
is genuinely fiddly. LCEL does it correctly for free, and
streaming is the single largest perceived-latency
improvement in a RAG system.
```

**Where it works against you:**

```
· Debugging — a failure inside a composed chain gives a
  stack trace through framework internals rather than
  your code
· Conditional logic — RunnableBranch is harder to read
  than an if statement
· Inspection — seeing the intermediate value between two
  steps requires instrumenting rather than printing

For a linear pipeline, LCEL is a genuine win. For anything
with branching, error handling per step, or intermediate
validation, explicit Python is clearer.
```

**The banking-specific consideration:** a chain that needs a relevance threshold check, an abstention branch, a grounding verification step, and an audit write between retrieval and generation is no longer a linear pipeline. Expressing that in LCEL is possible and less readable than writing it out.

## 5. Why It Matters

- **Free streaming and async** are the substantive benefit, not the syntax.
- **Retry and fallback as one-liners** are genuinely useful.
- **Branching and validation make LCEL worse than plain code** — knowing the boundary is the judgment.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Stack traces through internals** | Harder to locate your own bug |
| **Intermediate values hidden** | Requires instrumentation to inspect |
| **Branching syntax** | `RunnableBranch` is less readable than `if` |
| **Implicit parallelism surprises** | Dict branches run concurrently |
| **API churn** | LCEL replaced earlier chain classes wholesale |
| **Over-composition** | A chain doing too much to debug easily |

**On the legacy chains:** `RetrievalQA`, `ConversationalRetrievalChain`, and similar classes are the older API, still seen in tutorials and largely superseded. They hid even more — particularly the prompt and the document formatting — which is why they were replaced. Recognizing them as legacy is worth doing, because a lot of published example code still uses them.

**On streaming specifically:** the benefit is easy to understand only once you've tried to implement it. In a RAG chain, retrieval and prompt assembly must complete before generation, and only generation streams. Getting the async coordination right by hand takes real effort, and LCEL handles it correctly.

## 7. Interview Answer

> "LCEL is the composition model — components joined with pipe operators into a runnable supporting invoke, batch, stream, and async uniformly. It replaced the older class-based chains like RetrievalQA, which are still all over tutorials but are legacy.
>
> The real benefit isn't the syntax, it's the four execution paths for free. Streaming in particular: in a RAG chain, retrieval and prompt assembly must complete before generation, and only generation streams. Getting that async coordination right by hand takes real effort, and streaming is the single largest perceived-latency improvement in a RAG system — so having it correct for free is worth a lot.
>
> Retry and fallback are also genuinely useful as one-liners applied to any composition. And the dict form runs branches in parallel, so independent retrievals execute concurrently without writing that.
>
> Where it works against me is debugging and branching. A failure inside a composed chain gives a stack trace through framework internals rather than my code. Seeing the intermediate value between two steps requires instrumentation rather than a print. And RunnableBranch is harder to read than an if statement.
>
> So the boundary I'd draw: for a linear pipeline, LCEL is a genuine win. For anything with branching, per-step error handling, or intermediate validation, explicit Python is clearer.
>
> In banking that boundary arrives fast. A chain that needs a relevance threshold check, an abstention branch, a grounding verification step, and an audit write between retrieval and generation isn't a linear pipeline any more. Expressing that in LCEL is possible and distinctly less readable than writing it out — and readability matters more when the code is going to be reviewed by people who need to verify the controls are actually there.
>
> So I'd use LCEL for the generation step itself, where streaming and retry are valuable, and write the surrounding control flow explicitly."

## 8. Likely Follow-ups

**Q: What does LCEL actually give you?**
Invoke, batch, stream, and async across any composition without implementing them. Streaming is the big one — coordinating it correctly through a multi-step pipeline where only the last step streams is genuinely fiddly, and it's the largest perceived-latency improvement available.

**Q: When is explicit Python better?**
When there's branching, per-step error handling, or intermediate validation. A pipeline with a relevance threshold, an abstention branch, a grounding check, and an audit write isn't linear, and expressing it in LCEL is less readable than writing it out — which matters when reviewers need to verify the controls exist.

**Q: What are the legacy chains?**
RetrievalQA, ConversationalRetrievalChain, and similar classes — the pre-LCEL API. They hid even more than LCEL does, particularly the prompt and document formatting, which is why they were superseded. Worth recognizing since a lot of published example code still uses them.

**Q: What's the debugging cost?**
Stack traces run through framework internals rather than your code, and intermediate values between steps aren't visible without instrumentation. For a short chain that's tolerable; for a long composed one it turns straightforward bugs into archaeology.

**Q: Does the dict syntax do anything special?**
Yes — branches in a dict run in parallel. In a typical RAG chain the retrieval branch and the passthrough branch execute concurrently. That's useful when several retrievals or lookups are independent, and it's worth knowing because the parallelism is implicit rather than stated.

## 9. Common Mistakes

- Praising the syntax rather than the free streaming and async.
- Using LCEL for control flow with branching and validation.
- Not recognizing legacy chain classes in example code.
- Composing chains so long that failures are hard to localize.
- Assuming dict branches run sequentially.

## 10. What to Remember

- **Free invoke, batch, stream, async** — streaming is the substantive win.
- **`.with_retry()` and `.with_fallbacks()`** apply to any composition.
- **Dict branches run in parallel** — implicit but useful.
- **Explicit Python for branching, validation, and error handling.**
- **`RetrievalQA` and friends are legacy** — recognize them in old examples.
