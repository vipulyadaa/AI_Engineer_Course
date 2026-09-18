# "How Would You Perform Regression Testing?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 28**

## 1. Definition

A design question about testing a non-deterministic system. The central problem is that the output changes between identical runs, so "did it change?" is the wrong question — the right one is "did it change more than it normally does?"

## 2. Simple Explanation

You can't assert that an LLM produces an expected string. Run it twice and you get two different sentences that both mean the same thing.

So the test suite has to be layered: deterministic assertions where they're possible, statistical comparison where they aren't.

## 3. How It Works

```
THE LAYERS, FROM DETERMINISTIC TO STATISTICAL

1. UNIT — fully deterministic
   chunking produces expected boundaries
   metadata filters build correctly
   permission filters applied to BOTH retrieval branches
   citation IDs validated against the retrieved set
   → these are ordinary tests and they catch a lot

2. RETRIEVAL — deterministic given a fixed index
   recall@k and MRR on the golden set
   same input, same output — assertable with thresholds

3. GENERATION — statistical
   groundedness, completeness, correctness sampled
   compare distributions, not strings

4. BEHAVIOURAL — assertable on properties
   abstains on unanswerable questions
   refuses to give financial advice
   never emits a URL absent from the corpus
   → these ARE deterministic, because they assert a
     property rather than a text
```

**Layer 4 is underused.** Many important guarantees are properties, and properties can be asserted even when text can't.

## 4. Practical Example

**The noise floor, which has to be established first:**

```
Run the identical evaluation twice with no changes.

  run 1: groundedness 0.94
  run 2: groundedness 0.91

That 0.03 is the noise floor. Any single change producing
a smaller difference tells you nothing.

Without this number:
  · you chase phantom regressions
  · and you dismiss real ones as noise
  · and you can't tell which you're doing

Establishing the noise floor is the first thing to do and
the thing most often skipped. It also has to be
re-established when the judge model or the eval set
changes.
```

**What has to be pinned for a comparison to mean anything:**

```
PIN         model version, prompt version, embedding
            model version, index snapshot, golden set
            version, judge model version

If any of those moves between runs, a difference is
uninterpretable — you can't attribute it.

The specific trap: the provider updates a model behind an
alias and your numbers move with no change on your side.
Pinned versions make that visible instead of mysterious.
```

**Per-category, not aggregate:**

```
Overall groundedness 0.94 → 0.93 looks like noise.

Broken out:
  fee questions       0.96 → 0.71   ← a serious regression
  hours questions     0.93 → 0.99
  eligibility         0.94 → 0.94

The aggregate hid it. In a banking system the fee category
is precisely the one where a regression matters, and
averaging is what concealed it.

So: per-category thresholds, with tighter ones on the
high-consequence categories.
```

**What triggers a full run, and what a change actually requires:**

```
EVERY COMMIT      unit and behavioural tests — fast
EVERY PR          retrieval evaluation on the golden set
BEFORE RELEASE    full generation evaluation
NIGHTLY           full suite on the current index

AND — the one people don't build — a re-run triggered by
a CORPUS change, not just a code change. A policy document
update can change answers without a single line of code
moving, and no CI system watches for that by default.
```

## 5. Why It Matters

- **The noise floor comes first** — without it, no comparison is interpretable.
- **Per-category thresholds** — aggregates hide the regressions that matter.
- **Corpus changes need to trigger evaluation**, and usually don't.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Asserting exact output strings | Fails constantly, gets disabled |
| No noise floor established | Phantom regressions and missed real ones |
| Aggregate thresholds only | A category collapse hides in the average |
| Unpinned model versions | Differences can't be attributed |
| Only code changes trigger evaluation | Corpus regressions ship silently |
| Golden set never updated | Policy changes become false failures |

**On cost and duration:** a full generation evaluation is thousands of LLM calls and takes real time and money. Which is why the layering matters — fast deterministic tests on every commit, retrieval evaluation per PR, the expensive generation pass before release. Running everything on every commit means it gets turned off.

**On the golden set as a liability:** reference answers go stale when policies change, producing failures that look like regressions and aren't. The discipline is that a document update triggers a review of affected reference answers — otherwise the suite loses credibility and people start overriding it, which is worse than not having it.

