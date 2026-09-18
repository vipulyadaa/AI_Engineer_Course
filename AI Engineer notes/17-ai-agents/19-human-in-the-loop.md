# Human in the Loop

> **Phase 17 · AI AGENTS · Topic 19**

## 1. Definition

Requiring human approval or input at defined points in an agent's execution. It's the primary control for actions whose consequences the system shouldn't take autonomously.

## 2. Simple Explanation

Before the agent does something consequential, a person confirms it.

The engineering question isn't whether to have humans involved — in banking that's settled. It's *where* the checkpoints go, what the human is shown, and what happens while the agent waits.

## 3. How It Works

```
THREE PLACEMENTS

  APPROVAL       agent proposes → human approves → execute
                 for consequential actions
  REVIEW         agent completes → human checks → release
                 for consequential outputs
  ESCALATION     agent can't proceed → hand to a human
                 for uncertainty and out-of-scope cases
```

**Deciding which actions need approval:**

| Property | Approval? |
|---|---|
| Reversible, low value | No |
| Irreversible | **Yes** |
| Moves money | **Yes** |
| Visible to a customer as authoritative | Usually |
| Read-only | No |

**Reversibility is the sharpest criterion.** A reversible action can be undone if wrong; an irreversible one can't, which is what makes the approval worth its cost.

## 4. Practical Example

**What the human is shown determines whether review is real:**

```
BAD
  "The agent wants to issue a $45 refund. Approve?"
  → no basis for judgment; the human approves everything,
    and the checkpoint becomes theatre

GOOD
  Action:     refund $45 to account ****3391
  Because:    charged retail rate; customer is Premier
  Evidence:   fee schedule v4.2 §3.1 — Premier = $25
              transaction TXN-88213, charged $45.00
              waivers used this month: 2 of 2
  Confidence: tier verified via core banking (not inferred)
  If wrong:   an incorrect refund, reversible within 30 days
  [Approve] [Reject] [Edit amount]
```

**Rubber-stamping is the real failure mode.** A reviewer approving hundreds of requests with insufficient information provides no safety while creating a record suggesting oversight — which is worse than no checkpoint, because it manufactures false assurance.

**The state problem while waiting:**

```
Approval takes minutes to hours. The agent cannot hold a
conversation open that long.

  · serialize state and suspend
  · resume on approval, with the decision in state
  · re-validate before executing — facts may have changed
    while waiting

That re-validation step is easy to miss and genuinely
matters: an approval granted at 10am acting on a balance
read at 9:55 may be acting on stale information.
```

## 5. Why It Matters

- **It's the control that makes consequential agent actions acceptable** in regulated settings.
- **Presentation quality determines whether review is real** or theatre.
- **Suspend-and-resume with re-validation** is the design detail people miss.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Rubber-stamping** | Approval without basis; false assurance |
| **Too many checkpoints** | Review fatigue; the agent's value disappears |
| **Too few** | Consequential actions taken unsupervised |
| **No state persistence** | Can't survive the wait |
| **No re-validation on resume** | Acting on stale facts |
| **No timeout** | Requests pending indefinitely |

**On review fatigue:** if every action needs approval, reviewers stop reading and the control degrades to a click. Fewer, better-targeted checkpoints with richer information produce more actual oversight than many shallow ones. That's an argument for being selective rather than cautious-by-default.

**On the audit record:** for a regulator, what matters is who approved what, when, on what evidence, and whether they could have declined. Capturing the *evidence shown* — not just the decision — is what makes the record meaningful, and it has to be designed in rather than reconstructed.

## 7. Interview Answer

> "Human in the loop means requiring approval or input at defined points. In banking the question isn't whether — it's where the checkpoints go, what the human sees, and what happens while the agent waits.
>
> There are three placements. Approval before a consequential action, review of a consequential output before release, and escalation when the agent can't proceed. For deciding which actions need approval, reversibility is the sharpest criterion — a reversible action can be undone if wrong, an irreversible one can't, and that's what makes the approval worth its cost. Anything moving money gets approval regardless.
>
> What determines whether the control is real is what the human is shown. 'The agent wants to issue a forty-five dollar refund, approve?' gives no basis for judgment, so the reviewer approves everything and the checkpoint becomes theatre. What's needed is the action, the reasoning, the evidence with citations, whether facts were verified or inferred, and what happens if it's wrong. Then the human can actually decide.
>
> Rubber-stamping is the real failure mode, and it's worse than having no checkpoint — because it creates a record suggesting oversight that didn't happen. Which is also why I'd be selective: if everything needs approval, reviewers stop reading and the control degrades to a click. Fewer, better-targeted checkpoints with richer information produce more genuine oversight than many shallow ones.
>
> The design detail people miss is state while waiting. Approval takes minutes to hours, and the agent can't hold a conversation open that long. So state gets serialized and suspended, then resumed with the decision recorded. And critically, re-validated before executing — an approval granted at ten acting on a balance read at nine fifty-five may be acting on stale information. That re-validation step is easy to skip and genuinely matters.
>
> For audit, what a regulator cares about is who approved what, when, on what evidence, and whether they could have declined. Capturing the evidence that was shown — not just the decision — is what makes the record meaningful, and it has to be designed in rather than reconstructed later."

## 8. Likely Follow-ups

**Q: Which actions need human approval?**
Irreversible ones and anything moving money, as a baseline. Reversibility is the sharpest criterion — if the action can be undone cheaply, the approval cost usually isn't worth it. Read-only operations don't need it, and customer-visible authoritative outputs usually do.

**Q: What should the human be shown?**
The proposed action, the reasoning, the supporting evidence with citations, whether key facts were verified or inferred, and the consequence if it's wrong. Without that there's no basis for judgment and the reviewer approves by default, which makes the checkpoint theatre.

**Q: What's the risk of too many checkpoints?**
Review fatigue. Reviewers stop reading and approval degrades to a click, so the control provides no safety while creating a record implying oversight. Fewer, well-targeted checkpoints with richer information produce more genuine review than many shallow ones.

**Q: How does the agent wait for approval?**
By serializing its state and suspending — it can't hold a conversation open for hours. On approval it resumes with the decision recorded in state, and critically re-validates the facts before executing, since an approval granted later may be acting on information read much earlier.

**Q: What matters for the audit record?**
Who approved, what exactly, when, on what evidence, and whether declining was possible. Capturing the evidence presented rather than only the decision is what makes the record meaningful to a regulator, and it needs designing in from the start.

## 9. Common Mistakes

- Presenting approvals without enough information to judge.
- Requiring approval for everything, causing fatigue.
- Not persisting state across the approval wait.
- Executing on resume without re-validating the facts.
- Logging the decision but not the evidence shown.

## 10. What to Remember

- **Approval, review, escalation** — three distinct placements.
- **Reversibility is the criterion**; money movement always.
- **Presentation determines whether review is real** — evidence, not just the ask.
- **Suspend state, resume, and re-validate** before executing.
- **Log the evidence shown**, not only the decision.
