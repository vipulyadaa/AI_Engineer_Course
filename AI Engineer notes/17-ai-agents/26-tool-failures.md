# Tool Failures

> **Phase 17 · AI AGENTS · Topic 26**

## 1. Definition

Tools erroring, timing out, returning unusable results, or returning wrong data. How these are surfaced to the agent determines whether it adapts or the whole task is lost.

## 2. Simple Explanation

Tools call real systems, and real systems fail. The design question is what the agent sees when they do.

An exception kills the run and discards everything already established. An error returned as a result lets the agent try something else — which is usually what you want.

## 3. How It Works

**Failure classes need different handling:**

| Failure | Handling |
|---|---|
| **Transient** (timeout, 503) | Retry with backoff *in the tool*, transparently |
| **Not found** | Return as a result — the agent may correct the ID |
| **Unauthorized** | Return as a result — the agent explains the limit |
| **Invalid arguments** | Return with guidance — the agent fixes them |
| **Service down** | Return as a result; alert; consider escalating |
| **Wrong data** | **Undetectable** — the hard case |

```
Retry transient failures INSIDE the tool, before the agent
sees anything. An LLM call to decide whether to retry a
timeout is expensive and pointless — that's a code decision.
```

## 4. Practical Example

**Error messages are prompts:**

```
BAD   "Error: 404"
      → the agent has no idea what to do

GOOD  "No transaction found with ID TXN-9931. Transaction
       IDs are 8 digits after 'TXN-'. You can list recent
       transactions with get_transactions."
      → the agent can correct the format, or switch tools,
        or ask the user
```

**The error message should say what went wrong, why, and what to try instead.** That's a prompt-engineering task, and it has more effect on recovery than any agent-side logic.

**The hard case — silently wrong data:**

```
A tool returns a stale balance, or a fee schedule from an
expired version.

The agent CANNOT detect this. It has no independent source.
It will use the wrong data confidently and produce a
confident wrong answer.

The only defences are outside the agent:
  · tools return data with a timestamp and version, and the
    agent is instructed to surface them
  · code-level consistency checks across tools — if two
    tools report different tiers for the same customer,
    that's detectable in code
  · freshness requirements enforced at the tool: refuse to
    return data older than a threshold rather than returning
    it silently

That last one is the strongest. A tool that fails loudly
on stale data is far better than one that returns it.
```

**Partial failure:**

```
Four of five tool calls succeed. Options:
  · answer with what's available, stating what's missing  ← usually right
  · abstain entirely                                      ← for high stakes
  · escalate to a human                                   ← when it matters

The wrong option is answering as if the data were complete.
```

## 5. Why It Matters

- **Error handling determines whether an agent adapts** or loses the whole task.
- **Error messages are prompts** and are the main lever on recovery quality.
- **Silently wrong data is undetectable by the agent**, so defences must be in the tools.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Exceptions propagating** | The whole run and its work is lost |
| **Unhelpful error messages** | The agent can't recover |
| **Retries decided by the LLM** | Expensive; belongs in code |
| **Wrong data returned silently** | Confident wrong answers |
| **Partial results presented as complete** | The worst failure mode |
| **Failures handled but not alerted** | Broken services stay broken |

**On masking:** an agent that routes around a failing service keeps working while nobody learns the service is down. Tool failures must be logged and alerted on independently of whether the agent recovered. The agent's resilience should not become the reason an outage goes unnoticed.

**On timeouts:** every tool needs one, and the budget has to fit the agent's overall latency target. Five tools with 30-second timeouts is a 150-second worst case — likely well beyond what any interactive system can accept. Timeouts should be derived from the latency budget, not chosen per tool in isolation.

## 7. Interview Answer

> "Tools call real systems and real systems fail. The design question is what the agent sees.
>
> I'd return failures to the model as tool results rather than raising exceptions, because an exception kills the run and discards everything already established. Returned as a result, the agent can correct an identifier, try a different tool, explain the limit to the user, or abstain.
>
> Different classes need different handling though. Transient failures — timeouts, 503s — should be retried inside the tool with backoff before the agent sees anything. Using an LLM call to decide whether to retry a timeout is expensive and pointless; that's a code decision. Not-found, unauthorized, and invalid-argument failures go back to the model, because those are ones it can actually act on.
>
> The thing that most affects recovery is that error messages are prompts. 'Error: 404' tells the agent nothing. 'No transaction found with ID TXN-9931 — IDs are eight digits after TXN-, and you can list recent transactions with get_transactions' lets it correct the format, switch tools, or ask the user. That's prompt engineering, and it matters more than any agent-side recovery logic.
>
> The hard case is a tool returning silently wrong data — a stale balance, an expired fee schedule version. The agent can't detect that; it has no independent source, so it uses the data confidently and produces a confident wrong answer. The defences have to be outside the agent: tools returning timestamps and versions the agent surfaces, code-level consistency checks across tools so two conflicting tier values are caught, and freshness requirements enforced at the tool — refusing to return data older than a threshold rather than returning it quietly. That last one is strongest; a tool that fails loudly on stale data is far better than one that returns it.
>
> On partial failure, if four of five calls succeed, the right move is usually answering with what's available while stating what's missing — or abstaining and escalating if the stakes are high. The wrong move is answering as if the data were complete.
>
> Two operational points. Every tool needs a timeout derived from the overall latency budget — five tools at thirty seconds each is a hundred and fifty second worst case, which no interactive system accepts. And failures must be alerted on regardless of whether the agent recovered, because agent resilience shouldn't be the reason an outage goes unnoticed."

## 8. Likely Follow-ups

**Q: Should tool errors raise or return?**
Return, as a tool result the model can act on. Raising kills the run and discards everything already established, whereas a returned error lets the agent correct arguments, switch tools, explain the limitation, or abstain. The exception is transient failures, which should be retried inside the tool first.

**Q: What makes a good tool error message?**
It says what went wrong, why, and what to try instead — including the expected format and alternative tools. Error messages are prompts, and their quality affects recovery more than any agent-side logic does.

**Q: What about tools returning wrong data?**
The agent can't detect it, since it has no independent source, so it produces a confident wrong answer. The defences are in the tools: return timestamps and versions, enforce freshness by refusing stale data rather than returning it, and run code-level consistency checks across tools that report overlapping facts.

**Q: How do you handle partial failure?**
Usually answer with what's available while explicitly stating what couldn't be determined — or abstain and escalate when the stakes justify it. Presenting partial data as if it were complete is the failure to avoid, because it produces an answer that looks fully supported and isn't.

**Q: How do you set tool timeouts?**
From the end-to-end latency budget working backwards, not per tool in isolation. Five tools at thirty seconds each is a hundred and fifty second worst case, which no interactive system can accept, so per-tool budgets have to be derived from what the agent as a whole is allowed to take.

## 9. Common Mistakes

- Raising tool exceptions out of the agent loop.
- Returning opaque error codes with no guidance.
- Using LLM calls to decide whether to retry transient failures.
- Presenting partial results as complete.
- Not alerting on tool failures the agent recovered from.

## 10. What to Remember

- **Return failures to the model**; retry transient ones inside the tool.
- **Error messages are prompts** — say what, why, and what to try next.
- **Silently wrong data is undetectable by the agent** — defend in the tools.
- **State what's missing** rather than answering as if complete.
- **Alert on failures regardless of recovery**, and derive timeouts from the budget.
