# LoRA (Low-Rank Adaptation)

> **Phase 04 · LLM FUNDAMENTALS · Topic 26**

## 1. Definition

A parameter-efficient fine-tuning method that freezes the base model and trains two small low-rank matrices whose product is added to selected weight matrices. It typically trains under 1% of parameters and reaches near-full-fine-tuning quality.

## 2. Simple Explanation

Don't modify the model — add a small learned adjustment to it.

For a weight matrix `W`, instead of updating all of it, learn two thin matrices `A` and `B` such that the update is `B·A`. If `W` is 4096×4096 that's 16.7 million parameters; with rank 16, `A` and `B` together are about 131,000 — under 1%.

## 3. How It Works

```
Original:  h = W·x
LoRA:      h = W·x + (B·A)·x · (α/r)
                └──────┘
                the learned update

W:  d × d      frozen
A:  r × d      trained, initialized random
B:  d × r      trained, initialized ZERO
r:  rank, typically 8-64
α:  scaling factor
```

**Why `B` is initialized to zero:** `B·A = 0` at the start, so the model begins exactly as the base model. Training then learns a departure from it, rather than starting from a random perturbation.

**Why low rank is sufficient — the actual insight:**

```
The paper's hypothesis is that the weight UPDATE needed to
adapt a pretrained model has low "intrinsic rank."

You're not learning a new capability from scratch — you're
steering existing capability. That kind of adjustment lives
in a much smaller subspace than the full parameter space.

Being able to say WHY low rank works, not just that LoRA
trains fewer parameters, is the differentiator.
```

## 4. Practical Example

**The memory arithmetic:**

```
7B model, full fine-tuning with Adam:
  weights          14 GB
  gradients        14 GB
  optimizer (2×)   28 GB
                  ──────
                  56 GB + activations

7B with LoRA (r=16):
  frozen weights   14 GB   (no gradients, no optimizer state)
  adapter          ~40 MB
  adapter optimizer ~80 MB
                  ──────
                  ~15 GB

QLoRA (4-bit base + LoRA):
  ~5-6 GB → fits a single consumer GPU
```

**That reduction is why fine-tuning became accessible.**

**Practical configuration:**

```
rank r        8-16 for style/format; 32-64 for harder adaptation
alpha α       usually 2r
target modules  attention projections is the common default;
                including FFN projections often helps more,
                since that's where most parameters are
dropout       0.05-0.1
learning rate 1e-4 (higher than full fine-tuning's 1e-5,
              because you're training far fewer parameters)
```

**The deployment advantage people underuse:**

```
Adapters are tiny (tens of MB) and SWAPPABLE.

One base model in memory + N task-specific adapters
  → serve many specialized behaviors from one deployment
  → hot-swap per request

Full fine-tuning would mean N complete model copies.
```

## 5. Why It Matters

- **It's what made fine-tuning accessible** — the memory reduction is the story.
- **Explaining *why* low rank suffices** distinguishes understanding from acronym recognition.
- **Adapter swapping** is a deployment pattern that's genuinely useful and often overlooked.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Slight quality gap vs. full fine-tuning** | Usually small; larger on tasks requiring substantial capability change |
| **Rank too low** | Underfits — insufficient capacity for the adaptation |
| **Rank too high** | Approaches full fine-tuning cost without the benefit |
| **Wrong target modules** | Attention-only is the default but FFN often matters more |
| **Base model lock-in** | An adapter is tied to its base model *version* |
| **Inference overhead** | Small, and removable by merging `B·A` into `W` |
| **Stacking adapters** | Composing multiple LoRAs can interfere unpredictably |

**On merging:** since the update is just `W + B·A`, you can merge the adapter into the base weights after training and serve a single model with zero inference overhead. The trade-off is losing the ability to swap — merged means committed.

**On base model lock-in:** an adapter trained on one base model version doesn't transfer to another. When a better base ships, you redo the fine-tune. That's a real argument for exhausting prompting and RAG first, since those investments are model-portable.

