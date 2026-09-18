# "How Did You Handle Irrelevant Results?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 15**
>
> ⚠️ **An answer framework.** If the system had no abstention path, say so —
> and say what you'd add. That's a legitimate and common gap.

## 1. Definition

A question about what happens when retrieval returns nothing useful. Vector search always returns k results — it has no concept of "nothing matched" — so the handling has to be built.

## 2. Simple Explanation

Ask a vector index for the top 5 and you get 5 results, always. If nothing in the corpus is relevant, you get the 5 least-irrelevant chunks.

Without a check, those go straight into the prompt and the model answers from them.

## 3. How It Works

```
THE DEFENCE LAYERS

1. THRESHOLD    drop results below a calibrated score
2. RERANK       a cross-encoder scores relevance far
                better than embedding distance
3. ABSTAIN      if nothing survives, say so — don't
                generate
4. INSTRUCT     the prompt must permit "I don't have that"
5. VERIFY       check the answer against what was retrieved

The threshold is the mechanism. The abstention instruction
is what makes the model willing to use it.
```

## 4. Practical Example

**What the failure looks like:**

```
Query: "What's the fee for a wire transfer to Antarctica?"

The corpus has no Antarctica policy. Vector search returns
the 5 chunks closest in embedding space — international
transfer fees, correspondent bank charges, currency
conversion.

Without a threshold, the model receives plausible fee
content and produces a confident answer about a policy
that does not exist.

And it will be grounded — every figure traceable to a
retrieved chunk. It just answers a different question than
the one asked.
```

**The two thresholds worth distinguishing:**

```
ABSOLUTE   top score below the floor → nothing is
           relevant → abstain

RELATIVE   top score barely above the second → the
           retrieval didn't discriminate → a sign the
           query was ambiguous, not that the corpus
           lacks the answer

The relative one is the more interesting signal, because
a flat score distribution usually means the query needs
clarifying rather than that the answer is absent.
```

**Calibrating the threshold, which is the real question:**

```
1. Sample real queries across the range of topics
2. Retrieve, and label each top result relevant or not
3. Plot the score distribution for each label
4. Pick the point with an acceptable false-negative rate

FALSE NEGATIVE = abstaining when the answer was there.
That's the cost, and it's a real one — users who get
"I don't have that" for answerable questions stop asking.

So calibration is a policy decision, not a technical one:
how often is it acceptable to refuse a question you could
have answered? In banking, wrongly answering is worse than
wrongly abstaining — so the threshold sits conservative.

And the value is model- and corpus-specific. A number
copied from a blog post is a guess, because score scales
differ completely between embedding models.
```

## 5. Why It Matters

- **Vector search has no "nothing matched"** — it always returns k.
- **The threshold must be calibrated**, because score scales are model-specific.
- **Abstention needs prompt permission**, not just a retrieval check.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "The prompt said to only use the context" | The irrelevant context *is* context |
| An uncalibrated threshold | Fires wrongly in both directions |
| No abstention path | Answers from noise by design |
| Threshold copied from elsewhere | Score scales differ per model |
| Never measuring the abstention rate | The regression is silent |

**On the cost of abstaining:** a system that abstains too readily is also broken — users who get "I don't have that information" for answerable questions stop using it. Abstention rate should be a monitored metric with an expected range, because a sudden rise means a retrieval regression and a sudden fall means the threshold stopped protecting anything. Both are silent otherwise.

**On what makes abstention actually happen:** the threshold is the mechanism, but the prompt determines the behaviour. Without an explicit permission to say "I don't have that", a model given weak context will still produce something — filling a gap is its default. The instruction has to name the alternative.

**On the better user experience:** a bare "I don't have that information" is a dead end. Naming what the corpus does cover nearby, or offering to hand off to a human, turns a refusal into a route forward — and in a banking context, the handoff path is often a requirement rather than a nicety.

## 7. Interview Answer

