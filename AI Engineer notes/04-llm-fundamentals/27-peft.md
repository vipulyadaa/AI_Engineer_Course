# PEFT (Parameter-Efficient Fine-Tuning)

> **Phase 04 · LLM FUNDAMENTALS · Topic 27**

## 1. Definition

The family of methods that adapt a pretrained model by training a small fraction of parameters while keeping the base frozen. LoRA is the dominant member; the category also includes adapters, prefix tuning, prompt tuning, and IA³.

## 2. Simple Explanation

Full fine-tuning updates every parameter, which means holding gradients and optimizer state for all of them — roughly four times the model size in memory.

PEFT methods ask: what's the smallest set of trainable parameters that achieves most of the benefit? The answer turned out to be well under 1%, which made fine-tuning accessible on ordinary hardware.

## 3. How It Works

**The main methods:**

| Method | Mechanism | Trainable | Notes |
|---|---|---|---|
| **LoRA** | Low-rank update `B·A` added to weights | <1% | **The default.** Mergeable, swappable |
| **QLoRA** | LoRA over a 4-bit quantized base | <1% | Lowest memory; single consumer GPU |
| **Adapters** | Small bottleneck layers inserted in blocks | ~1–3% | Adds inference latency (not mergeable) |
| **Prefix tuning** | Learned vectors prepended to each layer's K,V | <0.1% | Consumes context; harder to tune |
| **Prompt tuning** | Learned soft-prompt embeddings at the input | <0.01% | Simplest; works best at large scale |
| **IA³** | Learned scaling vectors on activations | <0.01% | Very small; less commonly used |

**Why LoRA won:**

```
· Mergeable  → zero inference overhead after merging
· Swappable  → one base model, many adapters, hot-swapped
· Effective  → near-full-fine-tuning quality at <1% of parameters
· Simple     → easy to implement and reason about

Adapters add permanent inference latency because the
bottleneck layers can't be folded into existing weights.
Prefix and prompt tuning consume context and are fiddlier.
```

## 4. Practical Example

**The memory story, which is the whole point:**

```
7B model:
  full fine-tune (Adam)   ~56 GB   weights + grads + 2 moments
  LoRA                    ~15 GB   frozen base, tiny adapter
  QLoRA                   ~5-6 GB  4-bit base + LoRA

That's the difference between a multi-GPU cluster and a
single consumer card.
```

**When PEFT is enough vs. when it isn't:**

| Goal | PEFT sufficient? |
|---|---|
| Output format and structure | ✅ Yes |
| Domain tone and register | ✅ Yes |
| A specialized task with moderate data | ✅ Yes |
| Teaching genuinely new capability | ⚠️ Often not — that's a pretraining-scale problem |
| Injecting knowledge | ❌ Wrong tool entirely — use RAG |

**The multi-tenant pattern PEFT enables:**

```
One base model in GPU memory
  + adapter A (banking tone)
  + adapter B (legal summarization)
  + adapter C (code review)

Hot-swap per request. Adapters are tens of MB.

Full fine-tuning would require three complete model copies
and three times the GPU memory.
```

## 5. Why It Matters

- **It democratized fine-tuning** — the memory reduction is the substantive point.
- **Knowing why LoRA won among PEFT methods** (mergeable, swappable) shows real familiarity.
- **The multi-adapter serving pattern** is a genuinely useful architecture.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Slight quality gap** | Usually small; larger when substantial capability change is needed |
| **Still needs good data** | PEFT doesn't reduce the data-quality requirement |
| **Base model lock-in** | Adapters are tied to a base model *version* |
| **Adapter interference** | Composing multiple adapters can behave unpredictably |
| **Adapters add latency** | Unless mergeable — LoRA is, bottleneck adapters aren't |
| **Won't fix a knowledge problem** | That's RAG, regardless of method |

**On the quality gap:** for behavioral adaptation — format, tone, task structure — LoRA typically matches full fine-tuning closely enough that the difference doesn't justify the cost. The gap widens when the adaptation requires substantially changing what the model can do, which is usually a sign the task needs a different base model or genuinely more training.

