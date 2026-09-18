# Tracing

> **Phase 15 · LANGCHAIN · Topic 15**

## 1. Definition

Capturing the full execution tree of a chain or agent — every step, its inputs and outputs, timing, and token usage — so a specific run can be inspected after the fact. LangSmith is LangChain's hosted implementation.

## 2. Simple Explanation

A trace is the complete record of one request: what the retriever returned, what prompt was assembled, what the model replied, what tools ran.

Without it, debugging an LLM system means guessing, because the same input can produce different behaviour and re-running proves nothing.

## 3. How It Works

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=...
export LANGCHAIN_PROJECT=banking-faq-rag
```

That's the whole setup — tracing is automatic once enabled, producing a nested tree of runs with inputs, outputs, latency, and token counts per node.

**What a trace answers:**

```
· What was the exact prompt sent to the model?
· Which documents did the retriever return, with what scores?
· How long did each step take?
· How many tokens, costing what?
· Where did it fail?
```

## 4. Practical Example

**The banking blocker, stated plainly:**

```
LangSmith is a hosted third-party service. Traces contain
prompts, retrieved document content, and answers — which in
a banking system means customer data and internal policy
documents leaving the environment.

That triggers vendor assessment, data residency review, and
a processor agreement. In many banks it simply won't be
approved.

The alternative is self-hosted tracing:
  · OpenTelemetry instrumentation via callbacks
  · exported to Cloud Trace / Cloud Logging in-project
  · dashboards in Cloud Monitoring

Less polished, entirely in-environment, and approvable.
```

**That's the answer to give for a banking role** — not "we'd use LangSmith," but an awareness that hosted tracing is a data-residency decision first and a tooling decision second.

**What matters more than the tool — trace structure:**

```
Every trace needs:
  run_id            one ID per request, linking every step
  session_id        for multi-turn conversations
  user_id           hashed, for per-user analysis
  prompt_version    which prompt produced this
  model + version   what generated it
  retrieval summary doc count, top score, doc IDs
  outcome           answered / abstained / escalated / failed

Sampling: full traces on all failures and abstentions,
sampled on successes. Full fidelity everywhere is expensive
at volume and mostly redundant.
```

**On tracing as an evaluation source:** traced production requests are the best material for a golden set — real queries, real retrievals, real answers. Sampling traces into an eval dataset is a far better source than invented test cases, which tend to be easier than reality.

## 5. Why It Matters

- **LLM systems can't be debugged by re-running** — traces are the only record.
- **Hosted tracing is a data residency decision** in banking, before it's a tooling one.
- **Production traces are the best source** for a realistic evaluation set.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Data leaving the environment** | The blocker in regulated settings |
| **Full-fidelity tracing at volume** | Expensive; needs sampling |
| **PII in traces** | Retention, access control, erasure apply |
| **No run ID** | Steps can't be correlated |
| **Tracing only failures** | No baseline to compare against |
| **Traces not linked to evaluation** | The best eval source goes unused |

**On sampling asymmetry:** capture everything on failure, abstention, and high latency; sample successes at a low rate. The failures are where the information is, and the successes only need enough volume to establish a baseline distribution.

**On erasure:** traces contain customer conversation content, so a deletion request must reach them. That means the trace store needs the same delete path and retention policy as any other customer data store — which is also an argument against a hosted service where you don't control deletion.

## 7. Interview Answer

> "A trace is the complete record of one request — what the retriever returned with what scores, what prompt was assembled, what the model replied, what tools ran, with timing and token counts. It matters because LLM systems can't be debugged by re-running: the same input can behave differently, so the record has to be captured at execution time.
>
> LangChain's hosted implementation is LangSmith, and enabling it is three environment variables.
>
> But for a banking role the honest answer starts elsewhere. LangSmith is a hosted third-party service, and traces contain prompts, retrieved document content, and answers — so customer data and internal policy documents would leave the environment. That triggers vendor assessment, residency review, and a processor agreement, and in many banks it simply won't be approved. So hosted tracing is a data residency decision first and a tooling decision second.
>
> The alternative is self-hosted: OpenTelemetry instrumentation through callbacks, exported to Cloud Trace and Cloud Logging in-project, with dashboards in Cloud Monitoring. Less polished, entirely in-environment, and approvable.
>
> What matters more than the tool is the trace structure. Every trace needs a run ID linking all steps, a session ID for multi-turn, a hashed user ID, the prompt version, the model and version, a retrieval summary with document count and top score, and the outcome — answered, abstained, escalated, or failed. Without prompt version and model version you can't attribute a quality regression to anything.
>
> On sampling, I'd capture everything on failures, abstentions, and high-latency requests, and sample successes at a low rate. The failures are where the information is; successes only need enough volume for a baseline distribution.
>
> One thing I'd make sure to use: traced production requests are the best source for a golden evaluation set — real queries, real retrievals, real answers. Invented test cases are systematically easier than reality, so sampling traces into the eval dataset closes the loop between observability and measurement.
>
> And traces are customer data, so they need the same retention policy, access control, and deletion path as any other customer store — which is another argument against a hosted service where you don't control deletion."

## 8. Likely Follow-ups

**Q: Why is tracing essential for LLM systems?**
Because you can't debug by re-running — the same input can take a different path or produce a different answer, so re-execution proves nothing. The record has to be captured at execution time, which makes tracing the only route to understanding a specific failure.

**Q: Would you use LangSmith at a bank?**
Probably not without a serious review. It's a hosted third-party service and traces contain customer data and internal policy content, so it triggers residency review and a processor agreement. Self-hosted OpenTelemetry exported to Cloud Trace keeps everything in-project and is usually the approvable option.

**Q: What should a trace contain?**
A run ID linking all steps, session and hashed user IDs, prompt version, model and version, a retrieval summary with document count and top score, per-step timing and tokens, and the outcome — answered, abstained, escalated, or failed. Prompt and model version are what make regressions attributable.

**Q: How do you keep tracing affordable?**
Asymmetric sampling — full capture on failures, abstentions, and high-latency requests; a low sample rate on successes. That keeps the informative cases fully visible while bounding the cost of the common path, which at volume is most of the spend.

**Q: Is there a use for traces beyond debugging?**
Yes — they're the best source for a golden evaluation set. Real queries with real retrievals and real answers, sampled from production, are far more representative than invented test cases, which tend to be systematically easier than reality.

## 9. Common Mistakes

- Proposing hosted tracing without addressing data residency.
- Omitting prompt version and model version from traces.
- Tracing only failures, leaving no baseline.
- Full-fidelity capture at volume without sampling.
- Not using traced production requests to build evaluation sets.

## 10. What to Remember

- **You can't debug by re-running** — the trace is the only record.
- **Hosted tracing is a residency decision** in banking; self-host to Cloud Trace.
- **Record prompt and model version** or regressions aren't attributable.
- **Sample asymmetrically** — all failures, few successes.
- **Traces are the best golden-set source**, and they're customer data.
