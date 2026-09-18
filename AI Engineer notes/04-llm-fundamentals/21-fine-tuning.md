# Fine-Tuning

> **Phase 04 · LLM FUNDAMENTALS · Topic 21**

## 1. Definition

Continuing training on a pretrained model with task-specific data to change its behavior. It adapts **how the model behaves** — format, tone, task structure — and is the wrong tool for injecting **what the model knows**.

## 2. Simple Explanation

The distinction that governs every decision here:

> **Fine-tuning changes behavior. RAG changes knowledge.**

If the failure is "it doesn't know our 2026 fee schedule," that's retrieval. If the failure is "it knows the answer but won't produce our required JSON structure reliably," that's fine-tuning or better prompting.

Using fine-tuning to inject facts is the classic expensive mistake — the facts go stale in the weights, you can't cite them, and you can't permission them.

## 3. How It Works

**The types, by cost:**

| Type | Updates | Memory (7B) | Use |
|---|---|---|---|
| **Full fine-tuning** | All parameters | ~56 GB+ | Rarely justified |
| **LoRA / PEFT** | <1% (adapters) | ~16 GB | **The practical default** |
| **QLoRA** | <1%, 4-bit base | ~8 GB | Single consumer GPU |

**The decision ladder — climb only when the rung below fails:**

```
1. Better prompting          minutes, free
2. Few-shot examples         minutes, free
3. RAG                       days — for KNOWLEDGE
4. LoRA fine-tuning          days — for BEHAVIOR
5. Full fine-tuning          weeks — rarely
```

Most teams reach for step 4 or 5 when step 1 or 2 would have worked.

## 4. Practical Example

**What fine-tuning is genuinely good for:**

| Goal | Fine-tune? |
|---|---|
| Consistent proprietary output format | ✅ Yes |
| Domain tone and register | ✅ Yes |
| A specialized classification task at volume | ✅ Yes — and distill to a small model |
| Behavior prompting can't reliably produce | ✅ Yes |
| Teaching it your product catalogue | ❌ **No — RAG** |
| Keeping it current with policy changes | ❌ **No — RAG** |
| Reducing hallucination | ❌ **No — grounding** |

**Why fine-tuning facts is a bad idea, concretely:**

```
Fine-tune the 2026 fee schedule into the weights.

· The 2025 schedule is STILL in there, competing
· When fees change in 2027, you retrain
· You cannot cite the source
· You cannot permission it — every user gets every fact
· You cannot audit which fact the model used

RAG: re-index one document. Seconds. Citable. Permissionable.
```

**The pattern that is usually right at volume:**

```
Distillation via labels:
  1. A large model labels 10,000 examples
  2. Humans review the low-confidence subset
  3. Fine-tune a SMALL model on the result
  4. Serve the small model

You get most of the large model's quality at a fraction of
the serving cost and latency. This is where fine-tuning
genuinely pays for itself.
```

## 5. Why It Matters

- **The behavior-vs-knowledge distinction** is the single most important framing here and a standard interview question.
- **Knowing when NOT to fine-tune** is more valuable than knowing how.
- **Distillation** is the pattern where fine-tuning clearly earns its cost.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Fine-tuning to inject knowledge** | Stale, uncitable, unpermissionable |
| **Catastrophic forgetting** | Narrow fine-tuning degrades general ability |
| **Too few examples** | Overfits; hundreds to thousands are typically needed |
| **Base model lock-in** | An adapter is tied to its base; a prompt is portable |
| **Data quality** | Garbage in, confidently-formatted garbage out |
| **No held-out eval** | You can't tell whether it helped |

**On catastrophic forgetting:** fine-tuning on a narrow dataset degrades capability outside that distribution. Mitigations are lower learning rates, fewer epochs, mixing general data into the fine-tuning set, and parameter-efficient methods that leave base weights untouched.

