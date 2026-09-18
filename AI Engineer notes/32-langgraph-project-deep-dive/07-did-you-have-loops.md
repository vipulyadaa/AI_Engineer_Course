# "Did You Have Loops?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 07**
>
> ⚠️ **An answer framework.** If the workflow had no loops, say so — and say
> what would have justified one. That's a legitimate answer.

## 1. Definition

A question about cycles in the graph. The answer is either the loop you had and how it was bounded, or an honest "no" with what would have warranted one.

## 2. Simple Explanation

A loop is a step deciding to run an earlier step again — retry, refine, re-plan.

It's the capability that most distinguishes a graph from a chain, and it's also the one that costs the most when it goes wrong, because an unbounded loop burns money quietly.

## 3. How It Works

```
THE LOOP TYPES, AND WHICH ARE WORTH HAVING

RETRY-ON-FAILURE       a transient error → run again
                       usually better handled at the node
                       level than as a graph cycle

REFINE-ON-QUALITY      output failed a check → try again
                       with feedback
                       ← the one that earns its place

RE-RETRIEVE            verification failed → get better
                       context, then regenerate

AGENT LOOP             model decides the next tool call
                       repeatedly until done
                       unbounded by nature, so the bound
                       is entirely on you

EVERY ONE NEEDS
  a counter in state, an exhausted branch, and a defined
  behaviour when the budget runs out
```

## 4. Practical Example

**The refine loop, and why feedback is what makes it work:**

```
generate → verify → not grounded → regenerate

The naive version passes the same inputs again, and the
model produces roughly the same output. The loop burns
three attempts and changes nothing.

The version that works feeds the FAILURE back:

  "The previous answer claimed 'no monthly limit',
   which is not supported by the retrieved context.
   Rewrite using only supported claims."

Same principle as a human review comment — the retry has
to know what was wrong, or it's just a re-roll.

And if verification failed because the CONTEXT was
missing the answer rather than because the model
misread it, regenerating won't help at all. The loop
should route back to RETRIEVAL in that case, not to
generation.

Distinguishing those two is what makes the loop useful
rather than expensive.
```

**The bound, stated properly:**

```
attempts = 2, and then abstain.

Why two and not five:
  · each attempt is a full generation plus a full
    verification — roughly doubling latency and cost
    per iteration
  · in practice, if two grounded attempts fail, the
    third rarely succeeds. The problem is usually the
    context, not the generation.
  · and there's a user-facing limit: a fifteen-second
    answer isn't better than a four-second "I can't
    answer that reliably"

So the bound comes from a latency budget and a
diminishing-returns observation, not from a round number.
```

**The cost of an unbounded loop:**

```
A cycle with no counter on a question the corpus can't
answer:
  · runs until the recursion limit
  · each iteration is 2+ model calls
  · the request stays open the whole time
  · and it ERRORS at the limit rather than abstaining

So the failure is both expensive and wrong-shaped — the
user gets an error where they should have got an honest
"I don't have that information".
```

**On the honest "no":** many production workflows have no cycles at all, and that's fine. "It was a linear pipeline with conditional exits — I'd have added a refine loop if verification had failed often enough to justify the latency" is a good answer, because it shows the loop was considered as a trade rather than assumed.

## 5. Why It Matters

- **A retry without feedback is a re-roll** — the failure has to go back in.
- **Route to retrieval, not generation**, when the context was the problem.
- **The bound comes from latency and diminishing returns**, not a round number.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Unbounded cycle | Runs to the recursion limit, then errors |
| Retrying with identical inputs | Same output, wasted cost |
| Always regenerating | Doesn't help when context was missing |
| No exhausted branch | Error instead of abstention |
| A high retry bound | Latency users won't wait through |
| Claiming a loop you didn't build | Probed with "how was it bounded?" |

**On loop state growth:** each iteration appending to state grows the checkpoint, and with a checkpoint per step the serialization cost rises with iterations. Storing the latest attempt plus a counter — rather than every attempt's full output — keeps it flat. Worth mentioning because it's a real cost people don't anticipate.

