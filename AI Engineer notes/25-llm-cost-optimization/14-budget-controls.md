# Budget Controls

> **Phase 25 · LLM COST OPTIMIZATION · Topic 14**

## 1. Definition

Mechanisms that bound spend before it happens — per request, per user, and per system — as distinct from budget alerts, which report spend after it has occurred.

## 2. Simple Explanation

A budget alert tells you the money is gone. A budget control stops it being spent.

For an LLM system where a single loop bug or an abusive user can generate enormous cost in minutes, the difference between those two is the whole point.

## 3. How It Works

```
FOUR LEVELS, all needed

PER REQUEST   token budget checked before sending, and per
              step in an agent
              → bounds one runaway request

PER USER      daily token or cost budget
              → bounds abuse and heavy individual use

PER SYSTEM    provider quota as a hard ceiling
              → bounds everything, including bugs

REPORTING     billing alerts and per-query-type attribution
              → tells you where it went
```

**Only the first three are controls.** Reporting is necessary and it doesn't stop anything.

## 4. Practical Example

**Degrading gracefully rather than cutting hard:**

```
At the budget limit:

  HARD STOP    terminate → paid for every step, delivered
               nothing. The worst outcome available at that
               point.

  GRACEFUL     instruct the agent to conclude with what it
               has established, or route to abstention with
               a handoff
               → the spend produces something

So the check should be "approaching the limit → wrap up",
not "at the limit → stop". That means checking against a
threshold below the hard bound, with the hard bound as a
backstop.
```

**Per-user budgets, which are the commonly missing control:**

```
Per-request limits bound one request. Nothing stops ten
thousand requests, each individually within limits.

A per-user daily token budget bounds:
  · abuse and scraping
  · a broken client retrying in a loop
  · one enthusiastic user consuming a disproportionate
    share

And it should be per authenticated identity, not per IP —
IP-based limiting is trivially evaded and blocks shared
corporate networks, failing in both directions.
```

**Token counting before sending:**

```
Counting tokens before the call makes enforcement proactive
rather than retrospective. Without it you discover the
request was too expensive after paying for it.

That also enables the graceful path: if the assembled
context would exceed the budget, trim it before sending
rather than failing the request.
```

**Attribution, which makes optimization targeted:**

```
Track cost per request tagged by query type, model, and
path. A small number of query types almost always dominate
spend, and those are addressable specifically — usually by
routing them differently.

Without tagging, the bill is one number and optimization
becomes guesswork about which part is expensive.
```

## 5. Why It Matters

- **Quotas prevent; alerts report.** Only one of them is a control.
- **Per-user daily budgets** are the commonly missing layer.
- **Degrading gracefully** means the spend produces something.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Alerts without quotas** | Notification after the money is gone |
| **Per-request limits only** | Ten thousand compliant requests |
| **Hard termination at the limit** | Paid for everything, delivered nothing |
| **Rate limiting by IP** | Evaded, and blocks shared networks |
| **No token counting before sending** | Enforcement is retrospective |
| **No cost attribution** | Optimization becomes guesswork |

**On the runaway scenario:** an agent with a loop bug, or a prompt change that dramatically increases output length, can multiply spend within minutes. That's the case budget alerts handle badly — by the time the alert fires the money is spent. A provider quota is the only control that stops it, which is an argument for setting quotas deliberately rather than requesting the maximum available.

**On per-user limits in banking:** a legitimate customer rarely needs hundreds of queries a day, so a generous per-user daily budget costs nothing in normal operation and bounds the abnormal case. Setting it from the observed distribution — say the 99th percentile plus headroom — makes it invisible to real users and effective against the failure cases.

## 7. Interview Answer

> "A budget alert tells you the money is gone; a budget control stops it being spent. For an LLM system where a loop bug or an abusive user can generate enormous cost in minutes, that difference is the whole point.
>
> I'd have four levels. Per request — a token budget checked before sending, and per step in an agent, which bounds one runaway request. Per user — a daily token or cost budget. Per system — the provider quota as a hard ceiling. And reporting, which is billing alerts and per-query-type attribution. Only the first three are controls; reporting is necessary and it doesn't stop anything.
>
> The per-user daily budget is the commonly missing layer. Per-request limits bound one request, and nothing stops ten thousand requests each individually within limits. A daily budget bounds abuse and scraping, a broken client retrying in a loop, and one enthusiastic user consuming a disproportionate share. It should be per authenticated identity rather than per IP, because IP-based limiting is trivially evaded and blocks shared corporate networks — it fails in both directions.
>
> On how the limit behaves, I'd degrade rather than cut. A hard stop at the budget means paying for every step and delivering nothing, which is the worst outcome available at that point. So the check should be 'approaching the limit, wrap up' — instructing the agent to conclude with what it has, or routing to abstention with a handoff — with the hard bound as a backstop rather than the primary mechanism.
>
> Token counting before sending is what makes enforcement proactive rather than retrospective. Without it you discover a request was too expensive after paying for it. And it enables the graceful path — if the assembled context would exceed the budget, trim it before sending rather than failing the request.
>
> The scenario that justifies all of this is a runaway: an agent loop bug, or a prompt change that dramatically increases output length, multiplying spend within minutes. Budget alerts handle that badly because by the time the alert fires the money is gone. A provider quota is the only thing that actually stops it — which is an argument for setting quotas deliberately rather than requesting the maximum available.
>
> For setting the per-user limit, I'd take it from the observed distribution — say the ninety-ninth percentile plus headroom. A legitimate banking customer rarely needs hundreds of queries a day, so a generous limit is invisible in normal operation and effective against the failure cases.
>
> And I'd tag cost per request by query type, model, and path. A small number of query types almost always dominate spend, and those are addressable specifically — usually by routing them differently. Without the tagging, the bill is one number and optimization is guesswork."

## 8. Likely Follow-ups

**Q: What's the difference between a budget and a quota?**
A budget alert reports spend after it happened; a quota prevents it. For a runaway agent loop, the alert fires after the money is gone — the quota is the only control that actually stops it, which is why both are needed rather than either alone.

**Q: What's the commonly missing control?**
A per-user daily budget. Per-request limits bound one request while nothing stops ten thousand individually-compliant ones. It should be per authenticated identity, since IP-based limiting is evaded easily and blocks shared corporate networks.

**Q: What should happen at the limit?**
Graceful degradation — instruct the agent to conclude with what it has, or route to abstention with a handoff. A hard stop means paying for every step and delivering nothing, which is the worst available outcome at that point.

**Q: Why count tokens before sending?**
It makes enforcement proactive rather than retrospective — otherwise you discover a request was too expensive after paying for it. It also enables trimming an oversized context before sending rather than failing the request outright.

**Q: How do you set the per-user limit?**
From the observed distribution — around the ninety-ninth percentile plus headroom. A legitimate banking customer rarely needs hundreds of queries a day, so a generous limit is invisible in normal use and still bounds abuse, scraping, and broken clients.

## 9. Common Mistakes

- Budget alerts with no quota behind them.
- Per-request limits without a per-user daily budget.
- Hard termination at the budget rather than concluding.
- Rate limiting by IP rather than authenticated identity.
- No per-query-type cost attribution.

## 10. What to Remember

- **Quotas prevent; alerts report.** Only one is a control.
- **Four levels:** per request, per user, per system, plus reporting.
- **Per-user daily budgets** are the layer usually missing.
- **Degrade gracefully** — a hard cut pays for everything and delivers nothing.
- **Tag cost by query type** — a few types dominate, and they're addressable.