**On lock-in:** a LoRA adapter is tied to its specific base model and version. When a better base model ships, you redo the fine-tune. A prompt and a retrieval index are portable. That's a real argument for exhausting prompting and RAG first — it keeps your investment model-independent.

## 7. Interview Answer

> "Fine-tuning continues training a pretrained model on task-specific data to change its behavior. The framing that governs every decision is: fine-tuning changes behavior, RAG changes knowledge.
>
> So if the failure is 'it doesn't know our 2026 fee schedule,' that's retrieval. If it's 'it knows the answer but won't produce our required JSON structure reliably,' that's fine-tuning or better prompting.
>
> Using fine-tuning to inject facts is the classic expensive mistake. Bake the fee schedule into the weights and the old schedule is still in there competing, you retrain when fees change, you can't cite the source, you can't permission it so every user gets every fact, and you can't audit which fact the model used. RAG does all of that by re-indexing one document in seconds.
>
> My decision ladder is prompting, then few-shot examples, then RAG for knowledge, then LoRA for behavior, then full fine-tuning which is rarely justified. Most teams jump to step four or five when step one or two would have worked.
>
> Where fine-tuning genuinely pays for itself is distillation. Use a large model to label ten thousand examples, have humans review the low-confidence subset, fine-tune a small model on the result, and serve the small model. You get most of the large model's quality at a fraction of the serving cost and latency. That's the case where the economics clearly work.
>
> Two risks I'd manage. Catastrophic forgetting — narrow fine-tuning degrades general capability, mitigated with lower learning rates, fewer epochs, and mixing general data in. And lock-in: a LoRA adapter is tied to its base model version, so when a better base ships you redo the work. A prompt and a retrieval index are portable, which is another argument for exhausting those first."

## 8. Likely Follow-ups

**Q: Fine-tuning or RAG?**
Different problems. RAG changes what the model knows — it injects facts at inference. Fine-tuning changes how the model behaves — format, tone, task structure. If the failure is missing knowledge, that's RAG; if it's unreliable output format, that's fine-tuning or prompting. They compose: fine-tune for behavior, retrieve for knowledge.

**Q: Why not fine-tune facts into the model?**
Because they go stale and you retrain to update them, the old facts remain in the weights competing with the new, you can't cite the source, you can't apply access control since every user gets every fact, and you can't audit which fact was used. All four are things retrieval handles trivially.

**Q: How much data do you need?**
Typically hundreds to a few thousand high-quality examples for behavioral fine-tuning with LoRA. Quality matters far more than volume — a few hundred carefully-constructed examples beat thousands of noisy ones, because the model is learning a pattern rather than absorbing facts. And you need a held-out set, or you can't tell whether it helped.

**Q: What is catastrophic forgetting?**
Fine-tuning on a narrow dataset degrading capability outside that distribution — the model gets better at your task and worse at everything else. Mitigations are a lower learning rate, fewer epochs, mixing general instruction data into the fine-tuning set, and parameter-efficient methods that leave base weights untouched.

**Q: When does fine-tuning clearly pay off?**
Distillation at volume. Use a large model to label data, have humans review the uncertain cases, fine-tune a small model, and serve that. You get most of the large model's quality at a fraction of the cost and latency per request. At high volume that saving dominates the one-time fine-tuning cost, which is what makes the economics work.

## 9. Common Mistakes

- Fine-tuning to inject knowledge instead of using RAG.
- Jumping to fine-tuning before exhausting prompting and few-shot.
- Not holding out an evaluation set.
- Ignoring catastrophic forgetting on narrow datasets.
- Forgetting that an adapter is locked to its base model version.

## 10. What to Remember

- **Fine-tuning changes behavior; RAG changes knowledge.** The governing distinction.
- **Ladder:** prompt → few-shot → RAG → LoRA → full fine-tune. Climb only when needed.
- **Never fine-tune facts** — stale, uncitable, unpermissionable, unauditable.
- **Distillation is where it pays** — large model labels, small model serves.
- **Adapters lock you to a base model version.** Prompts and indexes are portable.
