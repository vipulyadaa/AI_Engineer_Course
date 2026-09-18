# Prompt Regression

> **Phase 22 · AI EVALUATION · Topic 17**

## 1. Definition

Quality degradation caused by a change to a prompt, system instruction, or tool description — the most frequent source of behavioural change in a generative system and typically the least governed.

## 2. Simple Explanation

A prompt edit is a one-line change that can alter behaviour as much as swapping the model.

It ships as a config edit, often without review, without an evaluation run, and without a version recorded — which makes a subsequent quality drop very hard to attribute.

## 3. How It Works

```
WHY PROMPTS ARE FRAGILE

· instructions interact — adding one can weaken another
· order matters — later instructions can override earlier
· added constraints compete for attention
· wording changes shift behaviour non-linearly
· a fix for one case can regress ten others

None of that is visible from reading the diff, which is
exactly why it needs measuring rather than reviewing.
```

**The characteristic failure:** a prompt change made to fix one reported case, which quietly degrades the common path serving most traffic.

## 4. Practical Example

**The narrow-fix regression:**

```
A customer complains the assistant didn't mention the
waiver. Someone adds: "Always mention any applicable fee
waivers."

That case now passes. And:
  · waivers get mentioned where they don't apply
  · answers get longer, diluting the direct answer
  · the instruction competes with "be concise"
  · abstention weakens, because the model now feels
    obliged to say something about waivers

One reported case fixed; a broad, unmeasured degradation
introduced. And nobody connects the two, because the
complaint was resolved and the prompt change was trivial.
```

**The discipline that prevents it:**

```
1. PROMPTS IN VERSION CONTROL as named artifacts
2. A VERSION STRING recorded in every trace
3. AN EVALUATION RUN before merge — same gate as code
4. REVIEW by someone other than the author
5. A CHANGE LOG saying what each version was for

Point 3 is the one that matters. A prompt change without
an evaluation run is an untested deploy, whatever it looks
like in the diff.
```

**Tool descriptions are prompts too:**

```
A rewritten tool docstring changes selection accuracy as
much as a model swap. It reads like documentation, so it
gets edited freely — and selection accuracy is measurable
in minutes with a labelled query set.

Gating docstring changes on a tool-selection evaluation is
cheap and almost never done.
```

**Attribution requires the version in the trace:** without it, a quality drop noticed two weeks later can't be tied to a specific change, and you're comparing against a baseline that moved for reasons nobody recorded.

## 5. Why It Matters

- **The most frequent behavioural change** and the least governed.
- **Narrow fixes cause broad regressions** that nobody connects to the change.
- **Tool descriptions are prompts** and change selection as much as a model swap.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Prompts outside version control** | No record of what changed when |
| **No evaluation before merge** | An untested deploy |
| **Version not recorded in traces** | Regressions unattributable |
| **Fixing one case in isolation** | Broad quiet degradation |
| **Tool descriptions edited freely** | Selection accuracy shifts |
| **Instructions accumulating** | Later additions weaken earlier ones |

**On accumulation:** prompts grow as cases get fixed, and a long prompt with twenty competing instructions behaves worse than a short one with five. Periodically removing instructions and measuring whether quality drops is the discipline that keeps them maintainable — and it's the opposite of the instinct, which is that every instruction was added for a reason and removing it is risky.

**On the golden set's role:** a prompt change evaluated against the same golden set that motivated it will always look good. The set has to cover the common path too, in production proportions — otherwise a narrow fix scores well on the cases it was designed for while the regression on ordinary traffic goes unmeasured.

## 7. Interview Answer

> "A prompt edit is a one-line change that can alter behaviour as much as swapping the model — and it ships as a config edit, often without review, without an evaluation run, and without a version recorded. That combination makes it the most frequent source of behavioural change and the least governed.
>
> Prompts are fragile in ways that aren't visible from the diff. Instructions interact, so adding one can weaken another. Order matters. Added constraints compete for attention. And a fix for one case can regress ten others — which is the characteristic failure.
>
> Concretely: a customer complains the assistant didn't mention a fee waiver, so someone adds 'always mention any applicable fee waivers.' That case now passes. And waivers get mentioned where they don't apply, answers get longer and dilute the direct answer, the new instruction competes with 'be concise', and abstention weakens because the model now feels obliged to say something about waivers. One reported case fixed, a broad unmeasured degradation introduced — and nobody connects the two, because the complaint was resolved and the change was trivial.
>
> The discipline that prevents it: prompts in version control as named artifacts, a version string in every trace, an evaluation run before merge, review by someone other than the author, and a change log saying what each version was for. The evaluation run is the one that matters — a prompt change without one is an untested deploy, whatever it looks like in the diff.
>
> And the golden set has to cover the common path in production proportions. A prompt change evaluated only against the cases that motivated it will always look good; the regression on ordinary traffic is what goes unmeasured.
>
> Tool descriptions deserve calling out separately. A rewritten docstring changes selection accuracy as much as a model swap, but it reads like documentation so it gets edited freely. And selection accuracy is measurable in minutes with a labelled query set — so gating docstring changes on a tool-selection evaluation is cheap and almost never done.
>
> One discipline that runs against instinct: prompts accumulate. They grow as cases get fixed, and a long prompt with twenty competing instructions behaves worse than a short one with five. So I'd periodically remove instructions and measure whether quality actually drops. The instinct is that every instruction was added for a reason and removing it is risky — but most of them were added for a single case and never re-examined."

## 8. Likely Follow-ups

**Q: Why are prompt changes risky?**
Because instructions interact in ways the diff doesn't show — adding one can weaken another, order matters, and constraints compete for attention. A change that looks trivial can shift behaviour as much as a model swap, and it usually ships with less scrutiny than a code change.

**Q: What's the characteristic failure?**
A narrow fix causing a broad regression. Adding "always mention applicable waivers" to fix one complaint makes waivers appear where they don't apply, lengthens answers, competes with conciseness, and weakens abstention — and nobody connects the degradation to the fix.

**Q: What discipline prevents it?**
Prompts in version control as named artifacts, a version in every trace, an evaluation run before merge, review by someone other than the author, and a change log. The evaluation run is the essential one — without it, a prompt change is an untested deploy.

**Q: Why do tool descriptions need the same treatment?**
Because a docstring rewrite changes selection accuracy as much as a model swap, while reading like documentation and being edited freely. Selection accuracy is measurable in minutes with a labelled query set, so gating those changes is cheap and almost never done.

**Q: What runs against instinct here?**
Removing instructions. Prompts accumulate as cases get fixed, and a long prompt with twenty competing instructions behaves worse than a short one with five. Periodically deleting instructions and measuring whether quality drops is the discipline — most were added for one case and never re-examined.

## 9. Common Mistakes

- Prompts edited outside version control.
- No evaluation run before a prompt change merges.
- Prompt version not recorded in traces.
- Evaluating a fix only against the cases that motivated it.
- Editing tool docstrings without a selection evaluation.

## 10. What to Remember

- **Most frequent behavioural change, least governed.**
- **A narrow fix causes a broad regression** — and nobody connects them.
- **An evaluation run before merge** is what makes it a tested change.
- **Tool descriptions are prompts** — gate them on selection accuracy.
- **Remove instructions periodically** and measure; accumulation degrades quality.
