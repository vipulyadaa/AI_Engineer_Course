# Sigmoid

> **Phase 02 · DEEP LEARNING · Topic 08**

## 1. Definition

`σ(z) = 1 / (1 + e⁻ᶻ)`. Squashes any real number into the range (0, 1). Used on binary classification output layers, and inside LSTM gates — not in hidden layers of deep networks.

## 2. Simple Explanation

Sigmoid turns any number into something between 0 and 1, with an S-shaped curve. Large positive inputs approach 1, large negative approach 0, and zero maps to 0.5.

That range makes it natural for "probability that this is class 1" — which is the only place it really belongs now.

## 3. How It Works

```
   σ(z)
    1 ┤        ╭────────
      │      ╱
  0.5 ┤────╱
      │  ╱
    0 ┤──────────────────
      └──────┬─────────── z
             0

σ'(z) = σ(z)(1 − σ(z))

Maximum gradient is 0.25 at z = 0.
It approaches 0 for |z| > ~5 — the saturation region.
```

**The vanishing gradient arithmetic:**

```
Backprop multiplies gradients through layers.

  0.25^5  ≈ 0.001
  0.25^10 ≈ 0.00000095

Early layers receive effectively nothing. This is why deep
networks with sigmoid hidden layers didn't train, and why
ReLU replaced it.
```

## 4. Practical Example

**Where sigmoid is still correct:**

```
1. BINARY CLASSIFICATION OUTPUT
   one output unit + sigmoid → P(class = 1)
   paired with binary cross-entropy loss

2. MULTI-LABEL CLASSIFICATION
   sigmoid PER LABEL — each independently 0 or 1
   (softmax would force them to compete, which is wrong
    when a document can be both "policy" and "fees")

3. GATES
   LSTM and GRU gates use sigmoid because a value in (0,1)
   is exactly "how much to let through"
```

**Sigmoid vs softmax — a genuinely common confusion:**

```
SIGMOID per output:  labels are INDEPENDENT
                     outputs need not sum to 1
                     "is it a policy? is it about fees?"

SOFTMAX over outputs: labels are MUTUALLY EXCLUSIVE
                     outputs sum to 1
                     "which ONE category is this?"

Using softmax for multi-label forces labels to compete for
probability mass, which suppresses genuine co-occurrence.
That's a real modelling bug, not a stylistic choice.
```

**On sigmoid output as a probability:** it's a number in (0,1), but it isn't automatically well-calibrated — a 0.8 doesn't reliably mean 80% of such cases are positive. If the probability is used for a decision threshold in something like credit or fraud, calibration should be checked and corrected (Platt scaling, isotonic regression) rather than assumed.

## 5. Why It Matters

- **It's the right output for binary and multi-label** classification.
- **Its saturation is the textbook cause of vanishing gradients**, which motivates ReLU.
- **The sigmoid/softmax distinction** is a modelling decision people get wrong.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Saturation** | Gradient ≈ 0 outside roughly [−5, 5] |
| **Max gradient 0.25** | Vanishing gradients when stacked |
| **Not zero-centred** | Outputs all positive; slows convergence |
| **Expensive** | Requires an exponential, unlike ReLU |
| **Not calibrated by default** | Output isn't a trustworthy probability |

**On numerical stability:** computing `1/(1+exp(-z))` directly overflows for large negative `z`. Frameworks provide a fused `BCEWithLogitsLoss` that takes raw logits and applies the sigmoid internally in a numerically stable way. Applying sigmoid manually and then binary cross-entropy is the less stable path and a common source of NaNs.

## 7. Interview Answer

> "Sigmoid is one over one plus e to the minus z. It squashes any real number into zero to one with an S-shaped curve, so it's natural for a binary probability.
>
> Its defining problem is saturation. The derivative is sigma times one minus sigma, which peaks at 0.25 at z equals zero and approaches zero outside roughly minus five to five. Since backpropagation multiplies gradients through layers, 0.25 to the tenth is about one in a million — early layers receive effectively nothing. That's why deep networks with sigmoid hidden layers didn't train, and it's the direct motivation for ReLU.
>
> So it doesn't belong in hidden layers. Where it's still correct is binary classification outputs, multi-label classification with a sigmoid per label, and LSTM and GRU gates — where a value between zero and one is literally 'how much to let through'.
>
> The distinction I'd make carefully is sigmoid versus softmax, because it's a real modelling decision. Sigmoid per output treats labels as independent and they needn't sum to one — a document can be both a policy and about fees. Softmax treats labels as mutually exclusive and forces them to sum to one. Using softmax for a multi-label problem makes labels compete for probability mass and suppresses genuine co-occurrence, which is a modelling bug rather than a style preference.
>
> Two practical points. Sigmoid output is a number in zero to one but it isn't automatically calibrated — a 0.8 doesn't reliably mean eighty percent of such cases are positive. If it's driving a decision threshold in something like fraud or credit, I'd check calibration and correct it with Platt scaling or isotonic regression rather than assume it.
>
> And numerically, applying sigmoid manually then binary cross-entropy overflows for large negative inputs. Frameworks provide a fused BCEWithLogitsLoss that takes raw logits and handles it stably — using that instead is a common source of avoided NaNs."

## 8. Likely Follow-ups

**Q: Why not use sigmoid in hidden layers?**
Because it saturates. Its gradient peaks at 0.25 and approaches zero outside roughly plus or minus five, and backpropagation multiplies gradients through layers — so ten layers gives about one in a million and early layers stop learning. ReLU's constant gradient fixed exactly this.

**Q: Sigmoid or softmax?**
Sigmoid when labels are independent, so a sample can have several or none, and outputs needn't sum to one. Softmax when exactly one class applies, so outputs compete and sum to one. Using softmax on a multi-label problem suppresses genuine co-occurrence, which is a real modelling error.

**Q: Where is sigmoid still used?**
Binary classification output layers with binary cross-entropy, multi-label classification with one sigmoid per label, and LSTM and GRU gates — where a value between zero and one directly expresses how much information to let through.

**Q: Is the output a probability?**
It's in the right range but isn't necessarily calibrated — a 0.8 doesn't reliably mean eighty percent of such cases are positive. For threshold-driven decisions in regulated contexts I'd measure calibration and correct with Platt scaling or isotonic regression rather than trusting it directly.

**Q: What's the numerical stability issue?**
Computing the sigmoid directly overflows for large negative inputs, and applying it manually before binary cross-entropy compounds the problem. Frameworks provide a fused loss taking raw logits — BCEWithLogitsLoss in PyTorch — which does it in a numerically stable way.

## 9. Common Mistakes

- Using sigmoid in hidden layers of a deep network.
- Using softmax where labels are independent.
- Treating sigmoid output as a calibrated probability.
- Applying sigmoid manually before cross-entropy instead of using the fused loss.
- Not knowing the 0.25 maximum gradient and its consequence.

## 10. What to Remember

- **`1/(1+e⁻ᶻ)`** → (0, 1); max gradient 0.25 at z = 0.
- **Saturation causes vanishing gradients** — the reason ReLU replaced it.
- **Binary and multi-label outputs, and LSTM/GRU gates** — that's its remaining place.
- **Sigmoid = independent labels; softmax = mutually exclusive.**
- **Not calibrated by default**; use the fused logits loss for stability.