> "[**Your handling.** If there was none, say so and describe what you'd add.]
>
> "The thing to understand first is that vector search always returns k results — it has no concept of 'nothing matched'. So if someone asks about a policy that doesn't exist in the corpus, you get back the k least-irrelevant chunks, and without a check those go straight into the prompt.
>
> What that produces is a confident answer about a policy that doesn't exist, grounded in real retrieved text. Every figure traceable to a chunk. It just answers a different question than the one asked — which is why groundedness evaluation doesn't catch it.
>
> [**Describe what you had.**] The mechanism is a relevance threshold: if the top score falls below a floor, abstain rather than generate.
>
> Calibrating it is the real work. Sample real queries across the topic range, retrieve, label each top result relevant or not, plot the score distributions for the two labels, and pick the cut point with an acceptable false-negative rate. And a false negative here means abstaining when the answer was actually there — which is a real cost, because users who get 'I don't have that' for answerable questions stop asking.
>
> So it's a policy decision rather than a technical one: how often is it acceptable to refuse a question you could have answered? In banking, wrongly answering about a fee is worse than wrongly abstaining, so the threshold sits conservative.
>
> Two details. The value is model- and corpus-specific — score scales differ completely between embedding models, so a number copied from elsewhere is a guess. And there's a second threshold worth having: a relative one, where the top score is barely above the second. A flat score distribution usually means the query was ambiguous rather than that the corpus lacks the answer, so that's a signal to ask a clarifying question rather than to abstain.
>
> The other half is the prompt. The threshold is the mechanism, but the instruction determines the behaviour — without explicit permission to say 'I don't have that information', a model given weak context still produces something, because filling a gap is its default. The instruction has to name the alternative.
>
> [**If you didn't have this**] There was no abstention path, so weak retrieval produced an answer anyway. Given the corpus is banking policy, that's the first thing I'd add — and I'd monitor the abstention rate as a metric, because a sudden rise means a retrieval regression and a sudden fall means the threshold stopped protecting anything, and both are silent otherwise.
>
> One last thing on the user experience — a bare 'I don't have that' is a dead end. Naming what the corpus does cover nearby, or routing to a human, turns a refusal into a route forward. In banking that handoff path is usually a requirement rather than a nicety."

## 8. Likely Follow-ups

**Q: Isn't a prompt instruction enough?**
No, because the irrelevant chunks are context. The model is told to use the provided context, and it does — producing a grounded, cited answer about the wrong thing. The retrieval-side check is what prevents weak context from reaching the prompt at all.

**Q: How do you set the threshold?**
Label the top result for a sample of real queries as relevant or not, plot the score distributions, and pick the cut point with an acceptable false-negative rate. It's model- and corpus-specific, so a borrowed value is a guess.

**Q: What's the cost of abstaining too often?**
Users stop asking. A system that refuses answerable questions is broken in a different direction, which is why abstention rate belongs on a dashboard with an expected range — a rise means retrieval regressed, a fall means the threshold stopped protecting anything.

**Q: What if all the scores are similar?**
That's a different signal — the retrieval didn't discriminate, which usually means the query was ambiguous rather than that the corpus lacks the answer. The right response there is a clarifying question, not abstention.

**Q: What should the refusal say?**
Not just "I don't have that". Naming the adjacent topics the corpus does cover, and offering a route to a human, turns a dead end into a next step — and in banking that handoff path is often a compliance requirement.

## 9. Common Mistakes

- Assuming a prompt instruction handles it.
- No threshold at all.
- A threshold copied from a blog post.
- Not monitoring the abstention rate.
- A bare refusal with no route forward.

## 10. What to Remember

- **Vector search always returns k** — "nothing matched" must be built.
- **Calibrate on labelled score distributions**, per model and corpus.
- **The false negative is a real cost** — it's a policy decision.
- **The prompt must permit abstention**, or the model fills the gap.
- **Monitor the abstention rate** — both directions fail silently.
