# Model Regression

> **Phase 22 · AI EVALUATION · Topic 18**

## 1. Definition

Quality degradation caused by a change in the model — either a version you adopted deliberately, or a provider update that reached you because the reference was a floating alias.

## 2. Simple Explanation

Two very different situations share the name.

A deliberate upgrade is a change you control, evaluate, and can roll back. A provider updating the model behind a floating alias is a change that arrives with no deploy on your side — and that's the one that's hard to detect.

## 3. How It Works

```
DELIBERATE UPGRADE
  you choose → evaluate → cut over → can roll back
  → ordinary change management

SILENT UPDATE
  provider changes the model behind an alias
  → behaviour shifts with no deploy
  → nothing in your change log explains it

The defence against the second is version pinning, and
it's free.
```

**Pin explicitly, never a floating alias.** That converts an undetectable class of change into a change you schedule.

## 4. Practical Example

**Detecting an external change:**

```
A FIXED golden set run on a schedule.

If nothing changed on your side and scores moved, the cause
is external — a model update, or a corpus change.

That's the only reliable detector, and it depends on the
golden set core being genuinely fixed. If the eval set
changes while the score changes, you can't attribute the
difference to anything.
```

**That attribution property is why a fixed core matters** — it's not just tidiness, it's what makes external change detectable at all.

**Evaluating a deliberate upgrade:**

```
Don't assume newer is better FOR YOUR TASK.

Run both versions on the golden set, measuring:
  · groundedness and answer correctness per question type
  · instruction-following — does it still respect the
    abstention rule and the advice prohibition?
  · format compliance — citations, length, structure
  · latency and cost
  · tool selection accuracy, if it's an agent

The one that surprises people is instruction-following.
A more capable model can be WORSE at following a narrow
constraint, because it reasons around it. A model that
decides the customer would be better served by a helpful
suggestion has just violated the advice prohibition.
```

**Prompts are version-coupled:**

```
A prompt tuned against one model version may behave
differently on another. So an upgrade isn't just a model
swap — it may require re-tuning the prompt, and the
evaluation has to cover the prompt-model pair rather than
the model alone.

That's why "the new model scored worse" sometimes means
"the old prompt doesn't fit the new model."
```

**Rolling out:** deploy alongside the current version with a traffic split, compare on live traffic, and promote gradually. Rollback is a percentage change. Cutting straight over removes the ability to compare on real traffic, which is where differences the golden set missed will show up.

## 5. Why It Matters

- **Version pinning converts an undetectable change into a scheduled one** — and it's free.
- **A fixed golden set core** is the only reliable detector of external change.
- **Instruction-following can regress on a better model**, which is counterintuitive.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Floating model alias** | Silent behavioural change |
| **Assuming newer is better** | Not necessarily for your task |
| **Eval set changing with the model** | Difference unattributable |
| **Prompt not re-evaluated** | Version-coupled behaviour |
| **Direct cutover** | No comparison on live traffic |
| **Only aggregate scores compared** | Per-question-type regressions hidden |

**On deprecation pressure:** providers retire model versions, so pinning defers the upgrade rather than avoiding it. The value of pinning is that you choose when — with an evaluation run and a traffic-split rollout — rather than discovering the change through a support ticket. Planning for a scheduled upgrade cycle is part of operating on a hosted model.

**On what to compare:** aggregate scores can be flat while a specific question type regresses badly. A model upgrade that improves simple lookups by two points and degrades multi-hop by fifteen shows as a small net gain, and the affected customers are the ones with the hardest questions. Per-type comparison is what catches that.

## 7. Interview Answer

> "Two different situations share this name. A deliberate upgrade is a change I control — I evaluate it, cut over, and can roll back. A provider updating the model behind a floating alias is a change that arrives with no deploy on my side, and nothing in the change log explains it. That second one is the problem.
>
> The defence is version pinning, and it's free. Pinning explicitly rather than using a floating alias converts an undetectable class of change into one I schedule.
>
> For detecting external change generally, the mechanism is a fixed golden set run on a schedule. If nothing changed on my side and scores moved, the cause is external — a model update or a corpus change. That's the only reliable detector, and it depends on the golden set core being genuinely fixed. If the eval set changes while the score changes, the difference can't be attributed to anything — which is why a stable core isn't tidiness, it's what makes external change detectable at all.
>
> For a deliberate upgrade, I wouldn't assume newer is better for my task. I'd run both versions on the golden set measuring groundedness and answer correctness per question type, instruction-following, format compliance, latency, cost, and tool selection accuracy if it's an agent.
>
> Instruction-following is the one that surprises people. A more capable model can be worse at following a narrow constraint because it reasons around it. A model that decides the customer would be better served by a helpful suggestion has just violated the advice prohibition — and that's a regression on a safety property, not a quality one, so it shouldn't be traded against a small accuracy gain.
>
> Something else worth knowing: prompts are version-coupled. A prompt tuned against one model version may behave differently on another, so an upgrade may require re-tuning the prompt. The evaluation has to cover the prompt-model pair rather than the model alone — which is why 'the new model scored worse' sometimes actually means 'the old prompt doesn't fit the new model.'
>
> For rollout, deploy alongside the current version with a traffic split, compare on live traffic, and promote gradually. Rollback is a percentage change. Cutting straight over removes the ability to compare on real traffic, which is where differences the golden set missed will show.
>
> And I'd compare per question type, not in aggregate. An upgrade that improves simple lookups by two points and degrades multi-hop by fifteen shows as a small net gain — while the affected customers are the ones with the hardest questions."

## 8. Likely Follow-ups

**Q: What's the dangerous kind of model regression?**
A provider updating the model behind a floating alias. Behaviour shifts with no deploy on your side and nothing in the change log explains it. Version pinning converts that undetectable change into one you schedule, and it costs nothing.

**Q: How do you detect an external change?**
A fixed golden set run on a schedule. If nothing changed on your side and scores moved, the cause is external. It only works if the golden set core is genuinely fixed — if the set changes while the score changes, nothing can be attributed.

**Q: What surprises people in an upgrade evaluation?**
Instruction-following regressing on a more capable model, because it reasons around narrow constraints. A model deciding the customer would be better served by a helpful suggestion has violated the advice prohibition — a safety regression that shouldn't trade against a small accuracy gain.

**Q: Do prompts need re-evaluating on a model change?**
Yes — prompts are version-coupled. One tuned against the old version may behave differently on the new one, so the evaluation covers the prompt-model pair. "The new model scored worse" sometimes means "the old prompt doesn't fit it."

**Q: How would you roll out an upgrade?**
Alongside the current version with a traffic split, comparing on live traffic and promoting gradually, so rollback is a percentage change. A direct cutover removes the ability to compare on real traffic, which is where the differences the golden set missed appear.

## 9. Common Mistakes

- Referencing the model by a floating alias.
- Assuming a newer version is better for your task.
- Changing the eval set alongside the model.
- Evaluating the model without re-checking the prompt.
- Comparing aggregate scores rather than per question type.

## 10. What to Remember

- **Pin the version** — it converts silent change into scheduled change.
- **A fixed golden set core** is the only reliable external-change detector.
- **Instruction-following can regress on a better model** — check it explicitly.
- **Prompts are version-coupled** — evaluate the pair.
- **Compare per question type**; aggregates hide a bad multi-hop regression.