## 7. Interview Answer

> "The central problem is that the system is non-deterministic, so 'did the output change?' is the wrong question. Run the same evaluation twice unchanged and the numbers differ. The right question is whether it changed more than it normally does.
>
> So the first thing I'd do is establish the noise floor: run the identical evaluation twice with no changes and measure the spread. If groundedness comes out at 0.94 and then 0.91, three points is noise. Any single change producing a smaller difference tells you nothing. Without that number you chase phantom regressions and dismiss real ones, and you can't tell which you're doing. It's the most-skipped step and it's the one everything else depends on.
>
> Then I'd layer the tests from deterministic to statistical.
>
> Unit tests are fully deterministic and they catch more than people expect: chunking produces the expected boundaries, metadata filters build correctly, the permission filter is applied to both the dense and lexical retrieval branches, citation IDs validate against the retrieved set. Those are ordinary tests and they run on every commit.
>
> Retrieval evaluation is deterministic given a fixed index — recall at k and MRR on the golden set, with assertable thresholds. That runs per PR.
>
> Generation evaluation is the statistical layer: groundedness, completeness, correctness, compared as distributions rather than strings, before release.
>
> And there's a fourth layer people underuse — behavioural tests, which are deterministic because they assert a property rather than a text. Does it abstain on unanswerable questions. Does it refuse to give financial advice. Does it ever emit a URL that wasn't in the corpus. Those are among the most important guarantees in the system and they're perfectly testable.
>
> Two things that make comparisons meaningful. Pin everything — model version, prompt version, embedding model, index snapshot, golden set version, and the judge model version. If any of those moves between runs the difference is uninterpretable. The specific trap is a provider updating a model behind an alias, so your numbers move with no change on your side.
>
> And thresholds per category, not aggregate. Overall groundedness dropping from 0.94 to 0.93 looks like noise. Broken out, fee questions might have gone from 0.96 to 0.71 while hours questions improved — and in a banking system the fee category is exactly where a regression matters. Averaging is what concealed it. So tighter thresholds on the high-consequence categories.
>
> The trigger I'd add that most teams don't have: evaluation on corpus change, not just code change. A policy document update can change answers without a line of code moving, and no CI system watches for that by default.
>
> And a maintenance point — the golden set is a liability as well as an asset. Reference answers go stale when policies change, producing failures that look like regressions and aren't. A document update has to trigger a review of the affected reference answers, or the suite loses credibility and people start overriding it. A suite that gets overridden is worse than no suite."

## 8. Likely Follow-ups

**Q: How do you test something non-deterministic?**
Establish the run-to-run variance first, then compare against that rather than against an expected string. Layer deterministic assertions — chunking, filters, citation validity, behavioural properties — underneath the statistical comparison.

**Q: What's the noise floor and why does it matter?**
The spread between two identical evaluation runs. Without it you can't tell a real regression from normal variance, so you either chase phantoms or dismiss real problems — and you don't know which.

**Q: Why per-category thresholds?**
Because an aggregate hides the failures that matter. Overall groundedness moving a point can conceal fee-question groundedness collapsing, and fees are the category where a regression causes actual harm.

**Q: What triggers a run?**
Unit and behavioural tests on every commit, retrieval evaluation per PR, full generation evaluation before release, and nightly. Plus the one people don't build: corpus changes, since a document update changes answers with no code change.

**Q: How do you keep the golden set honest?**
Treat a document update as a trigger to review affected reference answers. Otherwise stale references produce false failures, people start overriding the suite, and an overridden suite is worse than none.

## 9. Common Mistakes

- Asserting exact output text.
- Skipping the noise-floor measurement.
- Aggregate thresholds only.
- Unpinned model and prompt versions.
- Never re-running on corpus changes.

## 10. What to Remember

- **Measure run-to-run variance first** — it defines "regression".
- **Layer deterministic → statistical**; behavioural properties are assertable.
- **Per-category thresholds**, tighter on high-consequence ones.
- **Pin every version**, or differences can't be attributed.
- **Corpus changes must trigger evaluation** too.