**On lock-in:** this is the argument for exhausting prompting and RAG first. A prompt and a retrieval index are portable across model changes; an adapter is tied to its base model version, so when a better base ships you redo the work.

## 7. Interview Answer

> "PEFT is the family of methods that adapt a pretrained model by training a small fraction of parameters while keeping the base frozen. LoRA is the dominant member, but the category also includes bottleneck adapters, prefix tuning, prompt tuning, and IA³.
>
> The motivation is memory. Full fine-tuning a 7B model with Adam needs about fifty-six gigabytes — weights, gradients, and two optimizer moments per parameter. LoRA needs about fifteen, because the frozen base has no gradients or optimizer state. QLoRA, which puts LoRA over a 4-bit quantized base, gets to five or six, which fits a single consumer GPU. That's the difference between a multi-GPU cluster and a workstation, and it's what made fine-tuning accessible.
>
> LoRA won among the PEFT methods for two practical reasons. It's mergeable — since the update is just a matrix addition, you can fold it into the base weights and serve with zero inference overhead. And it's swappable — adapters are tens of megabytes, so one base model in memory plus several task-specific adapters serves many specialized behaviors, hot-swapped per request. Bottleneck adapters add permanent inference latency because they can't be folded in; prefix and prompt tuning consume context and are fiddlier to tune.
>
> That multi-adapter pattern is genuinely useful architecturally — one base model plus a banking-tone adapter, a legal-summarization adapter, and a code-review adapter, versus three complete model copies.
>
> The thing I'd be clear about is what PEFT doesn't change. It doesn't reduce the data-quality requirement, and it doesn't make fine-tuning the right tool for a knowledge problem — that's still RAG. And adapters are locked to a base model version, so when a better base ships you redo the work. That's a real argument for exhausting prompting and RAG first, since those investments are model-portable."

## 8. Likely Follow-ups

**Q: Why did LoRA become the default PEFT method?**
Mergeable and swappable. Since the update is a matrix addition, it can be folded into the base weights for zero inference overhead. And adapters are small enough to hot-swap, so one base model serves many specializations. Bottleneck adapters add permanent latency; prefix and prompt tuning consume context and are harder to tune.

**Q: What's the memory difference?**
For a 7B model: roughly 56 GB for full fine-tuning with Adam, about 15 GB with LoRA, and 5 to 6 GB with QLoRA over a 4-bit base. The saving comes from the frozen base having no gradients or optimizer state — those are three of the four tensors per parameter in full fine-tuning.

**Q: Is there a quality gap versus full fine-tuning?**
Usually small for behavioral adaptation — format, tone, task structure — small enough that the cost difference makes PEFT clearly right. The gap widens when the adaptation requires substantially changing what the model can do, which usually signals the task needs a different base model rather than more aggressive fine-tuning.

**Q: What is prompt tuning?**
Learning soft-prompt embeddings prepended to the input — continuous vectors rather than discrete tokens, optimized directly. It trains the fewest parameters of any PEFT method, under 0.01%, and works best at very large model scale. It's less used than LoRA because it consumes context length and is generally less effective at smaller scales.

**Q: Can you serve multiple adapters from one base model?**
Yes, and it's a genuinely useful pattern. Adapters are tens of megabytes, so one base model in GPU memory plus several task-specific adapters serves many behaviors, hot-swapped per request. Full fine-tuning would require a complete model copy per behavior. Frameworks like vLLM support multi-LoRA serving directly.

## 9. Common Mistakes

- Treating PEFT as a fix for a knowledge problem — that's RAG.
- Not knowing why LoRA specifically dominated the category.
- Assuming PEFT reduces the data-quality requirement.
- Forgetting adapters are tied to a base model version.
- Not knowing about multi-adapter serving.

## 10. What to Remember

- **Train <1% of parameters, freeze the base.** LoRA is the default.
- **7B: ~56 GB full → ~15 GB LoRA → ~5 GB QLoRA.** That's what democratized fine-tuning.
- **LoRA won because it's mergeable and swappable**, unlike bottleneck adapters.
- **One base + N adapters, hot-swapped** — a real serving architecture.
- **PEFT doesn't fix knowledge problems**, and adapters lock you to a base version.
