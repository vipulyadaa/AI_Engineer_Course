# Callbacks

> **Phase 15 · LANGCHAIN · Topic 14**

## 1. Definition

Hooks fired at lifecycle events — LLM start and end, tool start and end, chain steps, errors, token streaming — used for logging, metrics, cost tracking, and tracing.

## 2. Simple Explanation

Callbacks are how you see inside a chain that otherwise runs opaquely.

Because LCEL composition hides intermediate values, callbacks are the supported way to observe what's happening — which makes them the answer to "how do I debug this?"

## 3. How It Works

```python
class CostHandler(BaseCallbackHandler):
    def on_llm_end(self, response, **kw):
        u = response.llm_output.get("token_usage", {})
        self.prompt_tokens += u.get("prompt_tokens", 0)
        self.completion_tokens += u.get("completion_tokens", 0)

    def on_retriever_end(self, documents, **kw):
        log.info("retrieved", n=len(documents),
                 top_score=getattr(documents[0], "score", None))

    def on_tool_start(self, serialized, input_str, **kw):
        log.info("tool", name=serialized["name"], args=input_str)
```

```python
chain.invoke(q, config={"callbacks": [CostHandler()], 
                        "run_id": trace_id})
```

**Two scopes:** constructor-level callbacks apply to one component; request-level callbacks in the config apply to everything in that invocation. Request-level is usually what you want, because it captures the whole chain under one trace.

## 4. Practical Example

**What to capture for a production RAG system:**

```
on_retriever_end     number of documents, top score,
                     document IDs  ← retrieval quality signal
on_llm_start         the rendered prompt (sampled — it's large)
on_llm_end           token counts → cost
on_tool_start/end    tool name, arguments, latency
on_*_error           failures with context
run_id               one ID linking every event for a request
```

**The retriever hook is the most valuable one:**

```
Tracking the number of documents above threshold and the top
similarity score per request gives you, essentially for free:

  · a distribution of retrieval quality over real traffic
  · an abstention-rate signal
  · early warning of embedding drift or corpus problems
  · the data to calibrate the relevance threshold properly

That's the highest-value instrumentation in a RAG system,
and it's one callback method.
```

**The PII consideration:**

```
Callbacks see prompts, retrieved documents, and answers —
all of which contain customer data in a banking system.

So:
  · don't log full prompts unconditionally; sample, or log
    only on failure
  · redact account numbers and identifiers before writing
  · the log store inherits retention, access control, and
    erasure obligations

Treating callback output as ordinary application logs is a
compliance gap, and it's an easy one to create because
logging feels harmless.
```

## 5. Why It Matters

- **Callbacks are the supported way to see inside opaque chains.**
- **The retriever hook is the highest-value instrumentation** in a RAG system.
- **Callback output contains customer data** and inherits data-protection obligations.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Logging full prompts always** | Volume and PII exposure |
| **Synchronous handlers on the hot path** | Adds latency per event |
| **No `run_id`** | Events can't be correlated per request |
| **Exceptions in handlers** | Can disrupt the chain |
| **Async chains with sync handlers** | Need the async handler variants |
| **Logs outside retention policy** | Compliance gap |

**On performance:** handlers run inline, so writing to a remote service synchronously in `on_llm_end` adds that latency to every request. Buffering and flushing asynchronously is the right pattern, and it's easy to get wrong because the naive implementation works fine in development.

**On async:** `BaseCallbackHandler` methods are synchronous. For async chains, `AsyncCallbackHandler` is required, and mixing them silently drops events — which produces incomplete traces that look like the chain behaved unexpectedly.

## 7. Interview Answer

> "Callbacks are lifecycle hooks — LLM start and end, tool start and end, retriever end, errors, streaming tokens — and because LCEL composition hides intermediate values, they're the supported way to see inside a chain that otherwise runs opaquely.
>
> There are two scopes: constructor-level callbacks on a single component, and request-level in the invoke config. Request-level is usually what you want, because it captures the whole chain under one trace with a shared run ID.
>
> The most valuable hook in a RAG system is on_retriever_end. Recording the number of documents above threshold and the top similarity score per request gives you, essentially for free, a distribution of retrieval quality over real traffic, an abstention-rate signal, early warning of embedding drift or corpus problems, and the data to calibrate the relevance threshold properly. That's the highest-value instrumentation available and it's one method.
>
> Beyond that I'd capture token counts for cost, tool names and arguments and latency, rendered prompts on a sample or on failure, and errors with context — all correlated by a run ID.
>
> Two things I'd get right. Performance: handlers run inline, so writing synchronously to a remote service in on_llm_end adds that latency to every request. Buffer and flush asynchronously. That's easy to get wrong because the naive version works fine in development and only hurts under load.
>
> And async: the base handler methods are synchronous, so async chains need AsyncCallbackHandler. Mixing them silently drops events, which produces incomplete traces that look like the chain misbehaved rather than like a telemetry bug.
>
> The compliance point I'd raise: callbacks see prompts, retrieved documents, and answers, which in banking all contain customer data. So I wouldn't log full prompts unconditionally — sample, or log only on failure — I'd redact identifiers before writing, and I'd treat the log store as a customer data store with retention, access control, and erasure obligations. Treating callback output as ordinary application logs is an easy compliance gap to create, because logging feels harmless."

## 8. Likely Follow-ups

**Q: What are callbacks used for?**
Observing chains that otherwise run opaquely — logging, metrics, cost tracking, and tracing. Since LCEL hides intermediate values, callbacks are the supported mechanism for seeing what the retriever returned, what prompt was sent, and what tools ran.

**Q: What's the most valuable hook?**
`on_retriever_end` in a RAG system. Recording document count above threshold and top similarity score per request gives you a retrieval quality distribution over real traffic, an abstention signal, drift warning, and the data to calibrate thresholds — all from one method.

**Q: What performance issue do callbacks introduce?**
They run inline, so a handler writing synchronously to a remote service adds that latency to every request. Buffering and flushing asynchronously is the correct pattern, and the naive synchronous version works fine in development, which is why it reaches production.

**Q: What about async chains?**
They need `AsyncCallbackHandler`. The base handler's methods are synchronous, and mixing them silently drops events — producing incomplete traces that look like chain misbehaviour rather than a telemetry bug, which makes it hard to diagnose.

**Q: Any data protection concerns?**
Yes. Callbacks see prompts, retrieved documents, and answers, all containing customer data. I'd sample rather than log every full prompt, redact identifiers before writing, and treat the log store as a customer data store subject to retention, access control, and erasure — not as ordinary application logs.

## 9. Common Mistakes

- Logging every full prompt, creating volume and PII exposure.
- Writing synchronously to remote services inside handlers.
- Using sync handlers with async chains.
- Not setting a run ID to correlate events per request.
- Excluding callback logs from data retention policies.

## 10. What to Remember

- **Callbacks are how you see inside an opaque chain.**
- **`on_retriever_end` is the highest-value hook** in a RAG system.
- **Request-level config callbacks** capture the whole chain under one trace.
- **Buffer and flush asynchronously** — handlers run inline.
- **Callback output is customer data** — sample, redact, and apply retention.
