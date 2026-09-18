# Underfitting

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 20**

## 1. Definition

When a model is too simple, too constrained, or too under-trained to capture the pattern in the data. It performs poorly on **both** training and validation data.

## 2. Simple Explanation

A student who didn't study enough — they get the practice questions wrong *and* the exam questions wrong.

This is the easier diagnosis of the two: if training performance itself is bad, the problem isn't generalization. The model hasn't learned the pattern at all, so there's nothing to generalize.

## 3. How It Works

Causes, in the order worth checking:

1. **Model too simple** — a linear model on a genuinely non-linear relationship.
2. **Features too weak** — the signal isn't in the inputs you provided.
3. **Under-trained** — stopped too early, or the learning rate is too low to make progress.
4. **Over-regularized** — regularization strength so high it suppresses real signal.
5. **Learning rate too high** — the optimizer bounces around without converging.

```
loss │
     │╲___________________________  ── validation
     │ ╲__________________________  ── training
     │      ↑ both high, both flat, gap tiny
     └──────────────────────────── epochs
       Adding dropout here makes it WORSE.
```

**The tell:** training and validation performance are both bad **and close together**.

## 4. Practical Example

```
              train    val     diagnosis
Model A       0.92    0.61     overfitting — big gap
Model B       0.68    0.66     UNDERFITTING — both bad, tiny gap
Model C       0.89    0.85     healthy
```

Model B is the one people misdiagnose. The small gap looks reassuring — no overfitting! — so the instinct is to add capacity cautiously. In fact it needs *more* capacity, better features, or less regularization.

**The debugging move:** deliberately try to **overfit a batch of 10 examples**. A model that can't drive loss to near zero on ten examples has a bug or is structurally incapable, and no amount of hyperparameter tuning fixes that.

**In RAG:** the equivalent of underfitting is a retrieval step that never surfaces the right chunk regardless of the prompt. No prompt engineering compensates for a chunk that isn't in the context — that's a capability failure, not a tuning failure.

## 5. Why It Matters

- **It's diagnosed differently from overfitting and fixed in the opposite direction.** Confusing them means applying exactly the wrong remedy.
- **It's the cheap failure to rule out first** — if training performance is bad, stop looking at generalization.
- **It's often a signal problem, not a model problem.** If a human expert can't do the task from the same inputs, the model probably can't either, and you're being asked to predict noise.

## 6. Trade-offs / Failure Modes

**Fixes, in order:**

| Fix | When |
|---|---|
| **Train longer / raise learning rate** | Loss is still decreasing when you stopped |
| **Reduce regularization** | You added heavy weight decay or dropout preemptively |
| **Better features** | Domain knowledge isn't encoded — interactions, ratios, time-derived features |
| **Bigger model** | Genuinely non-linear relationship, linear model |
| **Check for a bug** | Can't overfit 10 examples → it's a bug, not a capacity issue |

**The irreducible case:** sometimes the signal simply isn't there. If credit score and income genuinely don't predict a particular outcome, no model recovers it. Recognizing an irreducible-error ceiling rather than escalating model complexity indefinitely is a maturity signal.

## 7. Interview Answer

> "Underfitting is when the model is too simple or too constrained to capture the pattern, so it performs poorly on both training and validation data. The signature is that both metrics are bad and close together — unlike overfitting, where there's a large gap.
>
> It's the easier diagnosis, and it's the one to rule out first: if training performance itself is bad, generalization isn't the problem, because there's nothing to generalize yet.
>
> I'd check causes in this order. Is it still improving when I stopped — train longer or raise the learning rate. Did I over-regularize — reduce weight decay or dropout. Are the features too weak — this is usually the real answer on tabular problems, and better features beat a bigger model most of the time. Then model capacity.
>
> Before any of that, I'd try to deliberately overfit ten examples. If the model can't drive loss to near zero on ten examples, I have a bug, not a capacity problem, and tuning won't help.
>
> The case worth naming is that sometimes the signal genuinely isn't in the data. If a human expert couldn't do the task from the same inputs, I'm being asked to predict noise, and escalating model complexity just burns compute."

## 8. Likely Follow-ups

**Q: How do you tell underfitting from overfitting?**
Look at both metrics together. Both bad and close means underfitting. Training good, validation much worse means overfitting. They're fixed in opposite directions, so getting this backwards means applying exactly the wrong remedy — adding dropout to an underfit model makes it worse.

**Q: Your model underfits. What do you try first?**
Train longer or raise the learning rate if loss was still decreasing. Then reduce regularization. Then improve features, which on tabular problems is usually where the real gain is. Then increase capacity. But before all of it, sanity-check by overfitting a tiny batch — that separates a bug from a genuine capacity limit in about two minutes.

**Q: Can better features fix underfitting?**
Often, and it's usually the highest-leverage fix on tabular data. If the relationship is `loan_amount / income` and you only provide the two raw columns, a linear model can't express the ratio. Providing the derived feature directly can move performance more than switching model families.

**Q: Is underfitting ever acceptable?**
Yes, when the constraint is deliberate. A simpler model may be required for interpretability, latency, or regulatory reasons, and you accept some accuracy loss for that. The key is that it's an explicit trade-off you can defend, not an accident you didn't notice.

**Q: What if more capacity doesn't help?**
Then the signal likely isn't in the features, the labels are too noisy, or the task is near its irreducible error floor. I'd check inter-annotator agreement on the labels, check whether a human expert can do the task from the same inputs, and compare against a strong baseline. Recognizing a ceiling is more useful than iterating on architectures indefinitely.

## 9. Common Mistakes

- Adding regularization to a model that's already underfitting.
- Only checking validation metrics and missing that training performance is also bad.
- Jumping to a bigger model before checking learning rate, training duration, and features.
- Not sanity-checking with a tiny-batch overfit.
- Assuming every performance problem is overfitting, since that's the more famous one.

## 10. What to Remember

- **Too simple or too constrained.** Bad on training *and* validation, with a small gap.
- **Rule it out first** — bad training performance means generalization isn't the issue.
- **Fix order:** train longer / higher LR → less regularization → better features → bigger model.
- **Can't overfit 10 examples? It's a bug.**
- **Sometimes the signal isn't there.** Recognizing the ceiling beats escalating complexity.
