# Learning Rate Scheduling

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 49**

## 1. Definition

Changing the learning rate over the course of training rather than holding it constant — typically warming up at the start and decaying toward the end. It reliably improves final performance over a fixed rate.

## 2. Simple Explanation

Take big steps while you're far from the target, small steps when you're close.

A rate that's right early is too large late: near a minimum, large steps bounce you around it instead of settling in. A rate small enough to settle would have been painfully slow at the beginning. Scheduling lets you have both.

## 3. How It Works

```
LR │    ╱‾‾‾╲___
   │   ╱         ‾‾‾╲___
   │  ╱                  ‾‾‾╲___
   │ ╱                           ‾‾╲__
   └──────────────────────────────────── steps
    warmup          cosine decay
```

**The common schedules:**

| Schedule | Shape | Use |
|---|---|---|
| **Warmup** | Ramp up from ~0 over the first few hundred–thousand steps | **Required for transformers** |
| **Cosine decay** | Smooth decay following a cosine curve | The standard for LLM training |
| **Linear decay** | Straight line down to zero | Simple, common for fine-tuning |
| **Step decay** | Multiply by 0.1 at fixed milestones | Classic in vision |
| **ReduceLROnPlateau** | Drop when validation stops improving | Adaptive; no schedule to design |
| **Cosine with warm restarts** | Decay, jump back up, repeat | Helps escape local minima |

**Warmup + cosine decay is the default recipe** for anything transformer-based.

## 4. Practical Example

**Why warmup is non-negotiable for transformers:**

At step 0, Adam's first- and second-moment estimates are computed from essentially no gradient history, so they're unreliable. A full-size step based on those estimates can be wildly misdirected and destabilize training in a way it never recovers from. Warmup ramps the rate up while those estimates stabilize.

```python
from transformers import get_cosine_schedule_with_warmup

total_steps  = len(loader) * num_epochs
warmup_steps = int(0.06 * total_steps)     # 3–10% is typical

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=warmup_steps,
    num_training_steps=total_steps,
)

for batch in loader:
    loss.backward()
    optimizer.step()
    scheduler.step()      # per STEP, not per epoch, for warmup+cosine
    optimizer.zero_grad()
```

**The most common bug:** calling `scheduler.step()` once per epoch when the schedule was defined in steps. The rate then decays hundreds of times slower than intended and training looks mysteriously bad.

## 5. Why It Matters

- **It reliably improves final performance** over a constant rate — one of the few free wins in training.
- **Warmup is required for stable transformer training**, not optional.
- **It's part of every standard recipe**, so not knowing it reads as never having trained anything.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **`scheduler.step()` per epoch instead of per step** | Schedule stretched by the number of batches per epoch; decay effectively never happens |
| **No warmup on a transformer** | Unstable or diverging early training |
| **Total steps miscalculated** | Cosine decay reaches zero too early or never gets there |
| **Decaying to exactly zero too soon** | Learning stops before training ends |
| **Schedule assumed with Adam** | Adam adapts relative rates per parameter; it does not decay the global rate |
| **Resuming without restoring scheduler state** | The schedule restarts from the beginning |

**Adam does not replace a schedule.** Adam adapts the per-parameter scaling from gradient history; the global learning rate still needs to come down as you approach a minimum. This confusion is common enough to be worth stating explicitly.

## 7. Interview Answer

> "Learning rate scheduling means varying the rate during training instead of holding it constant. The standard recipe is warmup followed by cosine decay, and it reliably beats a fixed rate.
>
> The intuition is take big steps when you're far from the target and small steps when you're close. A rate that's right early is too large near a minimum — you bounce around it instead of settling. A rate small enough to settle would have been far too slow at the start.
>
> Warmup is the part I'd emphasize for transformers, because it's not optional there. At step zero, Adam's moment estimates are computed from almost no gradient history and are unreliable, so a full-size step can be badly misdirected and destabilize training permanently. Ramping up over the first few percent of steps lets those estimates stabilize first.
>
> The bug I'd watch for is calling `scheduler.step()` once per epoch when the schedule was defined in steps. The decay then stretches by the number of batches per epoch and effectively never happens — training looks mysteriously worse and the cause isn't obvious.
>
> And I'd correct one common assumption: Adam doesn't remove the need for a schedule. Adam adapts the relative step size per parameter from gradient history, but the global rate is still mine to set and still needs to come down."

## 8. Likely Follow-ups

**Q: Why warmup specifically?**
Because adaptive optimizers need gradient history to produce sensible per-parameter scaling, and at the start they have none. A full-size step based on unreliable moment estimates can be wildly wrong and push the model into a region it doesn't recover from. Warmup over the first 3–10% of steps lets the estimates stabilize before taking real steps.

**Q: Cosine or linear decay?**
Both work; cosine is the convention for LLM training and linear is common for shorter fine-tunes. Cosine spends more time at moderate rates and decays gently at the end, which tends to give slightly better final results. The difference is usually small compared to getting the peak rate and the warmup right.

**Q: What is ReduceLROnPlateau?**
An adaptive schedule that drops the rate — typically by a factor of 10 — when validation loss stops improving for a set patience. The advantage is you don't need to know the total step count in advance. The disadvantage is it reacts after the fact rather than following a planned trajectory, so it's less used in large-scale training where the step budget is known.

**Q: Does Adam make scheduling unnecessary?**
No, and this is a common misconception. Adam adapts the *relative* learning rate per parameter based on gradient magnitudes, but the global scale is a hyperparameter that still benefits from decaying as you approach a minimum. Every serious transformer training recipe uses AdamW *with* warmup and cosine decay.

**Q: What are warm restarts?**
Cosine decay followed by a jump back to a high rate, repeated. The theory is that the jump can kick the optimizer out of a poor local minimum or sharp region, and the subsequent decay lets it settle somewhere better. It's also convenient for getting several distinct checkpoints from one run, which you can ensemble.

## 9. Common Mistakes

- Stepping the scheduler per epoch when it's defined in steps.
- Omitting warmup for transformer training.
- Assuming Adam handles it.
- Miscalculating total steps so cosine decay hits zero early or late.
- Not restoring scheduler state when resuming from a checkpoint.

## 10. What to Remember

- **Warmup + cosine decay** is the default for anything transformer-based.
- **Warmup exists because early Adam moment estimates are unreliable** — it's required, not optional.
- **Step the scheduler per step, not per epoch**, when the schedule is defined in steps.
- **Adam does not replace a schedule** — it adapts relative rates, not the global one.
- **Warmup is typically 3–10% of total steps.**
