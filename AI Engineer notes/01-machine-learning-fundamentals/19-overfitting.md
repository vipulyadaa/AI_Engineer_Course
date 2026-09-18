# Overfitting

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 19**

## 1. Definition

When a model learns patterns specific to the training data — including noise — instead of the underlying signal. It performs well on data it has seen and poorly on data it hasn't.

## 2. Simple Explanation

A student who memorized the answers to the practice exam. Perfect score on the practice test, lost on the real one, because they learned *those specific questions* rather than the subject.

The diagnostic is a **gap**: training performance much better than validation performance. Training accuracy alone tells you nothing about whether the model works.

## 3. How It Works

Overfitting happens when the model has more capacity than the data has signal:

1. **Model capacity exceeds the pattern** — enough parameters to memorize individual examples.
2. **Training loss keeps falling** because memorization reduces it.
3. **Validation loss bottoms out and turns upward** — memorized noise doesn't transfer.
4. **The gap widens** with continued training.

```
loss │
     │╲                            ── validation
     │ ╲    ╱─────────────
     │  ╲__╱     ↑ overfitting begins here
     │   ╲___________________      ── training
     └──────────────────────────── epochs
          ↑ stop here (early stopping)
```

**Conditions that cause it:** too little data relative to model size, too many features, training too long, noisy labels, and no regularization.

## 4. Practical Example

**Reading the curves** — this is the diagnosis in practice:

```
epoch   train    val      read
  5     0.412   0.431     healthy — both falling, small gap
 12     0.288   0.310     healthy — gap stable
 18     0.190   0.315     val flattened; train still dropping
 25     0.088   0.402     OVERFITTING — gap is 4.5×. Best checkpoint was ~15.
```

**Prompt overfitting is the RAG equivalent**, and it's real: you tune a prompt against 20 examples until it handles all of them, and it fails on the 21st. Same mechanism — you fit the quirks of a small sample. The fix is the same: a larger, held-out eval set that you don't iterate against.

## 5. Why It Matters

- **It's the default failure mode of any sufficiently flexible model** — and modern models are all sufficiently flexible.
- **Training metrics are worthless without the gap.** A reported accuracy with no split named is not information.
- **It explains most "worked in the notebook, failed in production"** outcomes, along with leakage and skew.

## 6. Trade-offs / Failure Modes

**How to fix it, roughly in order of effectiveness:**

| Fix | How it works | Note |
|---|---|---|
| **More data** | More signal relative to noise | Most effective and usually hardest |
| **Early stopping** | Stop at the validation minimum | Cheapest; do this always |
| **Regularization** | L2/weight decay, L1, dropout | Penalizes complexity |
| **Simpler model** | Less capacity to memorize | Fewer layers, fewer features, shallower trees |
| **Data augmentation** | Synthetic variation | Effective for images and audio; harder for tabular |
| **Cross-validation** | Better estimate so you notice sooner | Diagnostic, not a cure |

**The trap to avoid:** severe overfitting sometimes indicates **leakage** rather than excess capacity. If the train/validation gap is enormous and appears immediately, check whether a feature is giving away the answer before reaching for dropout.

## 7. Interview Answer

> "Overfitting is when a model learns patterns specific to the training data, including noise, instead of the underlying signal — so it does well on data it's seen and poorly on data it hasn't.
>
> I diagnose it from the gap between training and validation performance, and from the shape of the curves over time. Training loss falling while validation loss flattens and turns upward is the signature. Training accuracy on its own tells me nothing.
>
> To fix it, in order of effectiveness: more data if I can get it, then early stopping which is essentially free, then regularization — weight decay or dropout — then a simpler model or fewer features.
>
> One thing I'd check before reaching for regularization: if the gap is enormous and appears almost immediately, that's often leakage rather than overfitting. A feature that gives away the answer on training data but doesn't generalize produces the same symptom, and dropout won't fix it.
>
> This shows up in my RAG work as prompt overfitting — tuning a prompt against twenty examples until it handles all of them, then watching it fail on the twenty-first. Same mechanism, and the same fix: a larger held-out eval set I don't iterate against."

## 8. Likely Follow-ups

**Q: How do you detect overfitting?**
The gap between training and validation metrics, and the shape over epochs — training improving while validation degrades. With small data a single validation split is noisy, so I'd use cross-validation and look at fold variance; high variance across folds is itself a sign the model is fitting fold-specific noise.

**Q: How does regularization prevent it?**
By adding a penalty on model complexity to the loss, so the optimizer has to trade off fitting the data against keeping weights small. L2 shrinks weights toward zero, L1 drives some to exactly zero, and dropout randomly disables units during training so the network can't rely on any single path. All of them effectively reduce the hypothesis space the model can reach.

**Q: Can a model overfit with lots of data?**
Yes, if capacity is large enough or the data has limited diversity — a million near-duplicate records is not a million examples. It's also possible to overfit the *validation* set through repeated experimentation, which is a different mechanism with the same effect: an optimistic number that doesn't hold up.

**Q: Is overfitting always bad?**
Almost always, but mild overfitting with the best checkpoint restored is normal and fine. What matters is held-out performance, not the size of the gap per se. A model with a 10% gap and 88% validation accuracy beats one with no gap and 80%.

**Q: What's "double descent"?**
An observed phenomenon where test error decreases, then increases around the interpolation threshold where the model just barely fits the training data, then decreases *again* as the model grows much larger. It complicates the classical picture that bigger always eventually means worse generalization, and it's part of why very large overparameterized models work better than classical theory predicted.

## 9. Common Mistakes

- Reporting training accuracy as if it were performance.
- Assuming a large train/validation gap must be overfitting, without checking for leakage.
- Adding regularization before trying early stopping.
- Saving the final epoch's weights rather than the best checkpoint.
- Iterating prompts against a small eval set and calling the result generalization.

## 10. What to Remember

- **Memorizes noise instead of signal.** Good on seen data, bad on unseen.
- **The signature:** training loss falling, validation loss rising. Watch both curves.
- **Fix order:** more data → early stopping → regularization → simpler model.
- **A huge immediate gap usually means leakage,** not capacity.
- **Prompt overfitting is real** — tune against a held-out eval set, not 20 examples.
