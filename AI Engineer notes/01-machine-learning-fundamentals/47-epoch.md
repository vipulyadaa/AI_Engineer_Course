# Epoch

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 47**

## 1. Definition

One complete pass through the entire training dataset. With mini-batches, an epoch contains `n_examples / batch_size` parameter updates.

## 2. Simple Explanation

An epoch is "the model has now seen every training example once."

It's a bookkeeping unit, not an optimization concept — what actually drives learning is the number of **steps** (parameter updates). Two runs with the same epoch count but different batch sizes take very different numbers of steps and end up in very different places.

## 3. How It Works

```
10,000 examples, batch_size = 100

1 epoch  = 100 batches = 100 parameter updates
10 epochs = 1,000 updates total
```

1. Shuffle the data.
2. Split into batches.
3. Forward, loss, backward, update — for each batch.
4. That's one epoch. Evaluate on validation, then repeat.

**Epoch is a convenient checkpoint boundary** — it's when you typically compute validation metrics, save a checkpoint, and decide whether to stop.

**Steps vs. epochs, and why the distinction matters:**

| | 10,000 examples, 10 epochs | |
|---|---|---|
| batch_size = 32 | 3,130 steps | Much more learning |
| batch_size = 512 | 200 steps | Much less |

Same epoch count, 15× difference in updates. LLM training papers report **tokens seen** or **steps** rather than epochs precisely because epochs aren't comparable across configurations.

## 4. Practical Example

**How many epochs? Don't decide — let [early stopping](50-early-stopping.md) decide:**

```
epoch   train    val
  5     0.412   0.431
 12     0.288   0.310
 15     0.241   0.298   ← best validation
 20     0.190   0.315   val rising
 25     0.088   0.402   clearly overfitting

Set a generous max_epochs, monitor validation, stop on patience,
and restore the best checkpoint. The "right" number is an output,
not an input.
```

**Typical ranges, as rough context:**

| Scenario | Epochs |
|---|---|
| Fine-tuning a pretrained model | 2–5 (more usually overfits) |
| LLM / LoRA fine-tuning | 1–3 |
| Training a small model from scratch | 50–200 |
| LLM pretraining | Often **less than 1** — a single pass over a huge corpus |

That last row surprises people and is worth knowing: frontier models are typically trained on so much data that they see much of it only once.

## 5. Why It Matters

- **It's the unit for early stopping, checkpointing, and learning-rate schedules.**
- **The steps-vs-epochs distinction** is a small but real signal of understanding.
- **Fine-tuning needs far fewer epochs than people expect** — 2 to 5, not 50 — and overshooting causes catastrophic forgetting.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Too many epochs** | Overfitting. Fixed by early stopping with best-checkpoint restore |
| **Too few** | Underfitting — loss was still improving when you stopped |
| **Comparing epochs across batch sizes** | Meaningless; compare steps or tokens |
| **Not shuffling between epochs** | The model can learn the data ordering |
| **Reporting the final epoch's metrics** | Validation loss is noisy; the final epoch usually isn't the best |
| **Fine-tuning for many epochs** | Catastrophic forgetting of general capability |

## 7. Interview Answer

> "An epoch is one complete pass through the training dataset. With mini-batches it contains the number of examples divided by the batch size updates.
>
> The thing I'd be precise about is that an epoch is a bookkeeping unit, not an optimization one. What drives learning is the number of parameter updates. Ten thousand examples over ten epochs is about three thousand steps at batch size 32 and only two hundred at batch size 512 — same epoch count, fifteen times the learning. That's why LLM training reports tokens seen or steps rather than epochs.
>
> On how many to run: I wouldn't pick a number. I'd set a generous maximum, monitor validation loss each epoch, stop on patience, and restore the best checkpoint. The right count is an output of the process, not an input.
>
> Context matters a lot for the range. Fine-tuning a pretrained model is typically two to five epochs — more usually causes catastrophic forgetting, and I've seen people carry a from-scratch intuition of fifty epochs into a fine-tune and destroy the model. Training a small model from scratch might be a hundred. And LLM pretraining is often less than one epoch — the corpus is large enough that most of it is seen exactly once.
>
> The one reporting mistake I'd avoid is quoting the final epoch's metrics. Validation loss is noisy, and the last epoch is usually not the best one."

## 8. Likely Follow-ups

**Q: How many epochs should you train for?**
I wouldn't fix it. Set a generous maximum, monitor validation loss, stop when it hasn't improved for a set patience, and restore the best weights. That converts the question from a guess into a measurement. As rough context: 2–5 for fine-tuning, tens to hundreds from scratch, often under 1 for LLM pretraining.

**Q: Epochs or steps — which should you report?**
Steps, or tokens seen for language models, because those are comparable across configurations while epochs aren't. Two runs with the same epoch count and different batch sizes have completely different amounts of learning. Epochs are fine as a human-readable checkpoint unit; steps are what you compare.

**Q: Why does LLM pretraining use less than one epoch?**
Because the corpora are large enough — trillions of tokens — that a single pass is already an enormous amount of training, and repeating data risks memorization without adding much signal. The scaling-laws work suggested compute is better spent on more unique data than on repeated passes, though there's more recent work on the value of limited repetition when data is constrained.

**Q: Why do fine-tunes need so few epochs?**
Because the model already has good representations and you're adapting them, not building them. Extended fine-tuning on a narrow dataset overwrites the general capability that made the model valuable — catastrophic forgetting. Two to five epochs at a low learning rate is the usual recipe, and if it isn't learning in that budget the problem is usually the data or the learning rate rather than the epoch count.

**Q: Does shuffling between epochs matter?**
Yes. Without it the model sees the same sequence every epoch and can learn patterns from the ordering itself. If the data is sorted by class or by date, gradients pull consistently in one direction for a stretch, which biases the trajectory. Every framework shuffles by default for this reason.

## 9. Common Mistakes

- Comparing epoch counts across different batch sizes.
- Fixing the epoch count instead of using early stopping.
- Reporting the final epoch rather than the best checkpoint.
- Applying from-scratch epoch intuitions to fine-tuning.
- Not shuffling between epochs.

## 10. What to Remember

- **One full pass over the training data.** `n/batch_size` updates.
- **Steps matter, not epochs.** Same epochs at different batch sizes = very different training.
- **Don't choose the number — let early stopping choose it** and restore the best checkpoint.
- **Fine-tuning: 2–5 epochs.** From scratch: tens to hundreds. LLM pretraining: often <1.
- **Shuffle between epochs.**
