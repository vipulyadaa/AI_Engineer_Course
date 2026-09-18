# Distillation

> **Phase 04 · LLM FUNDAMENTALS · Topic 29**

## 1. Definition

Training a smaller "student" model to reproduce a larger "teacher" model's behavior. In LLM practice the dominant form is **data distillation** — the teacher generates training examples, and the student is fine-tuned on them.

## 2. Simple Explanation

You want a large model's quality at a small model's cost.

So you use the large model to produce the training data, then fine-tune a small model on it. The small model learns to imitate the large one on your specific task — which is a much narrower target than general capability, and therefore achievable.

## 3. How It Works

**Two forms, and the one you'd actually use:**

```
CLASSICAL (logit distillation)
  Student trained to match the teacher's full output DISTRIBUTION,
  not just its top choice. The "soft targets" carry more
  information — that the teacher considered "Paris" 0.9 and
  "Lyon" 0.05 is richer than just "Paris."
  Requires access to teacher logits → usually needs both models
  self-hosted.

DATA DISTILLATION  ← what you'll actually do
  Teacher generates (input, output) pairs.
  Student is fine-tuned on them with standard SFT.
  Works with any API-accessible teacher.
```

**The pipeline:**

```
1. Collect real inputs from production
2. Teacher (large model) generates outputs
3. HUMANS REVIEW the low-confidence or high-stakes subset
4. Fine-tune the student on the result
5. Evaluate student vs. teacher on a held-out set
6. Serve the student; escalate hard cases to the teacher
```

**Step 3 is what separates a good distillation from a bad one** — the teacher's errors become the student's training data otherwise.

## 4. Practical Example

**The economics, which is the whole argument:**

```
Task: banking intent classification, 500k requests/day

Teacher (large model, zero-shot):
  accuracy ~93%,  latency ~600 ms,  high per-call cost

Distilled student (small model, fine-tuned on 20k
teacher-labeled examples):
  accuracy ~91%,  latency ~15 ms,  near-zero per-call cost

Two points of accuracy for a 40× latency improvement and
a cost reduction of a similar order. At 500k requests/day
that trade is obvious.
```

**Why it works better than it sounds:**

```
The student isn't learning general capability — it's learning
ONE task. That's a far narrower target.

A 110M-parameter model can match a 70B model on a single
well-defined classification task, because the hard part
(language understanding) came from ITS pretraining, and
distillation only supplies the task-specific mapping.
```

**The cascade, which is usually the right architecture:**

```
request → small distilled model
            ├─ confident  → return  (~90% of traffic)
            └─ uncertain  → escalate to the large model

You get the small model's cost on the bulk and the large
model's quality on the hard cases. Better than choosing one.
```

## 5. Why It Matters

- **It's the pattern that makes fine-tuning economically obvious** — most fine-tuning arguments are weak; this one isn't.
- **It's directly applicable** to any high-volume classification or extraction task in a RAG pipeline.
- **The cascade architecture** is a practical design worth proposing.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Inheriting teacher errors** | The student learns the teacher's mistakes as ground truth |
| **No human review** | Nothing catches systematic teacher failures |
| **Narrow training distribution** | The student fails outside the distilled task |
| **Licence restrictions** | Some provider terms restrict using outputs to train competing models |
| **No held-out evaluation** | Can't tell whether the student is acceptable |
| **Distilling a task that's already easy** | If a prompt works, distillation adds complexity for nothing |

**The licence point is a real gate:** several model providers' terms restrict using their outputs to train models that compete with them. In a bank, that's a legal review item before a distillation project, not an afterthought. Worth raising unprompted — it signals you've thought past the technical question.

**On teacher errors:** the student is bounded by the teacher's quality on the distilled data, so systematic teacher failures become systematic student failures. Reviewing the low-confidence subset catches most of it cheaply — you don't need to review everything, just the cases where the teacher was uncertain.

## 7. Interview Answer

> "Distillation trains a smaller student model to reproduce a larger teacher's behavior. Classically that means matching the teacher's full output distribution, which carries more information than just its top choice — but that requires access to teacher logits, so in practice with API models you do data distillation: the teacher generates input-output pairs and you fine-tune the student on them with standard SFT.
>
> The economics are the argument. For something like banking intent classification at high volume, a large model zero-shot might get ninety-three percent at six hundred milliseconds and meaningful per-call cost. A small model fine-tuned on twenty thousand teacher-labeled examples might get ninety-one percent at fifteen milliseconds and near-zero cost. Two points of accuracy for a forty-fold latency improvement and a comparable cost reduction — at five hundred thousand requests a day that trade is obvious.
>
> The reason it works better than it sounds is that the student isn't learning general capability, it's learning one task. The hard part — language understanding — came from its own pretraining. Distillation only supplies the task-specific mapping, which is a much narrower target.
>
> The step that separates a good distillation from a bad one is human review of the low-confidence subset. Without it, the teacher's errors become the student's training data as ground truth, and systematic teacher failures become systematic student failures. You don't need to review everything — just the cases where the teacher was uncertain.
>
> And the architecture I'd usually propose isn't student-or-teacher, it's a cascade: the small distilled model handles the bulk, and uncertain cases escalate to the large model. You get the small model's cost on ninety percent of traffic and the large model's quality on the hard cases.
>
> One thing I'd raise before starting: several providers' terms restrict using their outputs to train competing models. In a bank that's a legal review item, not an afterthought."

## 8. Likely Follow-ups

**Q: What's the difference between classical and data distillation?**
Classical distillation trains the student to match the teacher's full output distribution — the soft targets carry information about what the teacher considered and rejected. That requires teacher logits, so both models typically need to be self-hosted. Data distillation just uses teacher-generated input-output pairs with standard supervised fine-tuning, which works with any API-accessible teacher.

**Q: Why can a small model match a large one?**
Because it's learning one task, not general capability. The hard part — language understanding — came from the student's own pretraining. Distillation supplies only the task-specific mapping, which is a far narrower target than what the teacher does in general. That's why a 110M model can match a much larger one on a single well-defined task.

**Q: What's the main risk?**
Inheriting the teacher's errors, since its outputs become the student's ground truth. Systematic teacher failures become systematic student failures, and nothing in the pipeline catches them automatically. Human review of the low-confidence subset addresses most of it at reasonable cost.

**Q: What architecture would you actually deploy?**
A cascade rather than either model alone. The small distilled model handles the bulk of traffic; when it's uncertain or the query is flagged complex, escalate to the large model. That gives the small model's cost and latency on most requests and the large model's quality where it matters.

**Q: Are there legal constraints?**
Yes, and it's worth raising early. Several providers' terms of service restrict using their model outputs to train models that could compete with them. In a regulated context that's a legal review gate before the project starts, not something to discover afterwards. Open-weight teachers avoid the issue.

## 9. Common Mistakes

- Skipping human review, so teacher errors become training data.
- Not checking provider licence terms before distilling.
- Deploying student-or-teacher instead of a cascade.
- Distilling a task that a prompt already handles adequately.
- No held-out evaluation comparing student to teacher.

## 10. What to Remember

- **Teacher generates training data; student is fine-tuned on it.** Data distillation, not logit matching.
- **The economics are the argument** — a couple of accuracy points for 40× latency and cost.
- **It works because the student learns one task**, not general capability.
- **Review the low-confidence subset** or teacher errors become student ground truth.
- **Deploy as a cascade**, and check provider licence terms first.
