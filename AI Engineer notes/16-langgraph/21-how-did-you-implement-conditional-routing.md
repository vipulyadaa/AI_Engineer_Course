# "How Did You Implement Conditional Routing?"

> **Phase 16 · LANGGRAPH · Topic 21**
>
> ⚠️ **An answer framework.** Use the structure; supply your own thresholds,
> branches, and calibration story. If your routing was simpler than this,
> describe what you had and why it was sufficient.

## 1. Definition

A specific technical question checking whether routing decisions were deterministic, testable, and calibrated — or whether an LLM was asked to decide things a rule could have decided.

## 2. Simple Explanation

The interviewer is looking for one thing above all: did you use a model call where a rule would do?

A threshold comparison in Python is free, deterministic, unit-testable, and auditable. An LLM call for the same decision is none of those.

## 3. How It Works

**The structure:**

```
1. WHAT DECIDED IT    the fields the routing function read
2. DETERMINISTIC?     rule, classifier, or LLM — and why
3. CALIBRATION        where the thresholds came from
4. ORDERING           safety conditions evaluated first
5. TESTING            how you knew every branch worked
```

**Part 3 is the differentiator.** Anyone can write a threshold comparison; explaining where 0.55 came from is what shows the work.

## 4. Practical Example

**A routing function worth describing:**

```python
def after_grading(state: State) -> str:
    # safety conditions first — deterministic, not bypassable
    if state["retrieval_status"] == "failed":
        return "degraded"
    if state["top_score"] < RELEVANCE_FLOOR:
        return "rewrite" if state["attempts"] < 2 else "abstain"
    if len(state["documents"]) < 2:
        return "rewrite" if state["attempts"] < 2 else "abstain"
    return "generate"
```

**The four points to make:**

```
NO MODEL CALL
  Every condition is a comparison over state. Free, instant,
  deterministic, and the same every time — which matters for
  a regulated system where behaviour has to be explainable.

SAFETY FIRST
  Failure and relevance checks are evaluated before anything
  model-influenced, so the model can't route around them.

THE THRESHOLD IS CALIBRATED
  Not a round number. Derived from labelled score
  distributions — sample queries, label the top results
  relevant or not, plot both distributions, pick the point
  giving an acceptable false-negative rate. Copying a
  threshold from elsewhere is meaningless because score
  scales differ per embedding model and corpus.

EVERY BRANCH IS TESTED
  It's a pure function of state, so each branch is one
  assertion:
      assert after_grading({...low score, 2 attempts...}) == "abstain"
```

**Where a model WAS appropriate — if it was:**

```
Classification of question type — simple lookup versus
multi-part investigative — needs to read and interpret the
question, which a rule can't do reliably.

But constrained to a structured output returning one of
three enum values, so the model chooses among declared
branches rather than naming a destination.

If you used a model router, explain that constraint. If you
didn't need one, say the routing was entirely rule-based and
why that was sufficient.
```

## 5. Why It Matters

- **Rule versus model** is the specific thing this question tests.
- **Threshold calibration** is the detail that shows real work.
- **Safety conditions ordered first** is a design point few candidates raise.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We asked the LLM to decide" | Cost, non-determinism, untestable |
| A threshold with no provenance | A guessed number |
| No safety ordering | The model could route around checks |
| "It usually worked" | No testing described |
| Unreachable branches | Dead code presented as handled cases |

**On calibration honesty:** if the threshold was initially picked by intuition and tuned later, say that. "We started at 0.7, saw too many abstentions, and calibrated properly against labelled data" is a better answer than implying it was derived rigorously from the start.

**On simplicity:** if the routing was two branches on one condition, say so. Over-describing routing complexity is easy to expose — the follow-up is "what were the branches?" and a thin answer after a grand description is worse than a modest one held consistently.

## 7. Interview Answer

> "All of it was deterministic — comparisons over state, no model calls in the routing function. Free, instant, the same every time, and unit-testable, which matters in a regulated system where behaviour has to be explainable.
>
> The function read the retrieval status, the top similarity score, the document count, and the attempt counter. If retrieval failed, route to a degraded path. If the top score was below the relevance floor, rewrite if under two attempts, otherwise abstain. Same for too few documents above the floor. Otherwise generate.
>
> Two design points. First, ordering: the failure and relevance checks come first, before anything model-influenced, so the model can't route around a safety condition. It only gets to choose among the paths that survive those checks.
>
> Second, the threshold. It isn't a round number I picked — score scales differ completely between embedding models and corpora, so a threshold copied from a blog post is a guess. I'd sample a hundred queries, label the top results relevant or not, plot the score distributions for both groups, and pick the point giving an acceptable false-negative rate. That's what makes 'below the floor' mean something.
>
> On testing: because it's a pure function of state, every branch is one assertion — low score with two attempts returns abstain, and so on. That's how I knew every declared branch was reachable and behaved as intended, which also catches unreachable branches that look like handled cases but are dead code.
>
> [**Your specifics here.** If you used a model for question-type classification, explain that it returned a constrained enum rather than a destination, so the model chose among declared branches. If your routing was entirely rule-based, say so and why that was sufficient. And if the threshold started as a guess and was calibrated later, say that too — it's a better answer than implying rigour from day one.]"

## 8. Likely Follow-ups

**Q: Did you use an LLM for routing?**
Not for decisions expressible as rules over state — those are free, deterministic, and testable, and a model call for a threshold comparison is strictly worse. A small classifier is right only where the decision needs to interpret text, and even then constrained to declared enum options.

**Q: Where did the threshold come from?**
Labelled score distributions for our embedding model and corpus. Sample queries, label the top results relevant or not, plot both distributions, and pick the point with an acceptable false-negative rate. Score scales differ per model, so a copied threshold means nothing.

**Q: How did you order the conditions?**
Safety checks first — retrieval failure, relevance floor — before anything model-influenced. That way the model can only choose among the paths that survive the safety conditions, rather than being able to route around them.

**Q: How did you test the routing?**
One assertion per branch, since it's a pure function of state. That confirms every declared branch is reachable and behaves as intended, and it catches unreachable entries in the mapping, which look like handled cases but are dead code.

**Q: What if the routing had to change?**
Changing a rule is a code change with a test, reviewable and deployable like any other. That's a real advantage over model-based routing, where changing behaviour means changing a prompt and re-measuring, with no guarantee the change is bounded to what you intended.

## 9. Common Mistakes

- Using an LLM call for a threshold comparison.
- A threshold with no calibration story.
- Safety checks evaluated after model-influenced routing.
- No description of how branches were tested.
- Describing more routing complexity than existed.

## 10. What to Remember

- **Deterministic rules over state** — free, testable, auditable.
- **Calibrate the threshold** from labelled score distributions.
- **Safety conditions first**, so they can't be routed around.
- **One assertion per branch** — it's a pure function.
- **Be honest about calibration history** and about how simple it was.
