# "How Did You Handle Human Intervention?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 10**
>
> ⚠️ **An answer framework.** If the workflow had no human step, say so and
> describe where you'd add one. That's a legitimate answer.

## 1. Definition

A question about the interrupt mechanism — pausing a workflow, waiting for a person, and resuming. It's the capability that most justifies the framework, and the design questions are about *when* to pause and *what happens while paused*.

## 2. Simple Explanation

The workflow stops at a node, saves everything, and releases the process. A person reviews. Later — minutes or hours — the workflow resumes exactly where it stopped, with their decision in state.

The hard parts aren't the pause. They're deciding what to escalate, and what happens to a review nobody ever does.

## 3. How It Works

```
THE MECHANISM

  node runs → interrupt before the next node
  → state is checkpointed under a thread ID
  → the process is FREE; nothing is held open
  → a reviewer sees the pending item
  → their decision is written into state
  → the workflow resumes from the checkpoint

THE DESIGN QUESTIONS THAT ACTUALLY MATTER

  WHAT triggers a pause
  WHAT the reviewer sees
  WHAT they can do — approve, edit, reject, escalate
  WHAT HAPPENS IF NOBODY RESPONDS   ← the forgotten one
```

## 4. Practical Example

**What to escalate — the rule that keeps volume manageable:**

```
ESCALATE ON CONSEQUENCE × UNCERTAINTY

  high consequence + low confidence  → review
  high consequence + high confidence → sample for review
  low consequence  + low confidence  → abstain, don't
                                       escalate
  low consequence  + high confidence → serve

Concretely:
  · a fee or eligibility answer with a low verification
    score → review
  · a branch-hours answer with a low score → just
    abstain; a human reviewing it costs more than the
    answer is worth

The mistake is escalating on uncertainty alone. That
floods the queue with low-value items, and a flooded
queue gets rubber-stamped — at which point the review
step is theatre.
```

**The timeout problem, which is the real design question:**

```
A paused workflow with no reviewer waits forever.

  · the customer is still waiting
  · the checkpoint accumulates
  · and nothing alerts, because nothing failed

SO EVERY INTERRUPT NEEDS A DEADLINE, and a defined
behaviour when it expires:

  TIMEOUT → abstain and route the customer to a human
            channel

Not "serve the unreviewed answer" — that defeats the
review. And not "wait indefinitely" — that's a customer
sitting on a spinner.

The timeout branch is a real edge in the graph, and it's
the part people forget to draw.
```

**What the reviewer needs to see:**

```
Not just the answer. The answer plus:
  · the question as asked
  · the retrieved chunks with sources
  · WHY it was flagged — which claim failed verification
  · what the system would have said

Because the reviewer's job is a judgement about
grounding, and they can't make it without the evidence.

Showing only the answer turns review into a vibe check,
which is the same as no review with extra latency.
```

**The feedback loop that makes it worth the cost:** a reviewer's correction is a labelled example. Corrections flowing into the golden set means the review queue improves the system over time rather than just filtering its output — and that's the difference between human-in-the-loop as a cost centre and as a quality mechanism.

## 5. Why It Matters

- **Escalate on consequence × uncertainty**, not uncertainty alone.
- **Every interrupt needs a deadline** and a defined timeout branch.
- **Reviewers need the evidence**, or review is a vibe check.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Escalating on uncertainty alone | A flooded queue that gets rubber-stamped |
| No timeout on the interrupt | Customers wait forever; nothing alerts |
| Timeout serves the unreviewed answer | Defeats the purpose of the review |
| Showing the reviewer only the answer | Judgement without evidence |
| Holding a process open while paused | The whole point of checkpointing, lost |
| Corrections not captured | The queue filters but never improves |

**On the audit value:** the reviewer's identity, their decision, and the state they saw all belong in the record. In a regulated environment "a human approved this" is only meaningful if you can say who, when, and on what basis — and because the interrupt already checkpoints state, capturing it is nearly free.

**On the volume reality:** a review queue only works if someone owns it with a defined SLA. An unowned queue is a workflow that silently stops answering a class of questions. Naming who reviews and how fast is part of the design, not an operational detail to figure out later.

