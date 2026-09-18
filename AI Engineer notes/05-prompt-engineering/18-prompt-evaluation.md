# Prompt Evaluation

> **Phase 05 · PROMPT ENGINEERING · Topic 18**

## 1. Definition

Measuring whether a prompt change improved the system, using a held-out eval set and metrics that match what the prompt is supposed to affect. It's what separates prompt engineering from prompt fiddling.

## 2. Simple Explanation

You changed the prompt and the output looks better on the three examples you checked. Did it actually improve?

Without an eval set you can't know, and you can't know whether it broke something else. Prompt evaluation is applying the same measurement discipline to prompts that you'd apply to any other change.

## 3. How It Works

```
1. Eval set: questions + expected answers + known correct sources
2. Split: dev (iterate freely) / test (touch once per release)
3. Metrics matched to what the prompt affects
4. Run before and after; compare against the production baseline
5. Check guardrails, not just the target metric
```

**Metrics by what the prompt is trying to change:**

| Prompt change | Measure |
|---|---|
| Abstention wording | Abstention rate on out-of-scope **and** answerable questions |
| Grounding instruction | Groundedness / faithfulness |
| Citation requirement | Citation presence and validity |
| Format/schema | Parse success rate, schema conformance |
| Conciseness | Output token count **and** completeness |
| Tone/register | Human evaluation — automated metrics don't capture it |

**Guardrails matter as much as the target.** A prompt change that improves groundedness while doubling abstention has made the system safer and less useful.

## 4. Practical Example

**Prompt overfitting, which is the failure mode:**

```
Iterate on 20 examples until all 20 work.
Ship. It fails on the 21st.

Same mechanism as overfitting in supervised learning —
you fit the quirks of a small sample.

Fix: a held-out test portion you NEVER iterate against.
Expect a gap between dev and test performance; that gap
is the measurement of how much you overfit.
```

**Slice, don't just aggregate:**

```
Prompt v8 vs. v7, overall groundedness +2 points.

  factual_lookup       +3   ✅
  comparison           +4   ✅
  out-of-scope         −9   ❌  abstention wording change broke it
  conversational       +1

The aggregate hid a regression on exactly the category
that matters most for safety.
```

**A/B testing when offline evaluation is ambiguous:**

```
Offline metrics improved but you're unsure it matters to users:
  50% v7 / 50% v8
  primary: escalation rate to a human agent
  guardrails: latency, cost, abstention rate

Offline gates the change; online validates it mattered.
```

**Change one thing at a time.** Adjusting the abstention wording and the citation instruction together makes the result unattributable — and if the net is neutral, you can't tell whether one helped and one hurt.

## 5. Why It Matters

- **It's the difference between engineering and fiddling**, which is what the interview is probing.
- **Prompt overfitting is real and easy to cause**, and the fix is the same train/test discipline as supervised learning.
- **Slicing reveals regressions** that an aggregate improvement hides.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No eval set** | "It seems better" is not a measurement |
| **Iterating against the whole set** | Reported metrics optimistic by an unknown amount |
| **Aggregate only** | Hides category regressions |
| **Changing several things at once** | Unattributable |
| **No guardrails** | Safety regressions ship as quality wins |
| **Judge drift** | A judge model update shifts scores with no prompt change |
| **Eval set too small per slice** | Can't measure a category with five examples |

**On judge stability:** if groundedness is measured by an LLM judge, pin the judge's model version. A provider update shifts your metric with no change to your prompt, which makes historical comparisons invalid and can look like a prompt regression.

**On the abstention guardrail specifically:** it needs a band, checked in both directions. A prompt change that reduces abstention looks like improvement on nearly every other metric while being a real safety regression — the system started answering things it shouldn't.

## 7. Interview Answer

> "Prompt evaluation is measuring whether a prompt change actually improved the system, using a held-out eval set and metrics that match what the prompt is supposed to affect. It's what separates prompt engineering from fiddling.
>
> The failure mode it prevents is prompt overfitting, and it's easy to cause. Iterate on twenty examples until all twenty work, ship it, and it fails on the twenty-first. It's the same mechanism as overfitting in supervised learning — fitting the quirks of a small sample — and the fix is the same: a held-out test portion I never iterate against. The gap between dev and test performance is the measurement of how much I overfit.
>
> I'd match the metric to the change. An abstention wording change is measured by abstention rate on both out-of-scope and answerable questions. A grounding instruction by groundedness. A format change by parse success and schema conformance. Tone by human evaluation, because automated metrics don't capture register.
>
> And I'd slice rather than report an aggregate. I've seen a prompt change improve overall groundedness by two points while dropping nine points on out-of-scope questions — an abstention wording change that broke exactly the category that matters most for safety. The aggregate hid it entirely.
>
> Guardrails matter as much as the target metric. A change that improves groundedness while doubling abstention has made the system safer and less useful. I'd check abstention in both directions, because a drop looks like improvement on almost every other metric while being a real safety regression.
>
> I'd change one thing at a time — adjusting abstention wording and the citation instruction together makes the result unattributable, and if the net is neutral you can't tell whether one helped and one hurt.
>
> One operational detail: if groundedness is judged by an LLM, pin the judge's model version. A provider update shifts the metric with no prompt change, which makes historical comparisons invalid and can look like a regression you caused."

## 8. Likely Follow-ups

**Q: How do you know a prompt change helped?**
Run it against a held-out eval set, measure the metric matched to what the prompt affects, compare against the production baseline, and check guardrails. Then slice by query type, because an aggregate improvement can hide a regression on a specific category.

**Q: What is prompt overfitting?**
Iterating against a small set until it all works, then failing on new examples. It's the same mechanism as overfitting in supervised learning — fitting sample quirks. The fix is a held-out test portion you never iterate against, and the dev-to-test gap tells you how much you overfit.

**Q: What metrics for what changes?**
Abstention wording → abstention rate on both out-of-scope and answerable questions. Grounding instruction → groundedness. Citation requirement → citation presence and validity. Format → parse success and schema conformance. Tone and register → human evaluation, since automated metrics don't capture it.

**Q: Why slice the results?**
Because an aggregate improvement can hide a category regression. I've seen a change improve overall groundedness while dropping nine points on out-of-scope questions — the safety-critical category. Aggregates average away exactly the failures you most need to see.

**Q: What guardrails would you check?**
Abstention rate in both directions, latency, cost per request, and output length. A change that halves abstention looks like improvement on nearly every quality metric while being a real safety regression. Guardrails are what stop optimization from producing a worse product that scores better.

## 9. Common Mistakes

- Iterating without a held-out set.
- Reporting aggregate metrics without slicing.
- Changing several prompt elements at once.
- No guardrail metrics, especially abstention in both directions.
- Not pinning the judge model version when measuring with an LLM judge.

## 10. What to Remember

- **Held-out set you never iterate against** — prompt overfitting is real.
- **Match the metric to the change**; tone needs human evaluation.
- **Slice by query type** — aggregates hide category regressions.
- **Guardrails, especially abstention in both directions.**
- **One change at a time**, and pin the judge model version.
