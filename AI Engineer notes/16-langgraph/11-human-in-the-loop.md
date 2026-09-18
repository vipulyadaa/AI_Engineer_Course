# Human in the Loop (in LangGraph)

> **Phase 16 · LANGGRAPH · Topic 11**

## 1. Definition

Pausing graph execution before or after a node so a person can review, approve, or modify state, then resuming. LangGraph supports this natively through interrupts combined with persistence.

> The general design of human checkpoints is in [17-ai-agents/19-human-in-the-loop.md](../17-ai-agents/19-human-in-the-loop.md). This is the LangGraph mechanism.

## 2. Simple Explanation

You declare that the graph should stop before a particular node. When it reaches that point, it saves state and returns.

A human reviews, and the application resumes the thread — possibly after editing state. Nothing is held in memory in between, which is what makes an approval taking hours workable.

## 3. How It Works

```python
app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["execute_refund"],
)

result = app.invoke({"question": q}, config)   # stops before the node

snapshot = app.get_state(config)                # what's pending
# ... human reviews ...
app.update_state(config, {"approved_by": reviewer_id})
app.invoke(None, config)                        # resumes
```

**Interrupts only work with a checkpointer.** Without persistence, an interrupt would mean holding the execution in memory — which defeats the purpose for anything taking more than seconds.

**`interrupt_before` and `interrupt_after`** cover approval (before acting) and review (after producing something).

## 4. Practical Example

**What the reviewer must see, from state:**

```python
snapshot.values →
{
  "proposed_action":  "refund $45.00 to account ****3391",
  "reasoning":        "charged retail rate; customer is Premier",
  "evidence": [
     "fee schedule v4.2 §3.1 — Premier: $25.00",
     "TXN-88213 charged $45.00 on 2026-03-03",
     "waivers used this month: 2 of 2",
  ],
  "facts_verified":   {"tier": "core-banking-api"},
  "reversible":       True,
  "reversal_window":  "30 days",
}
```

**The state object is the approval interface.** If the graph only stored "proposed_action", the reviewer has nothing to judge with — so the node before the interrupt must populate the evidence and provenance deliberately.

**That's the design point:** the interrupt is easy; making the approval meaningful is a state design problem.

**Re-validation on resume — the step that's easy to miss:**

```python
def execute_refund(state):
    if not state.get("approved_by"):
        raise PermissionError("not approved")
    current = get_transaction(state["transaction_id"])   # ← re-read
    if current.fee != state["evidence_fee_charged"]:
        return {"status": "stale", "answer": "Details changed; "
                "re-review required."}
    ...
```

```
An approval granted at 10am acts on facts read at 9:55.
For a refund that's probably fine. For anything where the
underlying record can change — a pending transaction, a
balance, a permission — re-reading before acting is the
correct behaviour.
```

**Authorization on resume:** the approver must be checked against who is *allowed* to approve, and that check belongs in code before resuming — not in the UI that presented the request.

## 5. Why It Matters

- **Interrupts plus persistence** are what make hours-long approvals workable.
- **State is the approval interface**, so evidence must be populated deliberately.
- **Re-validating on resume** prevents acting on facts that changed during the wait.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Interrupts without a checkpointer** | Execution held in memory |
| **Insufficient state for judgment** | Rubber-stamping |
| **No re-validation on resume** | Acting on stale facts |
| **Approver authorization in the UI only** | Bypassable |
| **No timeout on pending approvals** | Threads pending indefinitely |
| **Too many interrupt points** | Review fatigue |

**On pending timeouts:** a thread awaiting approval indefinitely holds state and never resolves. A timeout that expires the request, notifies the customer, and closes the thread is needed — otherwise pending approvals accumulate silently and customers are left waiting on something nobody will action.

**On the audit record:** what matters is who approved, what exactly, when, and on what evidence — including the evidence that was *shown*, not just the decision. Since the state snapshot at interrupt time is exactly that evidence, the checkpoint serves as the audit record directly, which is a genuine advantage of doing this in a persisted graph.

## 7. Interview Answer

> "LangGraph supports human-in-the-loop through interrupts combined with persistence. You compile the graph with interrupt_before on a node, and when execution reaches it, state is checkpointed and the call returns. A human reviews, the application optionally updates state with the decision, and resumes the thread. Nothing is held in memory in between, which is what makes an approval taking hours workable — and interrupts only function with a checkpointer for exactly that reason.
>
> The design point is that state is the approval interface. The interrupt itself is easy; making the approval meaningful is a state design problem. If the graph stored only 'proposed action: refund forty-five dollars', the reviewer has nothing to judge with and approves by default. So the node before the interrupt has to deliberately populate the reasoning, the evidence with citations, which facts were verified versus inferred, whether the action is reversible and within what window. Then the reviewer can actually decide.
>
> That has a nice consequence for audit: the state snapshot at interrupt time *is* the evidence that was shown, so the checkpoint serves as the audit record directly. Who approved what, when, and on what basis — all of it is already persisted. That's a genuine advantage of doing this in a persisted graph rather than bolting approval onto a stateless service.
>
> The step that's easy to miss is re-validation on resume. An approval granted at ten acts on facts read at nine fifty-five. For a refund that's probably fine, but for anything where the underlying record can change — a pending transaction, a balance, a permission — the node should re-read before acting and route back to review if the details changed.
>
> And authorization: the approver has to be checked against who's allowed to approve, in code before resuming, not in the UI that presented the request. The UI can be bypassed; the resume path can't.
>
> One operational thing: pending approvals need a timeout. A thread awaiting approval indefinitely holds state and never resolves, so they accumulate silently while customers wait on something nobody will action. Expiring the request, notifying the customer, and closing the thread is the right behaviour."

## 8. Likely Follow-ups

**Q: How does LangGraph implement human-in-the-loop?**
Interrupts combined with persistence. Compiling with interrupt_before on a node makes execution stop there, checkpoint state, and return. The application resumes the thread later, optionally updating state with the decision. It requires a checkpointer — without one the execution would have to be held in memory.

**Q: What does the reviewer need to see?**
The proposed action, the reasoning, the evidence with citations, which facts were verified versus inferred, and whether the action is reversible. Without that, there's no basis for judgment and approval becomes a rubber stamp — so the node before the interrupt has to populate all of it deliberately.

**Q: What happens if facts change during the wait?**
The node should re-read time-sensitive values before acting and route back to review if they've changed. An approval granted an hour after the facts were read may be authorizing something that no longer applies, and resumption feels like continuation, which makes this easy to skip.

**Q: Where does approver authorization belong?**
In code on the resume path, checking the approver against who's permitted to approve that action. Doing it only in the UI that presented the request means it's bypassable by anything calling the resume path directly.

**Q: What's the audit advantage?**
The state snapshot at interrupt time is exactly the evidence that was shown, so the checkpoint is the audit record — who approved what, when, and on what basis, all already persisted. That falls out of the design rather than needing separate instrumentation.

## 9. Common Mistakes

- Using interrupts without a checkpointer.
- Presenting a proposed action without the evidence behind it.
- Resuming without re-validating time-sensitive facts.
- Checking approver permissions only in the UI.
- No timeout on pending approvals, so threads accumulate.

## 10. What to Remember

- **Interrupts require persistence** — that's what makes long waits workable.
- **State is the approval interface** — populate evidence deliberately.
- **Re-validate on resume**; facts may have changed during the wait.
- **Authorize the approver in code**, not in the UI.
- **The interrupt checkpoint is the audit record**, for free.
