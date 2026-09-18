# Early Stopping

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 50**

## 1. Definition

Monitoring validation performance during training and halting when it stops improving, then restoring the best checkpoint. It's the cheapest and most universally applicable form of regularization.

## 2. Simple Explanation

Stop while you're ahead.

Training loss keeps falling as long as you keep training — the model can always memorize more. Validation loss falls, bottoms out, then rises as the model starts fitting noise. Early stopping detects that turn and stops there.

The critical detail people miss: **restore the best checkpoint, don't keep the last one.** Validation loss is noisy, so the epoch where you stopped is rarely the best epoch.

## 3. How It Works

```
epoch   train    val      action
  5     0.412   0.431
 12     0.288   0.310
 15     0.241   0.298     ← best. Save checkpoint.
 17     0.220   0.301     patience 1
 19     0.201   0.308     patience 2
 20     0.190   0.315     patience 3 → STOP, restore epoch 15
```

1. Evaluate on validation each epoch (or every N steps).
2. If it improved beyond `min_delta`, save the checkpoint and reset the patience counter.
3. If not, increment patience.
4. When patience hits the limit, stop and **restore the best weights**.

**The parameters:**

| Parameter | Meaning | Typical |
|---|---|---|
| `monitor` | Which metric to watch | `val_loss`, or the business metric |
| `patience` | Epochs without improvement before stopping | 3–10 |
| `min_delta` | Minimum change counted as improvement | Small, avoids stopping on noise |
| `restore_best_weights` | **Roll back to the best checkpoint** | **Always `True`** |

## 4. Practical Example

```python
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    min_delta=1e-4,
    restore_best_weights=True,   # ← the line people forget
    verbose=1,
)

model.fit(X_tr, y_tr,
          validation_data=(X_val, y_val),
          epochs=200,              # generous max — early stopping decides
          callbacks=[early_stop])
```

**Set `epochs` generously.** The point of early stopping is that you no longer have to guess the right number — it becomes an output of the process. Setting `epochs=10` with early stopping defeats the purpose.

**Monitor the metric you actually care about.** Validation loss is the default, but if the decision is driven by PR-AUC on an imbalanced problem, monitor that. Loss and the business metric can diverge, particularly with class weighting.

## 5. Why It Matters

- **It's free regularization** — no extra hyperparameter beyond patience, no change to the model.
- **It's the first thing to try for [overfitting](19-overfitting.md)**, before weight decay or dropout.
- **It saves compute** — no reason to run 200 epochs when the model peaked at 15.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **`restore_best_weights=False`** | You keep an overfit model. The single most common mistake here |
| **Patience too low** | Stops on a noisy plateau before the model would have improved |
| **Patience too high** | Wastes compute; mostly harmless if you restore the best checkpoint |
| **Validation set too small** | Noisy signal, so the stopping point is arbitrary |
| **Monitoring the wrong metric** | Loss improves while the metric you care about degrades |
| **Validation set becomes a selection set** | You're choosing the stopping epoch with it, so its score is optimistic |

**That last one matters conceptually:** early stopping uses validation to make a decision, which is exactly why a separate test set exists. The reported validation score at the stopping epoch is mildly optimistic.

**Interaction with a learning-rate schedule:** validation loss often rises briefly, then improves again after a scheduled LR drop. A short patience can stop you right before that recovery, so patience should span at least one schedule change.

## 7. Interview Answer

> "Early stopping monitors validation performance during training and halts when it stops improving, then restores the best checkpoint. It's the cheapest regularization available — no extra hyperparameters beyond patience, no model changes.
>
> The mechanism is straightforward: training loss keeps falling as long as you train, because the model can always memorize more. Validation loss falls, bottoms out, then rises as it starts fitting noise. Early stopping catches that turn.
>
> The detail I'd emphasize is restoring the best weights rather than keeping the last ones. Validation loss is noisy, so the epoch where you stopped — after patience epochs of no improvement — is by definition not the best epoch. If you keep the final weights you've kept a model that's already started overfitting. It's a one-line setting and it's the most common mistake here.
>
> I'd also set the maximum epochs generously, because the whole point is that the right number becomes an output rather than a guess. And I'd monitor the metric I actually care about — if the decision runs on PR-AUC for an imbalanced problem, validation loss and that metric can diverge.
>
> One interaction worth knowing: with a learning-rate schedule, validation loss often rises briefly then improves again after a scheduled drop. Patience needs to span at least one schedule change, or you stop right before the recovery."

## 8. Likely Follow-ups

**Q: How do you choose patience?**
Long enough to survive normal validation noise and at least one learning-rate change, short enough not to waste much compute. 5 to 10 epochs is a common range. Since you restore the best checkpoint anyway, being too patient costs only time, while being too impatient costs quality — so I'd err high.

**Q: Why restore the best weights instead of the last?**
Because you stop *after* patience epochs of no improvement, so the final weights are from a point where the model had already been degrading. Validation loss is also noisy, so the minimum is often several epochs back. Keeping the final weights means deliberately shipping an overfit model when the better one is already saved.

**Q: Is early stopping really regularization?**
Yes, implicitly. It limits how far the optimizer travels from its initialization, which constrains the effective function space in a way similar to an explicit complexity penalty. For linear models there's a formal correspondence between early stopping and L2 regularization. Practically it's the one I'd reach for first because it costs nothing.

**Q: Can you early stop on a metric other than loss?**
Yes, and often you should. If the production decision runs on PR-AUC or recall at a fixed precision, monitor that — loss and the business metric can diverge, particularly with class weighting. The only requirement is that the metric is computed on validation and is stable enough not to trigger on noise.

**Q: What if validation loss is very noisy?**
Increase patience, increase `min_delta` so small fluctuations don't count as improvement, or use a larger validation set. You can also smooth the monitored metric over a few epochs. If it's still erratic, the validation set is probably too small for a reliable signal, and cross-validation would give a more stable basis for the decision.

## 9. Common Mistakes

- Leaving `restore_best_weights=False` and shipping the overfit final model.
- Setting a small `epochs` maximum, which defeats the purpose.
- Patience too short to survive a learning-rate schedule drop.
- Monitoring loss when the decision runs on a different metric.
- Reporting the validation score at the stopping epoch as if it were unbiased.

## 10. What to Remember

- **Stop when validation stops improving; restore the best checkpoint.**
- **`restore_best_weights=True` is the line that matters** — the last epoch is not the best epoch.
- **Set max epochs generously** so the right count is an output, not a guess.
- **Free regularization** — try it before weight decay or dropout.
- **Patience must span at least one LR schedule drop**, or you stop before the recovery.
