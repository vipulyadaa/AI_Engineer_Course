# Softmax

> **Phase 02 · DEEP LEARNING · Topic 09**

## 1. Definition

`softmax(z)ᵢ = e^{zᵢ} / Σⱼ e^{zⱼ}`. Converts a vector of scores into a probability distribution — all values positive, summing to 1. Used for mutually exclusive multi-class outputs, and for every token an LLM produces.

## 2. Simple Explanation

You have scores for each option. Softmax turns them into probabilities: exponentiate each, then divide by the total.

The exponential is what makes it "soft max" — it amplifies differences, so the highest score gets a disproportionate share, but nothing is exactly zero.

## 3. How It Works

```
logits  z = [2.0, 1.0, 0.1]

exp:       [7.39, 2.72, 1.11]
sum:        11.22
softmax:   [0.659, 0.242, 0.099]   → sums to 1
```

**Numerical stability is mandatory:**

```python
def softmax(z):
    z = z - z.max()          # ← subtract the max first
    e = np.exp(z)
    return e / e.sum()
```

Without the subtraction, `exp(1000)` overflows to infinity. Subtracting the max is mathematically identical — the constant cancels in the ratio — and every real implementation does it.

## 4. Practical Example

**Softmax is where temperature acts in an LLM:**

```
softmax(z / T)

T = 0.1  → [0.999, 0.001, 0.000]   near-deterministic
T = 1.0  → [0.659, 0.242, 0.099]   the model's actual beliefs
T = 2.0  → [0.47,  0.29,  0.24]    flattened, more random

Temperature DIVIDES the logits before softmax. Low T sharpens
the distribution; high T flattens it.

This is the single most important practical fact about softmax
for an AI engineer — it's the mechanism behind every
temperature setting you'll ever configure.
```

**For a banking RAG system, temperature 0–0.2** is the right setting: the task is faithful reporting of retrieved content, not creative variation.

**Two other places softmax appears:**

```
1. ATTENTION — softmax(QKᵀ/√d_k) turns raw attention scores
   into weights summing to 1, so each position's output is a
   weighted average of values.

2. MULTI-CLASS OUTPUT — the final layer of a classifier,
   paired with cross-entropy loss.
```

**Softmax never outputs exactly zero,** because the exponential is always positive. Every token in a 250,000-token vocabulary has non-zero probability at every step — which is precisely why top-k and top-p sampling exist, to truncate that long tail of nonsense.

## 5. Why It Matters

- **Every LLM token comes from a softmax** over the vocabulary.
- **Temperature acts by dividing logits before softmax** — the mechanism behind a setting you use constantly.
- **It never assigns exactly zero**, which is why top-k/top-p truncation is needed.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Overflow without max subtraction** | `exp` of large logits → inf |
| **Assumes mutual exclusivity** | Wrong for multi-label problems |
| **Expensive over large vocabularies** | 250k exponentials per token |
| **Not calibrated** | High probability ≠ correctness |
| **Long tail never reaches zero** | Nonsense tokens remain sampleable |

**On calibration — the one that matters for LLMs:** a softmax probability of 0.95 on a token does not mean the statement is 95% likely to be true. It reflects the model's confidence in the next *token*, learned from training data, and modern LLMs are typically overconfident. Presenting a token probability as an answer-confidence score to a user is misleading, and in a banking context actively dangerous.

**On cost:** softmax over a 250,000-token vocabulary at every generated token is a non-trivial share of inference compute, which is part of why vocabulary size is a real architectural trade-off rather than a free parameter.

## 7. Interview Answer

> "Softmax converts a vector of scores into a probability distribution — exponentiate each score, divide by the sum. Everything is positive and sums to one. The exponential is what makes it 'soft max': it amplifies differences so the largest score dominates, but nothing goes to exactly zero.
>
> Implementations always subtract the maximum logit first, because exp of a large value overflows. That's mathematically identical since the constant cancels in the ratio, and it's a standard implementation detail.
>
> For an AI engineer the most important fact is that softmax is where temperature acts. Temperature divides the logits before softmax — low temperature sharpens the distribution toward near-deterministic, high temperature flattens it toward random. That's the mechanism behind every temperature setting you configure, and for a banking RAG system I'd run at zero to 0.2, because the task is faithful reporting of retrieved content rather than creative variation.
>
> It shows up in three places: the output layer of a multi-class classifier with cross-entropy loss, every token an LLM generates over its vocabulary, and inside attention — softmax of QK-transpose over root d-k turns raw attention scores into weights summing to one.
>
> A consequence worth knowing: softmax never assigns exactly zero, because the exponential is always positive. So every token in a two-hundred-fifty-thousand-token vocabulary has non-zero probability at every step, including complete nonsense. That's precisely why top-k and top-p sampling exist — to truncate that long tail before sampling.
>
> And the point I'd be careful about: a softmax probability of 0.95 on a token does not mean the statement is ninety-five percent likely to be true. It's confidence in the next token, learned from training data, and modern LLMs are typically overconfident. Presenting token probability to a user as answer confidence is misleading, and in banking it's actively dangerous."

## 8. Likely Follow-ups

**Q: Why subtract the maximum before exponentiating?**
Because exp of a large logit overflows to infinity. Subtracting the maximum is mathematically identical — the constant cancels in the numerator and denominator — but keeps every exponent at or below zero, so the computation stays in range. Every real implementation does it.

**Q: How does temperature work?**
It divides the logits before the softmax. Dividing by a small number spreads the logits apart, sharpening the distribution toward deterministic; dividing by a large one compresses them, flattening toward uniform. Temperature one leaves the model's raw distribution unchanged.

**Q: Where does softmax appear in a transformer?**
Twice. Inside attention, converting QK-transpose scaled by root d-k into weights that sum to one. And at the output layer, converting the final logits into a probability distribution over the vocabulary from which the next token is sampled.

**Q: Does softmax ever output zero?**
No — the exponential is always positive, so every option keeps some probability mass however small. That means every token in the vocabulary is technically sampleable at every step, which is exactly why top-k and top-p exist: to cut off the long tail before sampling.

**Q: Is the softmax probability a confidence score?**
Not a trustworthy one. It's confidence in the next token given the training distribution, not in the truth of a statement, and modern LLMs are typically overconfident. Surfacing it to users as answer confidence is misleading — grounding and citation are the honest signals instead.

## 9. Common Mistakes

- Omitting max subtraction and hitting overflow.
- Using softmax for multi-label problems where sigmoid is correct.
- Explaining temperature as a post-softmax operation.
- Presenting token probability as answer confidence.
- Forgetting that softmax appears inside attention, not just at the output.

## 10. What to Remember

- **Exponentiate and normalize** → a probability distribution summing to 1.
- **Subtract the max first** for numerical stability.
- **Temperature divides logits before softmax** — the mechanism behind the setting.
- **Appears in attention and at the output layer** of every transformer.
- **Never exactly zero**, which is why top-k/top-p truncation exists.
