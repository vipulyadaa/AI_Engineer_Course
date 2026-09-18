# Production Deployment

> **Phase 21 · GOOGLE ADK · Topic 20**

## 1. Definition

Everything required to run an ADK agent in production in a regulated environment — identity, networking, budgets, evaluation gates, observability, rollback, and the operational practices around them.

## 2. Simple Explanation

Production means someone other than you can operate it, a regulator can audit it, and it fails in ways you decided on in advance.

That's a longer list than "it works," and most of it isn't framework configuration.

## 3. How It Works

```
IDENTITY      dedicated service account, workload identity,
              narrowly scoped roles
NETWORK       VPC-SC perimeter, private connectivity
DATA          in-region session store, encrypted, retention
              policy, deletion path
BOUNDS        step, token, and wall-clock budgets in state
QUALITY       evaluation gate in CI on invariants and
              groundedness
OBSERVABILITY step-level traces, outcome and termination
              reason, rate-based alerts
ROLLBACK      traffic split; revert is a percentage change
AUDIT         every tool call: who, what, when, allowed
```

## 4. Practical Example

**A pre-launch checklist that's actually complete:**

```
SECURITY
  □ workload identity, no downloaded keys
  □ service account scoped to exactly what's needed
  □ tools authorize as the end user, not the service account
  □ VPC-SC perimeter covers the deployment
  □ outbound tools have fixed destinations, or don't exist

DATA
  □ session store in-region, encrypted, retention policy set
  □ deletion path reaches sessions, traces, logs, and memory
  □ PII redacted or minimized in logs
  □ audit logging enabled including data access

BOUNDS
  □ step, token, and wall-clock budgets enforced in state
  □ graceful degradation at the budget, not hard termination
  □ loop detection with a break-out message
  □ per-tool retry caps

QUALITY
  □ golden set from real queries, including abstention cases
  □ CI gate on invariants and groundedness
  □ baseline metrics captured before launch

OPERATIONS
  □ quota requested per region and model
  □ traffic-split rollback verified, not assumed
  □ alerts on rates, with someone owning them
  □ runbook for the common failures
```

**The line most often missing is "deletion path reaches sessions, traces, logs, and memory."** Those are four customer data stores that don't look like databases.

**Graceful degradation over hard limits:**

```
Hitting a budget should instruct the agent to conclude with
what it has, not terminate. A hard stop means paying for
every step and returning nothing — the worst available
outcome at that point.
```

**Verifying rollback:** a rollback path that's never been exercised isn't a rollback path. Testing it before launch, in production, is a small amount of work that converts an assumption into a fact.

## 5. Why It Matters

- **The forgotten data stores** — sessions, traces, logs, memory — are where compliance gaps live.
- **Graceful degradation** means the spend produces something.
- **An untested rollback path** is an assumption, not a control.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Deletion path missing stores** | Compliance gap |
| **Hard termination at budget** | Paid for everything, delivered nothing |
| **Untested rollback** | Discovered to be broken during an incident |
| **Alerts with no owner** | Fire into an unwatched channel |
| **No baseline before launch** | Metrics have no reference point |
| **Quota not requested** | Launch blocked |

**On alert ownership:** an alert with no named owner is a notification nobody acts on. Each alert should have a person or rota responsible and a runbook entry describing what to do — otherwise the monitoring investment produces noise rather than response.

**On baselines:** capturing the abstention rate, retrieval score distribution, latency profile, and cost per request during the first weeks of stable operation is what makes later metrics interpretable. Without it, "is fourteen percent abstention high?" has no answer, and every subsequent investigation starts from zero.

## 7. Interview Answer

> "Production means someone other than me can operate it, a regulator can audit it, and it fails in ways I decided on in advance. That's a longer list than 'it works', and most of it isn't framework configuration.
>
> On security: workload identity rather than downloaded keys, a service account scoped to exactly what's needed, tools authorizing as the end user rather than the service account, a VPC Service Controls perimeter covering the deployment, and outbound tools either with fixed destinations or not existing at all.
>
> On data: an in-region encrypted session store with a retention policy, and a deletion path that reaches sessions, traces, logs, and memory. That line is the one most often missing — those are four customer data stores that don't look like databases, so they get classified as infrastructure and excluded from retention and erasure. It's the gap an audit finds.
>
> On bounds: step, token, and wall-clock budgets enforced in state, with graceful degradation rather than hard termination. Hitting a budget should instruct the agent to conclude with what it has — a hard stop means paying for every step and returning nothing, which is the worst outcome available at that point. Plus loop detection with a break-out message and per-tool retry caps.
>
> On quality: a golden set from real queries including abstention cases, a CI gate on invariants and groundedness so regressions don't reach customers, and baseline metrics captured before launch.
>
> That baseline matters more than it sounds. Capturing the abstention rate, retrieval score distribution, latency profile, and cost per request during the first weeks of stable operation is what makes later metrics interpretable. Without it, 'is fourteen percent abstention high?' has no answer and every investigation starts from zero.
>
> On operations: quota requested per region and model ahead of launch, traffic-split rollback verified rather than assumed, alerts on rates with a named owner, and a runbook for the common failures.
>
> Two things I'd insist on. A rollback path that's never been exercised isn't a rollback path — testing it in production before launch converts an assumption into a fact for very little work. And an alert with no named owner is a notification nobody acts on, so each one needs a person or rota and a runbook entry, otherwise the monitoring investment produces noise rather than response."

## 8. Likely Follow-ups

**Q: What's most often missing from a launch checklist?**
A deletion path reaching sessions, traces, logs, and memory. Those are four customer data stores that don't look like databases, so they get classified as infrastructure and excluded from retention and erasure policy — which is exactly the gap an audit finds.

**Q: What should happen at a budget limit?**
Graceful degradation — instruct the agent to conclude with what it has. A hard termination means paying for every step and returning nothing to the customer, which is the worst outcome available at that point and entirely avoidable.

**Q: How do you know rollback works?**
By testing it in production before launch. A rollback path that's never been exercised is an assumption, and discovering it's broken during an incident is the worst possible time. Verifying it costs very little and converts an assumption into a fact.

**Q: Why capture baselines before launch?**
Because metrics are only interpretable relative to a known-good period. Without an abstention rate, score distribution, latency profile, and cost baseline from stable operation, questions like "is fourteen percent abstention high?" are unanswerable and every investigation starts from nothing.

**Q: What makes alerting effective?**
A named owner and a runbook entry for each alert. Alerts on rates over windows rather than individual requests, and someone responsible for acting on them — otherwise the monitoring produces noise that gets muted, which leaves you worse off than having no alerts at all.

## 9. Common Mistakes

- Deletion path covering only the primary data store.
- Hard termination at budget limits.
- Assuming rollback works without testing it.
- No baseline metrics from before launch.
- Alerts with no owner or runbook.

## 10. What to Remember

- **The deletion path must reach sessions, traces, logs, and memory.**
- **Degrade gracefully at budgets** — conclude, don't terminate.
- **Test rollback before launch** — an untested path isn't a control.
- **Capture baselines** during stable operation, or metrics have no reference.
- **Every alert needs an owner and a runbook entry.**
