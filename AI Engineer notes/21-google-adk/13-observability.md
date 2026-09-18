# Observability (ADK)

> **Phase 21 · GOOGLE ADK · Topic 13**

## 1. Definition

Understanding what an ADK agent did — through its event stream, callback-based instrumentation, and integration with Cloud Trace, Cloud Logging, and Cloud Monitoring.

## 2. Simple Explanation

ADK produces an event stream: every model call, tool call, and state change. That's the raw material.

Turning it into something operable means emitting structured metrics from callbacks, because agent failures can't be reproduced by re-running.

## 3. How It Works

```
EVENT STREAM        model calls, tool calls, state deltas,
                    the final response
CALLBACKS           where you emit structured logs and metrics
CLOUD TRACE         spans across the agent and downstream services
CLOUD LOGGING       structured logs, queryable
CLOUD MONITORING    metrics, dashboards, alerts
```

**Callbacks are the instrumentation point** — before/after model and before/after tool give you every place worth measuring.

## 4. Practical Example

**Per-request structured log:**

```python
def after_agent(ctx):
    log_struct({
        "trace_id":      ctx.state["trace_id"],
        "session_id":    ctx.state["session_id"],
        "user_hash":     hash(ctx.state["user"].id),
        "query_type":    ctx.state.get("query_type"),
        "tool_calls":    ctx.state["tool_call_log"],   # names only
        "model_calls":   ctx.state["model_call_count"],
        "tokens":        ctx.state["tokens"],
        "cost_usd":      ctx.state["cost"],
        "outcome":       ctx.state["outcome"],
        "termination":   ctx.state["termination_reason"],
        "latency_ms":    ctx.state["latency"],
    })
```

**Two fields carry most of the diagnostic value:**

```
outcome              answered | abstained | escalated | failed
termination_reason   completed | step_budget | token_budget
                     | tool_failure | loop_detected

Together they partition every failure immediately. An
abstention rate rising is retrieval degrading; step-budget
terminations rising is the agent taking longer paths;
loop detections rising is a tool returning unusable results.

Three different investigations, distinguished before you
open a single trace.
```

**That pair is the highest-value instrumentation** in an agent system, and most implementations capture neither.

**What to alert on:**

```
· abstention rate over a rolling window
· step-budget termination rate
· loop detection rate
· p95 end-to-end latency
· cost per session trending up
· any safety-invariant violation

Rates over windows, never individual requests — per-request
alerting is noise, and noisy alerts get muted silently.
```

**PII:** the event stream contains prompts, tool arguments, and responses, all of which carry customer data in banking. I'd log tool names and argument *keys* rather than values by default, capture full payloads only on failure or a low sample rate, hash user identifiers, and treat the log store as a customer data store with retention and deletion.

## 5. Why It Matters

- **Agent failures aren't reproducible** — capture at execution or lose them.
- **`outcome` and `termination_reason`** partition failures before any trace is opened.
- **The event stream contains customer data** and needs the corresponding controls.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Logging the final response only** | Failures undiagnosable |
| **No termination reason** | Failure classes indistinguishable |
| **Full arguments logged with PII** | Compliance exposure |
| **Per-request alerting** | Noise; alerts get muted |
| **Full-fidelity capture at volume** | Expensive |
| **Traces outside retention policy** | Compliance gap |

**On sampling asymmetry:** full capture on every failure, abstention, and loop detection; a low sample rate on successes. The failures are where the information is, and successes only need enough volume to establish a baseline distribution. Uniform full capture at volume is expensive and mostly redundant.

**On trace correlation:** one trace ID flowing through the agent, its tools, retrieval, and downstream services is what makes a slow or failed request diagnosable end to end. Without it you have separate metrics per component and no way to connect them to the specific request a customer complained about.

## 7. Interview Answer

> "ADK produces an event stream — every model call, tool call, and state change — and callbacks are where I'd attach instrumentation. That matters because agent failures can't be reproduced by re-running: the path varies, so the record has to be captured as it happens.
>
> Per request I'd emit a structured log with the trace ID, session ID, hashed user ID, query type, the tool calls made, model call count, tokens and cost, latency, and two fields that carry most of the value: outcome and termination reason.
>
> Outcome is answered, abstained, escalated, or failed. Termination reason is completed, step budget, token budget, tool failure, or loop detected. Together they partition every failure immediately — a rising abstention rate is retrieval degrading, rising step-budget terminations mean the agent is taking longer paths, rising loop detections usually mean a tool is returning unusable results. Three different investigations distinguished before I open a single trace. Most implementations capture neither field, which is why agent debugging is often archaeology.
>
> For alerting: abstention rate over a rolling window, step-budget termination rate, loop detection rate, p95 latency, cost per session trending up, and any safety-invariant violation. Rates over windows, never individual requests — per-request alerting is noise and noisy alerts get muted, which is silent and worse than having none.
>
> On sampling, full capture on every failure, abstention, and loop detection, with a low sample rate on successes. The failures carry the information; successes only need enough volume for a baseline distribution. Uniform full capture at volume is expensive and mostly redundant.
>
> And on PII — the event stream contains prompts, tool arguments, and responses, all carrying customer data. I'd log tool names and argument keys rather than values by default, capture full payloads only on failure or at a low sample rate, hash user identifiers, and treat the log store as a customer data store with retention and a deletion path. Treating agent traces as ordinary application logs is a compliance gap, and it's easy to create because logging feels harmless.
>
> One thing I'd make sure of: a single trace ID flowing through the agent, its tools, retrieval, and downstream services. Without it you have separate metrics per component and no way to connect them to the request a customer actually complained about."

## 8. Likely Follow-ups

**Q: Why can't you debug agents by re-running?**
Because the path varies on the same input, so a re-run may take a different route and not reproduce the failure. The execution has to be recorded as it happens — what the model decided, which tools ran with what arguments, and what came back.

**Q: What's the highest-value instrumentation?**
The outcome and termination reason fields. Together they distinguish retrieval degradation from agents taking longer paths from tools returning unusable results — three different investigations separated before you open a trace. Most implementations capture neither.

**Q: How do you keep observability affordable?**
Asymmetric sampling — full capture on every failure, abstention, and loop detection, with a low sample rate on successes. The informative cases are the failures, and successes only need enough volume to establish a baseline distribution.

**Q: What about PII in traces?**
Log tool names and argument keys rather than values by default, capture full payloads only on failure or a low sample, hash user identifiers, and treat the log store as a customer data store with retention and deletion. Agent traces are not ordinary application logs.

**Q: What would you alert on?**
Rates over rolling windows — abstention rate, step-budget termination rate, loop detection rate, p95 latency, cost per session trending up, and safety-invariant violations. Per-request alerting produces noise, and noisy alerts get muted silently.

## 9. Common Mistakes

- Logging only the final response.
- No termination reason field.
- Logging full tool arguments containing customer data.
- Alerting per request rather than on rates.
- Excluding agent traces from retention policy.

## 10. What to Remember

- **Callbacks are the instrumentation point** — every measurable place.
- **`outcome` + `termination_reason`** partition failures before any trace is read.
- **Sample successes; capture all failures.**
- **Log argument keys, not values**, by default.
- **One trace ID end to end**, and traces are customer data.
