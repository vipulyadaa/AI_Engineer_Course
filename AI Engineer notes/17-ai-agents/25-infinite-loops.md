# Infinite Loops

> **Phase 17 · AI AGENTS · Topic 25**

## 1. Definition

An agent continuing to act without making progress — repeating the same call, cycling between tools, or re-planning indefinitely. It's the most common way an agent consumes an unbounded budget.

## 2. Simple Explanation

The agent doesn't know it's stuck. Each step looks locally reasonable: the last attempt didn't work, so try again slightly differently.

From inside the loop there's no signal that it's a loop. Detection has to come from outside — from your code watching the pattern.

## 3. How It Works

**Four patterns, with different detection:**

```
1. IDENTICAL REPEAT    same tool, same arguments
   → hash (tool, args); flag on repeat

2. NEAR REPEAT         same tool, cosmetically varied arguments
   → count calls per tool; flag past a threshold

3. CYCLE               A → B → A → B
   → detect a repeating subsequence in the call history

4. RE-PLAN LOOP        plan, fail, re-plan, fail
   → count re-planning cycles; cap at 2-3
```

**The universal backstop is a hard step limit.** Every other detection is an optimization that saves budget; the step limit is what guarantees termination.

## 4. Practical Example

**Detection that costs almost nothing:**

```python
def check_progress(history):
    recent = history[-6:]
    sigs = [(c.tool, hash_args(c.arguments)) for c in recent]

    if len(set(sigs)) == 1:                        # identical
        return "You have repeated this call. Try something else."

    if len(sigs) >= 4 and sigs[-2:] == sigs[-4:-2]:  # A-B-A-B
        return "You are cycling between two actions. Change approach."

    if len(set(c.tool for c in recent)) == 1 and len(recent) >= 5:
        return "You have called this tool 5 times. Consider abstaining."

    return None
```

**Injecting a message beats terminating.** "You already tried this and got X — try a different approach, or tell the user you can't determine this" often unsticks the agent in one step. Terminating throws away everything it had established.

**Why agents loop — the causes matter for the fix:**

```
· A tool returns something the agent can't use, so it retries
  hoping for different output                → fix the tool result
· No abstention path, so giving up isn't an available action
                                             → add it explicitly
· The task is impossible with the tools available
                                             → detect and escalate
· Ambiguous instructions, so no state counts as "done"
                                             → clarify termination
  criteria in the prompt

The most common is the second. If "I can't determine this"
isn't presented as an acceptable outcome, the model keeps
trying because stopping isn't in its option set.
```

**That's the substantive insight** — loops are often a missing exit, not a detection failure.

## 5. Why It Matters

- **It's the most common unbounded-cost failure** in agent systems.
- **An explicit abstention path prevents more loops** than any detector.
- **Injecting guidance beats terminating** — it preserves the work already done.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Step limit only** | Bounds cost, wastes the whole budget first |
| **Terminating on detection** | Discards established work |
| **No abstention path** | The root cause of most loops |
| **Detection too aggressive** | Legitimate retries blocked |
| **No alerting** | Loops absorbed silently, root cause never fixed |

**On legitimate retries:** an agent retrying after a transient network error is correct behaviour, so detection should allow a couple of attempts before intervening. Two or three identical calls is the reasonable threshold — the first retry is normal, the fifth is a loop.

**On alerting:** a loop detected and handled still means something is wrong — usually a tool returning unusable results or a task the tool set can't accomplish. Handling it silently means the underlying cause is never addressed, so detections should be logged and tracked as a rate, not just absorbed.

## 7. Interview Answer

> "An infinite loop is an agent acting without progress. The hard part is that from inside the loop there's no signal — each step looks locally reasonable: the last attempt didn't work, so try again slightly differently. Detection has to come from outside.
>
> There are four patterns. Identical repeats, caught by hashing tool and arguments. Near repeats with cosmetically varied arguments, caught by counting calls per tool. Cycles between two tools, caught by detecting a repeating subsequence. And re-planning loops, capped at two or three cycles. Underneath all of it is a hard step limit, which is the backstop that guarantees termination — everything else just saves budget before that fires.
>
> When I detect one, I'd inject a message rather than terminate: 'you already tried this and got X, try a different approach or tell the user you can't determine this'. That often unsticks it in one step, and terminating throws away everything it had already established.
>
> But the more useful insight is why agents loop. The most common cause is that there's no abstention path — if 'I can't determine this' isn't presented as an acceptable outcome, the model keeps trying, because stopping isn't in its option set. So making abstention an explicit, encouraged action prevents more loops than any detector does. Loops are often a missing exit rather than a detection failure.
>
> The other causes are a tool returning something unusable so the agent retries hoping for different output, a task that's genuinely impossible with the available tools, and ambiguous instructions where no state counts as done. Each has a different fix, which is why knowing the cause matters.
>
> Two practical points. Detection shouldn't be too aggressive — an agent retrying after a transient network error is behaving correctly, so I'd allow two or three attempts before intervening. And detections should be logged and tracked as a rate rather than silently absorbed, because a loop that was handled still means something upstream is wrong and nobody finds out otherwise."

## 8. Likely Follow-ups

**Q: How do you detect a loop?**
Hash tool name plus arguments and flag identical repeats, count calls per tool to catch near-repeats, look for repeating subsequences to catch A-B-A-B cycles, and cap re-planning cycles. A hard step limit underneath all of it guarantees termination regardless.

**Q: Should you terminate when you detect one?**
Usually not — inject a message instead. Telling the agent it already tried that with that result, and to change approach or abstain, often unsticks it in a single step. Terminating discards everything it had already established, which may be most of the work.

**Q: Why do agents loop?**
Most often because there's no abstention path — if giving up isn't an available action, the model keeps trying. Also when a tool returns something unusable so it retries hoping for different output, when the task is impossible with the available tools, or when termination criteria are ambiguous.

**Q: How do you prevent loops rather than detect them?**
Make abstention explicit and encouraged, state clear termination criteria, cap retries per tool, and make sure tool results are usable rather than ambiguous. Prevention addresses the cause; detection only bounds the damage.

**Q: Should a handled loop be alerted on?**
Yes. A detected and handled loop still means something is wrong upstream — usually a tool returning unusable results or a task the tool set can't complete. Absorbing it silently means the root cause is never fixed, so detections should be logged and tracked as a rate.

## 9. Common Mistakes

- Relying only on a step limit, wasting the full budget first.
- Terminating on detection instead of injecting guidance.
- Not providing an explicit abstention path.
- Flagging the first retry as a loop.
- Handling loops silently without alerting on the rate.

## 10. What to Remember

- **Four patterns:** identical repeat, near repeat, cycle, re-plan loop.
- **A hard step limit is the backstop**; detection saves budget before it.
- **Inject guidance, don't terminate** — preserve established work.
- **Most loops are a missing abstention path**, not a detection failure.
- **Log and alert on detections** — a handled loop still signals a real problem.
