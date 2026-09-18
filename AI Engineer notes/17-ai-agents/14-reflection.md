# Reflection

> **Phase 17 · AI AGENTS · Topic 14**

## 1. Definition

Having the agent evaluate its own output or progress before committing to it — a critique step between producing something and returning it. It catches some classes of error at the cost of extra calls and latency.

## 2. Simple Explanation

The agent produces an answer, then a second pass asks "is this actually right? does it answer the question? is every claim supported?"

If the critique finds problems, the agent revises. It's a self-review step, and like human self-review it catches some things and is blind to others.

## 3. How It Works

```
GENERATE  → produce a draft answer
REFLECT   → critique it against explicit criteria
REVISE    → fix what the critique found
  ↻ repeat, capped

Reflection prompt (specific, not "check your work"):
  · Is every factual claim supported by a retrieved document?
  · Does it answer what was actually asked?
  · Are there unstated assumptions?
  · What would make this answer wrong?
```

**Specific criteria matter enormously.** "Review your answer" produces cosmetic edits. "List every factual claim and cite which retrieved document supports it — flag any that lack support" produces useful findings.

## 4. Practical Example

**What reflection catches and what it doesn't:**

```
CATCHES WELL
  · unsupported claims, when the criterion is explicit
  · failing to answer the actual question
  · internal inconsistency within the answer
  · omitted caveats and conditions

CATCHES POORLY
  · errors caused by a WRONG RETRIEVED FACT — the model has
    no independent way to know the document was wrong
  · its own systematic biases — the critic shares them
  · anything requiring information it doesn't have

The honest summary: reflection is good at CONSISTENCY and
COMPLETENESS, weak at CORRECTNESS.
```

**That distinction is the substantive point.** Reflection cannot verify facts it has no independent source for — it only checks the answer against the context it already has.

**Where it genuinely pays off in a banking RAG system:**

```
Criterion: "For each factual claim, quote the supporting
            passage from the retrieved context. If you cannot
            quote a supporting passage, remove the claim."

This turns reflection into a GROUNDING check, which is
exactly the failure mode that matters — the model adding
plausible detail that wasn't in the source.

It's verifying against retrieved context, not against the
world, which is why it works here and doesn't work for
general factual correctness.
```

**Cost:** reflection roughly doubles calls and latency. For a customer-facing chat that's often too expensive, but for an answer that will be shown as authoritative — a fee calculation, a policy statement — it's justified. Applying it selectively by stakes is better than always or never.

## 5. Why It Matters

- **It's the main self-improvement mechanism** available without retraining.
- **It's good at consistency and grounding, weak at correctness** — the key distinction.
- **Selective application by stakes** is the design that makes the cost work.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Doubles cost and latency** | Two or more calls per answer |
| **Vague criteria** | Cosmetic edits, no real findings |
| **Shared blind spots** | The critic has the generator's biases |
| **Over-revision** | Repeated revision degrading a good answer |
| **False confidence** | "Reviewed" sounds verified, and isn't |
| **Uncapped loops** | Revise-critique cycling indefinitely |

**On false confidence — the risk worth naming:** an answer that passed self-review feels more trustworthy and isn't necessarily more correct. If reflection output is surfaced to users or logged as a quality signal, it can create unwarranted confidence in exactly the cases where the model was confidently wrong. Reflection should reduce specific failure modes, not be presented as validation.

**On a separate critic:** using a different model, or at least a fresh context without the generation history, catches more than self-critique in the same context — the generator's reasoning biases the critique when it's visible. It costs the same and works better.

## 7. Interview Answer

> "Reflection is having the agent critique its own output before committing to it — generate, reflect, revise, capped.
>
> The thing that determines whether it works is criteria specificity. 'Review your answer' produces cosmetic edits. 'List every factual claim and quote the supporting passage from the retrieved context; if you can't quote support, remove the claim' produces real findings. The second version turns reflection into a grounding check.
>
> The honest characterization is that reflection is good at consistency and completeness and weak at correctness. It catches unsupported claims, failing to answer what was asked, internal inconsistency, and omitted caveats. It doesn't catch errors caused by a wrong retrieved fact, because it has no independent way to know the document was wrong, and it doesn't catch its own systematic biases because the critic shares them.
>
> That's why it works well specifically for RAG grounding. Verifying claims against retrieved context is something the model can actually do — the context is right there. Verifying claims against the world isn't. Knowing which of those you're asking for is the difference between reflection helping and reflection being theatre.
>
> On cost, it roughly doubles calls and latency. For customer-facing chat that's often too much, but for an answer presented as authoritative — a fee calculation, a policy statement — it's justified. So I'd apply it selectively by stakes rather than always or never.
>
> Two refinements. Using a separate critic — a different model, or at least a fresh context without the generation history — catches more than self-critique, because the generator's reasoning biases the critique when it's visible. Same cost, works better.
>
> And the risk I'd name explicitly: an answer that passed self-review feels more trustworthy without necessarily being more correct. If reflection is surfaced to users or logged as a quality signal, it creates unwarranted confidence in exactly the cases where the model was confidently wrong. Reflection should reduce specific failure modes, not be presented as validation."

## 8. Likely Follow-ups

**Q: What does reflection catch?**
Unsupported claims when the criterion is explicit, answers that don't address what was asked, internal inconsistency, and omitted caveats. It's good at consistency and completeness — checking the answer against the context and the question it already has.

**Q: What does it miss?**
Errors from a wrong retrieved fact, since it has no independent source to check against, and its own systematic biases, since the critic shares them. Reflection verifies against available context, not against the world, which is the boundary of what it can do.

**Q: How do you make reflection effective?**
Specific criteria. Instead of "review your answer," ask it to list every factual claim and quote the supporting passage from the retrieved context, removing anything it can't support. That turns it into a grounding check, which is the failure mode that actually matters in RAG.

**Q: Is it worth the cost?**
Selectively. It roughly doubles calls and latency, which is often too much for customer-facing chat but justified for answers presented as authoritative — a fee calculation or a policy statement. Applying it by stakes beats a blanket policy either way.

**Q: What's the risk of reflection?**
False confidence. An answer that passed self-review feels validated without necessarily being more correct, and if that signal is surfaced to users or logged as quality evidence it creates unwarranted trust — particularly in the confidently-wrong cases reflection is worst at catching.

## 9. Common Mistakes

- Using vague criteria like "check your work."
- Treating reflection as verification of factual correctness.
- Self-critiquing in the same context as generation.
- Applying it uniformly regardless of stakes.
- Surfacing "reviewed" as a confidence signal to users.

## 10. What to Remember

- **Generate → critique → revise**, with a hard cap on cycles.
- **Specific criteria decide whether it works** — vague prompts give cosmetic edits.
- **Strong on consistency and grounding, weak on correctness.**
- **Use a separate critic** with a fresh context — same cost, better results.
- **Apply selectively by stakes**, and don't present it as validation.