## 7. Interview Answer

> "[**Your setup, or where you'd add one.**]
>
> "[**If you had it**] The workflow paused before finalizing when an answer was flagged — the graph interrupts at that node, state is checkpointed under a thread ID, and the process is released. Nothing is held open. A reviewer sees the pending item, makes a decision, it's written into state, and the workflow resumes from the checkpoint.
>
> That release is the part that makes it work at all. Approval might come back in minutes or hours, so holding a process open waiting for it doesn't scale — and building checkpoint-and-resume yourself is the main reason I'd reach for this framework.
>
> On what triggers the pause: consequence times uncertainty, not uncertainty alone. A fee or eligibility answer with a low verification score goes to review. A branch-hours answer with a low score just abstains, because a human reviewing it costs more than the answer is worth.
>
> That rule matters because escalating on uncertainty alone floods the queue with low-value items, and a flooded queue gets rubber-stamped — at which point the review step is theatre. I'd rather have a small queue that's genuinely read.
>
> The design question people forget is what happens if nobody responds. A paused workflow with no reviewer waits forever — the customer is still waiting, checkpoints accumulate, and nothing alerts because nothing failed. So every interrupt needs a deadline and a defined expiry behaviour.
>
> And the expiry should abstain and route the customer to a human channel. Not serve the unreviewed answer, because that defeats the review entirely. And not wait indefinitely, because that's a customer sitting on a spinner. That timeout branch is a real edge in the graph and it's the one people forget to draw.
>
> On what the reviewer sees — not just the answer. The question as asked, the retrieved chunks with their sources, which specific claim failed verification, and what the system would have said. Their job is a judgement about grounding, and they can't make it without the evidence. Showing only the answer turns review into a vibe check, which is the same as no review with extra latency.
>
> Two things I'd make sure of. The reviewer's identity, their decision, and the state they saw all go into the record — because in a regulated environment 'a human approved this' only means something if you can say who, when, and on what basis. And since the interrupt already checkpoints state, capturing that is nearly free.
>
> And corrections feed back into the golden set. A reviewer's correction is a labelled example, so the queue improves the system over time rather than just filtering its output. That's the difference between human-in-the-loop being a cost centre and being a quality mechanism.
>
> [**If you had no human step**] There wasn't one — the workflow abstained rather than escalating. I'd add review for high-consequence low-confidence answers, and the thing I'd design first is the timeout branch, because an interrupt without a deadline is a customer waiting on a queue nobody owns."

## 8. Likely Follow-ups

**Q: What triggers a review?**
Consequence times uncertainty. High-consequence answers with low confidence go to review; low-consequence uncertain answers just abstain. Escalating on uncertainty alone floods the queue, and a flooded queue gets rubber-stamped.

**Q: What if nobody reviews it?**
Every interrupt needs a deadline and an expiry branch — abstain and route to a human channel. Serving the unreviewed answer defeats the review, and waiting indefinitely leaves a customer on a spinner with nothing alerting.

**Q: Is a process held open while paused?**
No — state is checkpointed and the process is released. That's what makes asynchronous approval viable, and it's the main reason to use a framework with persistence rather than writing the orchestration directly.

**Q: What does the reviewer see?**
The question, the retrieved chunks with sources, which claim failed verification, and the proposed answer. Without the evidence they can't make a grounding judgement, and review becomes a vibe check.

**Q: What do you do with their decision?**
Record it for audit — who, when, on what state — and feed corrections into the golden set. That turns the queue from a filter into a quality mechanism that improves the system over time.

## 9. Common Mistakes

- Escalating on uncertainty without weighing consequence.
- No timeout on the interrupt.
- Expiry that serves the unreviewed answer.
- Reviewers shown the answer without the evidence.
- Corrections discarded rather than captured.

## 10. What to Remember

- **Consequence × uncertainty** decides what escalates.
- **The process is released** while paused — that's the point.
- **Every interrupt needs a deadline** and a timeout branch.
- **Show the evidence**, or review is theatre.
- **Corrections into the golden set** — filter becomes quality loop.
