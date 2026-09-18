# Foundation Models

> **Phase 04 · LLM FUNDAMENTALS · Topic 02**

## 1. Definition

A model trained on broad data at scale that can be adapted to many downstream tasks — through prompting, retrieval, or fine-tuning — rather than being trained for one task. The term comes from the Stanford CRFM report (Bommasani et al., 2021).

## 2. Simple Explanation

The old pattern was one model per task: a sentiment model, a NER model, a summarization model, each trained on its own labeled dataset.

A foundation model is trained once on broad data and then adapted to all of those. The economics inverted — the expensive part moved from per-task training to a one-time pretraining run that everyone builds on.

## 3. How It Works

**What makes something a foundation model:**

```
· Trained on BROAD data (not task-specific)
· At SCALE (parameters, data, compute)
· Adaptable to many downstream tasks
· Exhibits capabilities not explicitly trained for (in-context learning)
```

**The adaptation ladder, cheapest first:**

| Method | Changes | Cost | Use for |
|---|---|---|---|
| **Prompting** | Nothing | Minutes | Most tasks; always try first |
| **Few-shot** | Nothing | Minutes | Format and style guidance |
| **RAG** | Nothing | Days | Knowledge the model lacks |
| **PEFT / LoRA** | <1% of parameters | Hours–days | Behavior and format the prompt can't fix |
| **Full fine-tuning** | All parameters | Days–weeks | Rarely justified |

**The decision rule:** climb the ladder only when the rung below demonstrably fails. Most teams reach for fine-tuning far earlier than needed.

## 4. Practical Example

**The homogenization risk, which is the substantive critique:**

```
Everyone builds on a handful of foundation models.

Consequence: a flaw in one base model propagates to every
system built on it. A bias, a failure mode, a knowledge gap
becomes systemic rather than isolated.

The Stanford report names this explicitly — it's the trade-off
against the enormous efficiency gain, and it's worth being able
to state rather than presenting foundation models as unambiguously good.
```

**Concrete consequences for an engineer:**

```
· PROVIDER DEPENDENCY — a model update changes your system's
  behavior with no code change. Pin versions; run a golden
  eval set on every update.

· SHARED FAILURE MODES — if the base model is weak on a domain,
  every application on it inherits that weakness.

· LIMITED RECOURSE — you can't fix a base model's bias by
  prompting around it reliably.

· LOCK-IN — a fine-tuned adapter is tied to its base model.
  A prompt is portable; a LoRA is not.
```

**Multimodal is the current direction:** Gemini, GPT-4o and similar handle text, images, audio, and video in one model. The foundation-model framing extends naturally — one broadly-trained model adapted across modalities as well as tasks.

## 5. Why It Matters

- **It names the shift your role exists because of** — building on top of models rather than training them.
- **The adaptation ladder is a practical decision framework** you'll use constantly.
- **The homogenization critique** is the mature view, and an interviewer will notice if you only give the upside.

## 6. Trade-offs / Failure Modes

| Advantage | Corresponding risk |
|---|---|
| One model serves many tasks | A flaw in it affects every task |
| No per-task training data needed | Less control over behavior |
| Rapid iteration via prompting | Provider can change the model underneath you |
| Strong general capability | Weak on narrow domains without adaptation |
| Shared infrastructure | Vendor lock-in and dependency |

**On when a small specialized model beats a foundation model:** for a single high-volume task with abundant labeled data — intent classification at scale, for instance — a fine-tuned small model often matches or beats a large general model at a fraction of the cost and latency. The foundation-model route isn't automatically correct, and saying so signals judgment.

**On the distillation pattern:** use a foundation model to label data, then train a small specialized model to serve. You get the foundation model's quality at the small model's cost. That's often the right architecture at volume.

## 7. Interview Answer

> "A foundation model is trained on broad data at scale and adapted to many downstream tasks, rather than trained for one task. The term comes from the 2021 Stanford CRFM report.
>
> The shift it names is economic. The old pattern was one model per task, each with its own labeled dataset and training run. Now the expensive part is a one-time pretraining run that everyone builds on, and adaptation is comparatively cheap. That's why my role exists — building systems on top of these models rather than training them.
>
> Adaptation is a ladder. Prompting changes nothing and takes minutes. Few-shot examples for format. RAG when the model lacks knowledge. Parameter-efficient fine-tuning like LoRA when behavior or format can't be fixed by prompting. Full fine-tuning rarely. My rule is to climb only when the rung below demonstrably fails, and in practice most teams reach for fine-tuning far earlier than they need to.
>
> The critique worth stating, because it's in the original report and it's easy to give only the upside: homogenization. Everyone builds on a handful of base models, so a flaw in one propagates to every system on it. A bias or a domain weakness becomes systemic rather than isolated. Practically that means provider dependency — a model update changes my system's behavior with no code change, so I'd pin versions and run a golden eval set on every update.
>
> And I'd note that a foundation model isn't automatically the right choice. For a single high-volume task with abundant labels — intent classification at scale — a fine-tuned small model often matches a large general one at a fraction of the cost and latency. The pattern I like is using the foundation model to label data and a distilled small model to serve."

## 8. Likely Follow-ups

**Q: What makes a model a "foundation" model?**
Trained on broad rather than task-specific data, at sufficient scale, adaptable to many downstream tasks, and exhibiting capabilities not explicitly trained for — in-context learning being the clearest example. It's the breadth and adaptability that distinguish it, not just size.

**Q: How do you adapt one to a task?**
A ladder: prompting first, then few-shot examples, then RAG for missing knowledge, then parameter-efficient fine-tuning for behavior the prompt can't fix, then full fine-tuning which is rarely justified. Climb only when the rung below demonstrably fails — most teams jump to fine-tuning too early.

**Q: What's the downside of foundation models?**
Homogenization, which the Stanford report names explicitly. Everyone builds on a few base models, so a flaw in one becomes systemic. Practically it means provider dependency — a model update changes your behavior with no code change — plus inherited domain weaknesses and limited recourse for base-model biases.

**Q: When would you not use a foundation model?**
For a single high-volume task with abundant labeled data. A fine-tuned small model often matches or beats a large general one at a fraction of the cost and latency. The distillation pattern is usually the answer at volume: use the foundation model to label data, train a small model to serve.

**Q: How do you manage provider dependency?**
Pin model versions explicitly rather than using floating aliases. Maintain a golden eval set and run it on every announced update. Keep the system's knowledge in retrieval rather than in fine-tuned weights, so switching base models doesn't mean redoing your knowledge work. And avoid coupling to provider-specific features where a portable alternative exists.

## 9. Common Mistakes

- Presenting foundation models as unambiguously good without the homogenization critique.
- Jumping to fine-tuning before exhausting prompting and RAG.
- Not pinning model versions, so provider updates change behavior silently.
- Assuming a large general model always beats a small specialized one.
- Forgetting that a fine-tuned adapter is tied to its base model while a prompt is portable.

## 10. What to Remember

- **Broad training, many downstream tasks.** The economics moved from per-task to one-time pretraining.
- **Adaptation ladder:** prompt → few-shot → RAG → PEFT → full fine-tune. Climb only when needed.
- **Homogenization is the real critique** — one base model's flaw becomes systemic.
- **Pin versions and keep a golden eval set** — provider updates change behavior silently.
- **Distillation is often right at volume:** foundation model labels, small model serves.
