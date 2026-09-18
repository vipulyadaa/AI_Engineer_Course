# Supervisor Agents

> **Phase 17 · AI AGENTS · Topic 17**

## 1. Definition

An agent whose tools are other agents. It decomposes a task, delegates parts to specialists, collects their results, and assembles the answer — holding control flow in one place.

## 2. Simple Explanation

A supervisor doesn't do the work. It decides who should do what, gives them enough context to do it, and puts the pieces together.

Structurally it's an ordinary agent — the difference is that its "tools" are calls to other agents rather than to functions.

## 3. How It Works

```
                 ┌──────────────┐
      user ─────▶│  SUPERVISOR  │─────▶ answer
                 └──────┬───────┘
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ accounts │  │ payments │  │ disputes │
    │  agent   │  │  agent   │  │  agent   │
    └──────────┘  └──────────┘  └──────────┘
```

**Because sub-agents are tools, everything about tool design applies:** the description determines whether the supervisor picks the right one, the arguments determine whether the sub-agent gets what it needs, and the result format determines whether the supervisor can use the answer.

## 4. Practical Example

**The delegation interface is the whole design:**

```python
{
  "name": "accounts_agent",
  "description": (
      "Handles account information: balance, tier, transaction "
      "history, statements. Read-only. Does NOT handle payments "
      "or disputes."                              # ← disambiguation
  ),
  "parameters": {
    "task": {"type": "string",
             "description": "A complete, self-contained question. "
                            "The sub-agent has NO access to the "
                            "conversation."},      # ← the key constraint
    "known_facts": {"type": "object",
                    "description": "Verified facts already "
                                   "established, to avoid re-fetching."},
  },
}
```

**That second point is the design problem in one line.** The sub-agent sees only what the supervisor passes. If the supervisor sends "check the fee" without the customer ID, the tier, or the transaction, the sub-agent can't do anything useful — and may hallucinate to fill the gap.

**Two failure directions:**

```
UNDER-SPECIFIED   the sub-agent lacks context → it guesses
OVER-SPECIFIED    the supervisor passes everything → no
                  context saving, and the sub-agent's focus
                  is lost too

The working middle: pass the specific task plus the verified
facts relevant to it. Which is only possible if the
supervisor maintains explicit state.
```

**Parallel delegation** is the supervisor's main performance advantage — independent sub-tasks can be dispatched concurrently, which a single agent working step by step cannot do.

## 5. Why It Matters

- **It's the dominant multi-agent topology**, so it's the one worth knowing well.
- **The delegation interface is the design** — under- or over-specifying both fail.
- **Parallel delegation** is the concrete performance argument for the pattern.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Context loss in delegation** | Sub-agent guesses what it wasn't told |
| **Supervisor as a bottleneck** | Every decision routes through it |
| **Nested budgets** | Sub-agent loops inside supervisor loops |
| **Result format mismatch** | Supervisor can't use what came back |
| **Delegating trivial work** | Two calls where one tool would do |
| **No sub-agent failure handling** | One failure kills the whole task |

**On nested budgets:** a supervisor with ten steps calling sub-agents with ten steps each is a hundred LLM calls at worst. Budgets must be global — total calls and tokens across the system — with the supervisor's remaining budget passed down and decremented. Per-agent limits alone are not a bound.

**On sub-agent failure:** when a sub-agent fails or returns something unusable, the supervisor should receive that as a result and decide — retry with clearer instructions, try a different sub-agent, or report partial results. Propagating the exception loses everything the other sub-agents produced.

## 7. Interview Answer

> "A supervisor agent is an agent whose tools are other agents. It decomposes the task, delegates to specialists, collects results, and assembles the answer. It's the dominant multi-agent topology because it keeps control flow in one place, which is what makes the system debuggable.
>
> Structurally it's an ordinary agent, so everything about tool design applies — descriptions determine whether it picks the right sub-agent, arguments determine whether the sub-agent gets what it needs.
>
> The design problem is the delegation interface, and specifically that the sub-agent sees only what the supervisor passes. It has no access to the conversation. So if the supervisor says 'check the fee' without the customer ID, the tier, or the transaction, the sub-agent can't do anything useful — and may hallucinate to fill the gap.
>
> There are two failure directions. Under-specified, where the sub-agent lacks context and guesses. And over-specified, where the supervisor passes everything, which saves no context and loses the sub-agent's focus as well. The working middle is passing the specific task plus the verified facts relevant to it — which is only possible if the supervisor maintains explicit state rather than relying on conversation history.
>
> The concrete performance argument for the pattern is parallel delegation. Independent sub-tasks can be dispatched concurrently, which a single agent working step by step structurally cannot do.
>
> Two things I'd get right. Budgets must be global. A supervisor with ten steps calling sub-agents with ten steps each is a hundred calls at worst, so the supervisor's remaining budget should be passed down and decremented — per-agent limits alone aren't a bound.
>
> And sub-agent failures should come back to the supervisor as results, not exceptions. Then it can retry with clearer instructions, try a different sub-agent, or report partial results. Propagating the exception throws away everything the other sub-agents already produced."

## 8. Likely Follow-ups

**Q: How does a supervisor delegate?**
By calling sub-agents as tools, passing a complete self-contained task description plus the verified facts relevant to it. The sub-agent has no view of the conversation, so anything it needs must be in the call — that constraint is the whole design problem.

**Q: What goes wrong with delegation?**
Under-specification, where the sub-agent lacks context and guesses or hallucinates. Or over-specification, where passing everything saves no context and dilutes the sub-agent's focus. The middle — the task plus relevant verified facts — requires the supervisor to maintain explicit state.

**Q: How do you budget a supervisor system?**
Globally. A supervisor with ten steps calling sub-agents with ten each is a hundred calls in the worst case, so the remaining budget should be passed down and decremented across the system. Per-agent limits don't bound the total.

**Q: What happens when a sub-agent fails?**
It should return the failure to the supervisor as a result, so the supervisor can retry with clearer instructions, use a different sub-agent, or report partial results. Propagating an exception discards everything the other sub-agents already produced, which is usually a large waste.

**Q: What's the performance advantage?**
Parallel delegation. The supervisor can dispatch independent sub-tasks concurrently, where a single reactive agent is structurally sequential. That's the concrete argument for the topology beyond organizational tidiness.

## 9. Common Mistakes

- Delegating without passing the facts the sub-agent needs.
- Passing the entire conversation, defeating the point of delegation.
- Budgeting per agent without a global cap.
- Letting sub-agent exceptions propagate and kill the task.
- Delegating work a single tool call would have done.

## 10. What to Remember

- **Sub-agents are tools** — tool design rules all apply.
- **The sub-agent sees only what you pass** — no conversation access.
- **Task + relevant verified facts** is the working middle ground.
- **Budget globally**, passing remaining capacity downward.
- **Sub-agent failures return as results**, so partial work survives.
