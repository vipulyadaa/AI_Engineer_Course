# Human Approval

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 18**

## 1. Definition

Requiring a person to authorize an action before it executes. It's the control that makes consequential AI actions acceptable in a regulated environment — and it only works if the reviewer has enough information to genuinely decide.

> The LangGraph and agent mechanics are in [16-langgraph/11](../16-langgraph/11-human-in-the-loop.md) and [17-ai-agents/19](../17-ai-agents/19-human-in-the-loop.md). This topic is the governance question.

## 2. Simple Explanation

Before the system does something it can't undo, a person checks.

The engineering is straightforward. The part that fails is the human one: a reviewer approving hundreds of requests with insufficient information provides no safety while creating a record that suggests oversight happened.

## 3. How It Works

```
WHICH ACTIONS NEED IT

  irreversible                    → always
  moves money                     → always
  customer-visible as authoritative → usually
  reversible, low value           → no
  read-only                       → no

Reversibility is the sharpest criterion: an action that can
be undone cheaply rarely justifies the approval cost.
```

**The failure isn't the mechanism — it's rubber-stamping.** An approval record produced without a real decision is worse than no checkpoint, because it manufactures assurance.

## 4. Practical Example

**What determines whether review is real:**

```
INSUFFICIENT
  "Approve refund of $45.00 to account ****3391?"
  → no basis for judgment; the reviewer approves everything

SUFFICIENT
  Action:      refund $45.00 to account ****3391
  Because:     charged retail rate; customer is Premier
  Evidence:    fee schedule v4.2 §3.1 — Premier: $25.00
               TXN-88213 charged $45.00 on 2026-03-03
               waivers used this month: 2 of 2
  Verified:    tier confirmed via core banking API
               (not inferred)
  If wrong:    incorrect refund, reversible within 30 days
  [Approve] [Reject] [Edit]

The "verified vs inferred" line is the one that most
changes a reviewer's judgment — it tells them which facts
to scrutinize.
```

**Review fatigue as a design constraint:**

```
If everything needs approval, reviewers stop reading and
approval degrades to a click.

So fewer, better-targeted checkpoints with richer
information produce MORE actual oversight than many
shallow ones. Being selective is the safety-increasing
choice, which is counterintuitive — the instinct is that
more approval gates means more safety.
```

**The operational requirements people miss:**

```
· a TIMEOUT — a pending approval held indefinitely means
  customers waiting on something nobody will action
· RE-VALIDATION on resume — an approval granted hours
  later may be acting on facts read before the wait
· APPROVER AUTHORIZATION in code on the resume path, not
  in the UI that presented the request
· the EVIDENCE SHOWN recorded in the audit trail, not
  just the decision
```

## 5. Why It Matters

- **Rubber-stamping is worse than no checkpoint** — it manufactures assurance.
- **Fewer, richer checkpoints produce more real oversight** than many shallow ones.
- **Re-validation on resume** prevents acting on facts that changed during the wait.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Insufficient information** | Approval without judgment |
| **Too many checkpoints** | Fatigue; the control degrades to a click |
| **No timeout** | Requests pending indefinitely |
| **No re-validation** | Acting on stale facts |
| **Approver authorization in the UI** | Bypassable via the resume path |
| **Only the decision logged** | Can't show the review was meaningful |

**On measuring whether it's working:** an approval rate near 100% with very short review times is evidence of rubber-stamping, not of a well-behaved system. Tracking approval rate, time-to-decision, and rejection reasons is what tells you whether the control is real — and a rejection rate of zero over months is a signal worth investigating rather than celebrating.

**On accountability:** the approver is accountable for the decision, which means they need to be able to reject without friction and to understand what they're approving. An approval flow that makes rejection harder than approval — or that provides no way to ask a question — has designed the outcome it will get.

## 7. Interview Answer

> "Human approval requires a person to authorize an action before it executes, and it's the control that makes consequential AI actions acceptable in a regulated environment. The engineering is straightforward; the part that fails is human.
>
> On which actions, reversibility is the sharpest criterion. Irreversible actions and anything moving money always need approval. Reversible low-value actions rarely justify the cost. Customer-visible authoritative outputs usually do.
>
> The failure mode is rubber-stamping, and it's worse than having no checkpoint — because it produces a record suggesting oversight happened when it didn't. So what determines whether review is real is what the reviewer is shown. 'Approve refund of forty-five dollars to account ending 3391' gives no basis for judgment and the reviewer approves everything. What's needed is the action, the reasoning, the evidence with citations, which facts were verified versus inferred, and what happens if it's wrong.
>
> That verified-versus-inferred line is the one that most changes a reviewer's judgment, because it tells them which facts to scrutinize rather than asking them to check everything equally.
>
> The counterintuitive design point is that fewer checkpoints produce more oversight. If everything needs approval, reviewers stop reading and it degrades to a click. So being selective is the safety-increasing choice, even though the instinct is that more gates means more safety.
>
> Operationally, four things get missed. A timeout, because a pending approval held indefinitely means customers waiting on something nobody will action. Re-validation on resume, because an approval granted hours later may be acting on facts read before the wait. Approver authorization checked in code on the resume path rather than in the UI that presented the request, since the UI is bypassable. And recording the evidence shown in the audit trail, not just the decision — otherwise you can prove someone clicked, not that they could reasonably decide.
>
> The thing I'd measure to know whether it's working: approval rate, time to decision, and rejection reasons. An approval rate near a hundred percent with very short review times is evidence of rubber-stamping rather than of a well-behaved system, and a rejection rate of zero over months is worth investigating rather than celebrating.
>
> And on accountability — the approver is responsible for the decision, so they need to be able to reject without friction and to ask a question. An approval flow where rejecting is harder than approving has designed the outcome it's going to get."

## 8. Likely Follow-ups

**Q: Which actions need approval?**
Irreversible ones and anything moving money, always. Customer-visible authoritative outputs usually. Reversible low-value actions rarely — reversibility is the sharpest criterion, since an action that can be undone cheaply doesn't justify the approval cost.

**Q: What makes approval real rather than theatre?**
What the reviewer is shown: the action, the reasoning, the evidence with citations, which facts were verified versus inferred, and the consequence if it's wrong. Without that there's no basis for judgment and the reviewer approves by default.

**Q: Isn't more approval safer?**
No — it's counterintuitive but fewer, richer checkpoints produce more genuine oversight. If everything needs approval, reviewers stop reading and the control degrades to a click, which provides no safety while creating a record that implies it.

**Q: How do you know it's working?**
By tracking approval rate, time to decision, and rejection reasons. An approval rate near a hundred percent with very short review times indicates rubber-stamping, and a zero rejection rate over months is a signal to investigate rather than a sign of a well-behaved system.

**Q: What's missed operationally?**
Timeouts on pending approvals, re-validation of time-sensitive facts on resume, approver authorization checked in code rather than in the UI, and recording the evidence shown rather than only the decision. Each is small and each undermines the control when absent.

## 9. Common Mistakes

- Presenting an action without the evidence behind it.
- Requiring approval for everything, causing fatigue.
- No timeout, so requests pend indefinitely.
- Executing on resume without re-validating the facts.
- Logging the decision but not the evidence shown.

## 10. What to Remember

- **Reversibility decides**; money movement always requires approval.
- **Rubber-stamping is worse than no checkpoint** — it manufactures assurance.
- **Fewer, richer checkpoints** produce more real oversight.
- **Timeout, re-validate, authorize in code, log the evidence.**
- **A zero rejection rate is a warning**, not a success.