## 7. Interview Answer

> "LoRA freezes the base model and trains two small low-rank matrices whose product is added to selected weight matrices. For a 4096-by-4096 weight matrix — 16.7 million parameters — a rank-16 adapter is about 131,000, so under one percent.
>
> The insight worth explaining is *why* low rank is sufficient. The hypothesis is that the weight update needed to adapt a pretrained model has low intrinsic rank — you're not learning a new capability, you're steering existing capability, and that kind of adjustment lives in a much smaller subspace than the full parameter space. Saying that, rather than just 'it trains fewer parameters,' is the difference between understanding it and recognizing the acronym.
>
> The memory arithmetic is the practical story. Full fine-tuning a 7B model with Adam needs about fifty-six gigabytes — weights, gradients, and two optimizer moments. LoRA needs about fifteen, because the frozen base has no gradients or optimizer state and the adapter is forty megabytes. QLoRA with a 4-bit base gets to five or six, which fits a single consumer GPU. That reduction is what made fine-tuning accessible.
>
> One implementation detail: B is initialized to zero so the adapter contributes nothing at the start and the model begins exactly as the base model. Training learns a departure from it rather than starting from a random perturbation.
>
> On configuration, rank eight to sixteen is enough for style and format; thirty-two to sixty-four for harder adaptation. The common default targets attention projections, but including the feed-forward projections often helps more, since that's where most of the parameters and most of the learned knowledge sit.
>
> The deployment pattern people underuse is adapter swapping. Adapters are tens of megabytes, so one base model plus N adapters serves many specialized behaviors from one deployment, hot-swappable per request. Full fine-tuning would mean N complete model copies. And you can merge an adapter into the base weights afterward for zero inference overhead, at the cost of losing swappability."

## 8. Likely Follow-ups

**Q: Why does low rank work?**
Because the update needed to adapt a pretrained model has low intrinsic rank — you're steering existing capability rather than building new capability, and that adjustment lives in a small subspace. The full parameter space is far larger than the space of useful adaptations, so a low-rank approximation captures most of what matters.

**Q: Why is B initialized to zero?**
So `B·A = 0` at initialization and the adapter contributes nothing — the model starts exactly as the base model. Training then learns a departure from that known-good starting point, rather than beginning from a random perturbation that would degrade the model before it improves.

**Q: What rank should you use?**
8 to 16 for style and format adaptation, 32 to 64 for adaptations requiring more capacity. Too low underfits; too high approaches full fine-tuning cost without the benefit. I'd start at 16 and increase only if the training loss plateaus higher than expected.

**Q: Which modules should you target?**
Attention projections is the common default, but the feed-forward projections often matter more — that's where roughly two-thirds of the parameters and most of the learned knowledge sit. Targeting both usually outperforms attention-only for the same total adapter size, which is worth testing rather than accepting the default.

**Q: Can you merge the adapter into the base model?**
Yes — the update is just `W + B·A`, so you can fold it in and serve a single model with zero inference overhead. The trade-off is losing swappability: merged means committed to that behavior. I'd keep adapters separate when serving multiple specializations and merge when deploying a single dedicated model.

## 9. Common Mistakes

- Saying LoRA "trains fewer parameters" without explaining why low rank suffices.
- Not knowing B is initialized to zero, or why.
- Targeting attention modules only by default.
- Forgetting that adapters are locked to a base model version.
- Using a full-fine-tuning learning rate — LoRA typically wants a higher one.

## 10. What to Remember

- **Freeze the base; learn `B·A` as a low-rank update.** Under 1% of parameters.
- **Why it works:** adaptation updates have low intrinsic rank — steering, not building.
- **B initialized to zero** so training starts exactly at the base model.
- **7B: ~56 GB full fine-tune → ~15 GB LoRA → ~5 GB QLoRA.**
- **Adapters are swappable** — one base, many behaviors — or mergeable for zero overhead.
