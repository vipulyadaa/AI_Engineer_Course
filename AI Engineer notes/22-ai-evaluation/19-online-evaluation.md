# Online Evaluation

> **Phase 22 · AI EVALUATION · Topic 19**

## 1. Definition

Measuring quality on live production traffic — through implicit behavioural signals, explicit feedback, and sampled human review — rather than on a fixed dataset.

## 2. Simple Explanation

Offline evaluation measures the cases you chose. Online evaluation measures what actually happens.

The difference matters because production traffic contains question types, phrasings, and failure modes your golden set doesn't — and those are precisely the ones you didn't know to test.

## 3. How It Works

```
IMPLICIT SIGNALS — free, immediate, no labelling
  escalation to a human      the most honest quality signal
  question rephrased         the answer didn't land
  conversation abandoned
  repeat question, same session
  abstention rate
  retrieval score distribution

EXPLICIT SIGNALS — sparse, biased
  thumbs up/down
  survey responses

SAMPLED HUMAN REVIEW — expensive, ground truth
  stratified: all escalations, all abstentions, a sample
  of ordinary successes
```

**Implicit signals carry most of the value** because they're free, immediate, and unbiased by who chose to respond.

## 4. Practical Example

**Escalation rate as the primary online metric:**

```
A customer asking for a human is the clearest statement
that the system didn't help.

It needs no labelling, it's unambiguous, and it moves
before anyone complains formally.

Break it down by:
  · question type — which categories drive escalation
  · whether the system abstained first (good) or answered
    and was escalated anyway (bad)

That second split matters. Escalation after abstention is
the system working as designed. Escalation after a
confident answer means the answer was wrong or unhelpful —
and those are completely different problems reported by the
same number.
```

**That distinction is the substantive point** — an undifferentiated escalation rate conflates a working safety path with a quality failure.

**Why explicit feedback is weak:**

```
· response rate is low and self-selecting
· negative feedback over-represented
· "thumbs down" doesn't say what was wrong
· gameable, if it feeds anything downstream

Useful as a sampling signal — review the thumbs-down cases
— rather than as a quality metric in itself.
```

**The loop that makes online evaluation worth having:**

```
production signal → sample the failures → human review →
add to the golden set → offline gate catches it next time

Without that loop, online evaluation is a dashboard. With
it, production failures become permanent regression tests,
and the golden set stops being a snapshot of launch-day
assumptions.
```

## 5. Why It Matters

- **It measures what you didn't know to test** — the golden set can't.
- **Escalation rate is the clearest signal** and needs no labelling.
- **The feedback loop into the golden set** is what makes it more than a dashboard.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Undifferentiated escalation rate** | Conflates working abstention with failure |
| **Explicit feedback as a quality metric** | Sparse, self-selecting, biased |
| **No loop back to the golden set** | Failures recur |
| **Signals without a baseline** | No reference for what's normal |
| **Sampling uniformly** | Budget spent on cases that worked |
| **Feedback feeding tuning automatically** | A poisoning vector |

**On establishing a baseline:** online signals are only interpretable relative to a known-good period. Capturing escalation rate, abstention rate, and retrieval score distribution during the first weeks of stable operation is what makes "is 14% escalation high?" answerable. Without it, every investigation starts from nothing.

**On the gap between online and offline:** if offline scores are healthy and escalation is rising, the golden set has stopped representing production. That gap is itself a metric — it says the evaluation needs refreshing more than the system needs fixing, which is a different and cheaper piece of work.

## 7. Interview Answer

> "Offline evaluation measures the cases you chose; online evaluation measures what actually happens. That matters because production traffic contains question types, phrasings, and failure modes the golden set doesn't — and those are precisely the ones you didn't know to test.
>
> Most of the value is in implicit signals, because they're free, immediate, and unbiased by who chose to respond. Escalation to a human, questions being rephrased, conversations abandoned, repeat questions in a session, abstention rate, and the retrieval score distribution.
>
> Escalation rate is the primary one. A customer asking for a human is the clearest possible statement that the system didn't help, it needs no labelling, and it moves before anyone complains formally.
>
> But it has to be broken down, and this is the point I'd emphasize. Escalation after the system abstained is the safety path working as designed. Escalation after a confident answer means the answer was wrong or unhelpful. Those are completely different problems reported by the same number, so an undifferentiated escalation rate conflates a working control with a quality failure — and the second is the one that needs action.
>
> Explicit feedback I'd treat as weak. Response rates are low and self-selecting, negative feedback is over-represented, a thumbs-down doesn't say what was wrong, and it's gameable if it feeds anything downstream. It's useful as a sampling signal — review the thumbs-down cases — rather than as a metric in itself. And I'd never let it feed tuning automatically, because that's a poisoning vector.
>
> The thing that makes online evaluation worth having rather than being a dashboard is the loop: production signal, sample the failures, human review, add them to the golden set, and then the offline gate catches that class next time. Without that loop, production failures recur and the golden set stays a snapshot of launch-day assumptions.
>
> Two practical points. Baselines — these signals are only interpretable relative to a known-good period, so I'd capture escalation rate, abstention rate, and score distribution during the first weeks of stable operation. Otherwise 'is fourteen percent escalation high?' is unanswerable.
>
> And the gap between online and offline is itself a metric. If offline scores are healthy while escalation rises, the golden set has stopped representing production. That tells you the evaluation needs refreshing rather than the system needing fixing — a different and much cheaper piece of work."

## 8. Likely Follow-ups

**Q: What's the best online signal?**
Escalation to a human. It's the clearest statement that the system didn't help, needs no labelling, and moves before formal complaints. Rephrased questions, abandonment, and abstention rate are the supporting signals.

**Q: How should escalation be broken down?**
By whether the system abstained first. Escalation after abstention is the safety path working; escalation after a confident answer means the answer was wrong or unhelpful. An undifferentiated rate conflates a working control with a quality failure.

**Q: Is thumbs-up/down useful?**
As a sampling signal, not a metric. Response rates are low and self-selecting, negative feedback is over-represented, and it doesn't say what was wrong. Review the thumbs-down cases — but never let it feed tuning automatically, because that's a poisoning vector.

**Q: What makes online evaluation more than a dashboard?**
The loop back into the golden set. Sample the production failures, review them, add them as cases, and the offline gate catches that class next time. Without it, failures recur and the golden set stays a launch-day snapshot.

**Q: What does a gap between online and offline mean?**
That the golden set has stopped representing production. If offline scores are healthy while escalation rises, the evaluation needs refreshing rather than the system needing fixing — which is a different and considerably cheaper piece of work.

## 9. Common Mistakes

- Reporting escalation rate without splitting on prior abstention.
- Treating explicit feedback as a quality metric.
- No loop from production failures back into the golden set.
- No baseline captured during stable operation.
- Letting user feedback feed tuning automatically.

## 10. What to Remember

- **It measures what you didn't know to test.**
- **Escalation rate is primary** — free, unambiguous, early.
- **Split escalation on prior abstention** — two different problems, one number.
- **The loop into the golden set** is what makes it worth having.
- **An online/offline gap means the eval set is stale**, not the system broken.
