# Labels

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 16**

## 1. Definition

The correct answers `y` that supervise training. Labels are the scarcest, most expensive, and most error-prone part of a supervised system — and the label you can obtain is usually a **proxy** for the quantity you actually care about.

## 2. Simple Explanation

Labels are the answer key. Everything the model learns comes from them, so whatever is wrong with the answer key is faithfully reproduced — and then applied at scale.

The deepest point: you rarely get to label the thing you want. You want "will this candidate succeed?" but you only have "did we hire them?" Those are different questions, and the gap between them is where the damage happens.

## 3. How It Works

**Where labels come from, ranked by cost:**

| Source | Cost | Quality |
|---|---|---|
| **System events** (clicks, chargebacks) | Free | High but delayed, and biased toward what you showed |
| **User feedback** (thumbs up/down) | Free | Biased — only extreme users respond |
| **Expert annotation** | High | High, if guidelines are good |
| **Crowdsourcing** | Medium | Variable; needs redundancy and agreement checks |
| **Weak supervision** (heuristics) | Low | Noisy but scalable |
| **LLM-generated** | Low-medium | Surprisingly good; inherits the LLM's biases |

**The label quality workflow:**
1. Write explicit annotation guidelines with edge cases resolved.
2. Have 2–3 annotators label an overlapping sample.
3. Compute **Cohen's/Fleiss' kappa**. Below ~0.6 means your *guidelines* are broken, not your model.
4. Fix the guidelines, re-label, then scale up.
5. Keep a small, carefully adjudicated **gold set** separate from bulk noisy training labels.

## 4. Practical Example

**The LLM-labeling pattern** — the highest-value labeling approach available to you today:

```
1. LLM labels 10,000 unlabeled support messages           (~hours, low cost)
2. Humans review only the 1,200 low-confidence cases      (~1 day, not 3 weeks)
3. Train a small classifier on the result
4. Serve the small model:  ~10ms and near-zero cost per call
                           vs. ~500ms and per-call pricing for the LLM
```

You get most of the LLM's quality at a fraction of serving cost. This is distillation via labels, and it's worth proposing unprompted in an interview.

**Label latency, concretely:** if "default" means 90+ days delinquent within 24 months, you can only label loans originated 24+ months ago. Your newest two years of data — the most relevant — are unusable. The mitigation is a shorter-horizon proxy label whose correlation with the real one you validate explicitly.

## 5. Why It Matters

- **Labels are usually the binding constraint**, not compute or algorithms.
- **Label noise sets a hard ceiling.** If annotators disagree 10% of the time, no model exceeds ~90% — and one that does is suspicious.
- **Label bias becomes model bias at scale.** The model doesn't create the bias; it industrialises it.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Wrong target variable** | Available label ≠ quantity of interest | Write both sentences side by side; they differ. Redefine or model the gap |
| **Label noise** | Vague guidelines, annotator disagreement | Measure kappa; fix guidelines before touching the model |
| **Label latency** | Outcome takes months to mature | Validated shorter-horizon proxy label |
| **Selection bias** | You only see outcomes for decisions you made | Rejected applicants have no label, ever. Randomized holdout |
| **Implicit-feedback bias** | Clicks only exist for items you showed | Log what was shown, not just what was clicked |
| **Class imbalance in labels** | Real base rates are skewed | Stratified sampling; PR-AUC; threshold tuning |

**The canonical example:** Amazon's scrapped recruiting model (Reuters, 2018) penalized résumés containing "women's." The model wasn't broken — it faithfully learned a label encoding a decade of biased hiring decisions.

## 7. Interview Answer

> "Labels are the correct answers that supervise training, and they're usually the hard part of a supervised system — not the algorithm.
>
> Three things I'd think about. First, where they come from and what that costs. System events like chargebacks are free but delayed. Expert annotation is high quality but expensive. Increasingly the practical answer for text is to have an LLM pre-label a large batch, have humans review only the low-confidence cases, then train a small fast model on the result — that gets most of the quality at a fraction of the serving cost.
>
> Second, label quality sets a hard ceiling. If annotators disagree ten percent of the time, no model exceeds ninety percent, and one that does is suspicious. So before blaming the architecture I'd measure inter-annotator agreement, and if kappa is below about 0.6 the guidelines are broken, not the model.
>
> Third, and this is the one I'd emphasize: the target variable is a modeling choice. The label I can get is a proxy for what I care about. 'Who did we hire' isn't 'who would succeed.' 'Was there a chargeback' isn't 'was it fraud.' Amazon's recruiting model is the textbook case — the model faithfully learned a label that encoded a decade of biased decisions, and then applied it at scale."

## 8. Likely Follow-ups

**Q: How do you handle noisy labels?**
Measure the noise first with inter-annotator agreement — if it's high, fix the annotation guidelines, because no modeling technique compensates for ambiguous instructions. Then keep a small adjudicated gold set for evaluation, separate from noisy bulk training labels. Techniques like label smoothing and robust losses help the model tolerate noise, but they treat the symptom.

**Q: What's label latency and how do you work around it?**
The delay between making a prediction and observing the outcome. A 24-month default window means your two newest years of data are unusable, so you're structurally training on a stale world. The workaround is a shorter-horizon proxy — 30-day delinquency at 6 months — whose correlation with the real label you validate explicitly rather than assume.

**Q: Can you use an LLM to generate labels?**
Yes, and it's often the right move for text. Have it label in bulk, ask for a confidence signal, route low-confidence cases to humans, and validate the whole pipeline against a human-labeled gold set. The caveats are that the LLM's biases become your labels, and that you shouldn't evaluate the resulting model with the same LLM — you'd be measuring agreement, not correctness.

**Q: What's the difference between implicit and explicit labels?**
Explicit labels are deliberate — an annotator's judgment, a thumbs-down. Implicit labels come from behavior — a click, a purchase, a dwell time. Implicit is abundant and free but biased by presentation: you only observe clicks on things you showed, and position matters enormously. Explicit is scarce and cleaner. Most mature systems train on implicit labels at volume and evaluate against a small explicit gold set.

**Q: How do you audit whether the label is the right target?**
Write two sentences: what I want to predict, and what the label actually measures. If they differ, name the gap explicitly. Then check whether the labeling process encodes a decision someone made — hiring, approval, moderation — because in that case the model learns to reproduce that decision, not the underlying quality. That's a conversation with domain experts, not a statistical test.

## 9. Common Mistakes

- Treating labels as ground truth rather than as a proxy with its own biases.
- Blaming the model when the annotation guidelines are the problem.
- Evaluating on bulk noisy labels instead of an adjudicated gold set.
- Forgetting that rejected or unshown items have no labels at all.
- Using an LLM to both generate labels and evaluate the resulting model.
- Ignoring label latency when planning what data is actually usable.

## 10. What to Remember

- **The label is the hard part**, not the algorithm.
- **Ask: is this the thing I actually care about?** The gap between proxy and goal is where harm lives.
- **Kappa below ~0.6 means fix the guidelines**, not the model.
- **Label noise is a hard accuracy ceiling.**
- **LLM pre-label → human review low-confidence → train a small model.** Best current pattern for text.