**On detecting a loop that never converges:** the metric is the distribution of attempt counts. If most requests succeed on attempt one and a small tail always exhausts, that tail is a content gap rather than a generation problem — and no amount of retrying fixes it. That's another argument for logging the counter.

## 7. Interview Answer

> "[**Your loop, or an honest no.**]
>
> "[**If you had one**] One cycle: the verification loop. Generate an answer, verify it's grounded in the retrieved context, and if it isn't, go back — bounded at two retries, and then abstain.
>
> Two things made it actually work rather than just repeat.
>
> First, the feedback. A naive retry passes the same inputs again and gets roughly the same output — three attempts, no change, wasted cost. The version that works feeds the failure back: the previous answer claimed there was no monthly limit, that's not supported by the context, rewrite using only supported claims. Same principle as a human review comment — the retry has to know what was wrong or it's just a re-roll.
>
> Second, routing to the right place. If verification failed because the model misread the context, regenerating helps. If it failed because the context didn't contain the answer, regenerating can't help — the loop needs to go back to retrieval instead. Distinguishing those two is what makes the loop useful rather than expensive.
>
> On the bound — two attempts, then abstain. Not a round number: each attempt is a full generation plus a full verification, so roughly doubling latency and cost per iteration. In practice if two attempts fail to ground, the third rarely succeeds, because the problem is usually the context rather than the generation. And there's a user-facing limit — a fifteen-second answer isn't better than a four-second 'I can't answer that reliably'.
>
> The exhausted branch matters as much as the counter. Without it, an unanswerable question runs until the recursion limit and then errors — so the failure is both expensive and the wrong shape. The user gets an error where they should have got an honest abstention.
>
> [**If you had no loops**] The workflow was linear with conditional exits — no cycles. I'd have added a refine loop if verification had been failing often enough to justify the latency, but it wasn't, and adding a loop that fires rarely costs complexity for very little.
>
> One operational point: each iteration appending to state grows the checkpoint, and with a checkpoint per step the serialization cost climbs with iterations. So I'd store the latest attempt and a counter rather than every attempt's full output.
>
> And I'd log the attempt count distribution, because it's diagnostic. If most requests succeed on the first attempt and a consistent tail always exhausts, that tail is a content gap rather than a generation problem — and no amount of retrying fixes a missing document."

## 8. Likely Follow-ups

**Q: How was the loop bounded?**
A counter in state, checked by the conditional edge, with an explicit exhausted branch that abstains. The bound came from the latency budget and the observation that a third attempt rarely succeeds when two have failed.

**Q: Why does a retry need feedback?**
Because identical inputs produce roughly identical output. Passing back what failed — the unsupported claim, specifically — is what makes the second attempt different rather than a re-roll of the same dice.

**Q: When should the loop go back to retrieval instead of generation?**
When verification failed because the answer wasn't in the context. Regenerating can't fix missing information, so the loop has to distinguish "the model misread it" from "it wasn't there".

**Q: What happens with no bound?**
It runs to the recursion limit and errors. That's expensive and wrong-shaped — the user gets an error where an honest "I don't have that information" was the correct outcome.

**Q: What does the attempt-count distribution tell you?**
Where the failures are. A consistent tail that always exhausts is a content gap, not a generation problem — retrying won't fix a document that doesn't exist, so the fix is upstream.

## 9. Common Mistakes

- An unbounded cycle.
- Retrying with unchanged inputs.
- Always regenerating, never re-retrieving.
- No exhausted branch, so the limit produces an error.
- Claiming a loop without being able to state the bound.

## 10. What to Remember

- **Feed the failure back** — a retry without feedback is a re-roll.
- **Re-retrieve when the context was the problem**, don't regenerate.
- **Two attempts, then abstain** — latency and diminishing returns.
- **The exhausted branch makes the outcome right**, not just finite.
- **Log the attempt distribution** — a persistent tail is a content gap.
