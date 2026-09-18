# Loss Functions

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 41**

## 1. Definition

A function that scores how wrong a prediction is, producing a single differentiable number the optimizer minimizes. The choice of loss defines what "wrong" means — which makes it a product decision expressed as math.

## 2. Simple Explanation

The loss is what the model is actually trying to get good at. Everything else follows from it.

The key insight: **MSE says one 10-unit error is as bad as a hundred 1-unit errors** (100 vs. 100). **MAE says the big one is only ten times worse.** Those encode genuinely different beliefs about your problem, and picking one without thinking means you picked a belief by accident.

## 3. How It Works

1. **Per-example loss** `L(ŷ, y)` scores a single prediction.
2. **Averaged over the dataset** it becomes the objective `J(θ)`.
3. **Must be differentiable** so gradients exist — which is why accuracy can't be a loss.
4. **The optimizer minimizes it**, so whatever it rewards is what you get.

**The standard losses:**

| Task | Loss | Formula |
|---|---|---|
| Regression | **MSE** | `(ŷ - y)²` |
| Regression, robust | **MAE** | `\|ŷ - y\|` |
| Regression, compromise | **Huber** | Quadratic within δ, linear beyond |
| Binary classification | **Binary cross-entropy** | `-[y·log ŷ + (1-y)·log(1-ŷ)]` |
| Multi-class | **Categorical cross-entropy** | `-Σ yᵢ·log ŷᵢ` |
| **Language modeling** | **Cross-entropy over the vocabulary** | The LLM training objective |
| Ranking / embeddings | **Contrastive / triplet / InfoNCE** | Pull positives together, push negatives apart |

## 4. Practical Example

**Why cross-entropy and not accuracy:**

```
Accuracy is a step function — flat everywhere, undefined slope at the boundary.
No gradient → nothing to optimize.

Cross-entropy is smooth and punishes confidence proportionally:

  true label = 1
  ŷ = 0.9  →  -log(0.9) = 0.105    barely penalized
  ŷ = 0.5  →  -log(0.5) = 0.693
  ŷ = 0.1  →  -log(0.1) = 2.303    heavily penalized
  ŷ = 0.01 →  -log(0.01) = 4.605   confidently wrong is very expensive
```

That steep tail is why cross-entropy produces well-behaved probability estimates: being confidently wrong is punished far more than being uncertain.

**The losses that matter in your stack:**
- **LLM pretraining:** cross-entropy over the vocabulary at each position. Perplexity is just `exp(cross-entropy)` — same quantity, different scale.
- **Embedding models:** contrastive losses like InfoNCE on (query, positive, negatives). This is *why* cosine similarity in your vector store is meaningful — the model was trained to make that geometry correspond to relevance.

## 5. Why It Matters

- **The loss defines the objective.** Everything about model behavior traces back to it.
- **It's rarely the business metric.** You optimize cross-entropy because it's differentiable; the business cares about revenue or complaint volume. Keeping that proxy honest is the engineering job.
- **Class weighting lives here** — the cleanest way to encode asymmetric error costs.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Loss ≠ business metric** | Improving loss can stop correlating with the outcome. Validate both |
| **MSE on skewed targets** | A few outliers dominate the gradient | 
| **`log(0)` → NaN** | Always add an epsilon or use a numerically-stable implementation (`from_logits=True`) |
| **Wrong loss for the output layer** | Softmax with binary cross-entropy, or MSE on a classification task |
| **Class imbalance** | Majority class dominates the summed loss | Class weights or focal loss |
| **Reward hacking (the general form)** | Optimize a proxy hard enough and you get the proxy, not the goal |

**Focal loss** is worth knowing: it down-weights easy examples so training focuses on hard ones. Designed for extreme imbalance in object detection, and useful anywhere the majority class swamps the gradient.

## 7. Interview Answer

> "A loss function scores how wrong a prediction is and produces a differentiable number the optimizer minimizes. The important framing is that the loss defines what 'wrong' means, so it's a product decision expressed as math.
>
> The clearest example is MSE versus MAE. MSE squares the error, so one ten-unit miss counts the same as a hundred one-unit misses. MAE treats it linearly, so the big miss is only ten times worse. Those are genuinely different beliefs about the problem, and picking one without thinking means you've chosen a belief by accident.
>
> For classification it's cross-entropy, and the reason it isn't accuracy is that accuracy is a step function with no useful gradient. Cross-entropy is smooth and it punishes confident wrong answers steeply — predicting 0.01 when the truth is 1 costs about forty times what predicting 0.9 costs. That steepness is why it produces sensible probability estimates.
>
> The thing I'd flag as an engineer is that the loss is almost never the business metric. I optimize cross-entropy because it's differentiable; the business cares about revenue or complaint volume, which aren't. Keeping that proxy honest is the job — class weights when one error type costs more, threshold tuning against real costs, and checking that loss improvements still move the real metric. When they stop correlating, I have the wrong proxy.
>
> In my own stack, the two losses that matter are cross-entropy over the vocabulary for LLM pretraining, and contrastive losses like InfoNCE for embedding models — which is exactly why cosine similarity in a vector store means anything."

## 8. Likely Follow-ups

**Q: Why cross-entropy instead of MSE for classification?**
Two reasons. MSE on a sigmoid output produces very small gradients when the model is confidently wrong — the sigmoid saturates and learning stalls exactly when it most needs to correct. Cross-entropy's gradient is proportional to the error, so confidently wrong predictions produce large corrections. And cross-entropy is the maximum-likelihood objective for a Bernoulli or categorical output, so its outputs are meaningful probabilities.

**Q: MSE or MAE?**
MSE when large errors are genuinely disproportionately costly and the data is clean, and it's smooth which optimizers prefer. MAE when there are outliers you don't want steering the model, or when the business cost of error is roughly linear. Huber is the practical default when unsure — quadratic near zero for smooth gradients, linear in the tail for robustness.

**Q: How do you encode asymmetric error costs in the loss?**
Class weights are the cleanest way — weight the minority or high-cost class higher so its errors contribute more to the total. For regression, quantile or pinball loss lets you penalize over- and under-prediction differently. And separately from the loss, threshold tuning against actual costs is often more effective and doesn't require retraining.

**Q: What is perplexity?**
`exp(cross-entropy)` for a language model — the same quantity on a more interpretable scale. It's roughly "how many equally likely options is the model effectively choosing between at each token." A perplexity of 10 means the model is about as uncertain as if it were picking uniformly among 10 tokens. Lower is better, and it's comparable only within the same tokenizer and evaluation data.

**Q: What loss trains an embedding model?**
Contrastive objectives — triplet loss or InfoNCE — on tuples of a query, a relevant passage, and irrelevant ones. The objective pulls the query and positive together in vector space and pushes negatives away. Hard negative mining matters a lot here: training against negatives that are superficially similar but actually irrelevant is what produces embeddings that discriminate well in real retrieval.

## 9. Common Mistakes

- Trying to optimize accuracy directly — it isn't differentiable.
- Using MSE on a skewed target without transforming it.
- Not adding an epsilon inside logarithms, producing NaN.
- Mismatching the loss to the output activation.
- Assuming a lower loss always means a better business outcome.

## 10. What to Remember

- **The loss defines what "wrong" means** — a product decision in math form.
- **MSE punishes large errors quadratically; MAE linearly.** Huber is the compromise.
- **Cross-entropy for classification** because it's differentiable and punishes confident wrongness steeply.
- **Loss ≠ business metric.** Validate that improvements in one still move the other.
- **LLM training = cross-entropy over the vocabulary. Embeddings = contrastive.**
