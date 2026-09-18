# "How Did You Evaluate It?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 17**
>
> ⚠️ **An answer framework.** If evaluation was manual spot-checking, say so.
> "We reviewed answers by hand and here's the harness I'd build" is far more
> credible than invented metric numbers.

## 1. Definition

A question about whether quality was measured or assumed. It's the question most likely to separate someone who shipped a demo from someone who shipped a system.

## 2. Simple Explanation

Evaluation means having a fixed set of questions with known-correct answers, and being able to re-run them whenever anything changes.

Without it, every change is a guess and every regression is discovered by a user.

## 3. How It Works

```
THE TWO HALVES

RETRIEVAL          did the right chunk come back?
  recall@k, MRR — needs a golden set with the correct
  chunk labelled. Cheap, deterministic, repeatable.

GENERATION         was the answer right?
  groundedness, completeness, correctness — needs
  judgement, so either humans or an LLM judge.

Evaluating them separately is the point. A single
end-to-end score tells you something is wrong but not
which half.
```

## 4. Practical Example

**Building the golden set, which is the real work:**

```
SOURCE THE QUESTIONS from reality:
  · the existing FAQ and call-centre logs
  · what customers actually asked support
  NOT questions written by the person building the system,
  which unconsciously match how the documents are worded

LABEL, per question:
  · the chunk(s) that contain the answer
  · a reference answer including all conditions

COVER deliberately:
  · answerable questions
  · UNANSWERABLE ones — the system should abstain, and
    this is the half people skip
  · multi-hop questions needing two sections
  · near-miss pairs — similar wording, different products

100-200 well-labelled questions beats 1000 auto-generated
ones, because the labels are what make it useful.
```

**The metric set, and what each catches:**

```
RETRIEVAL
  recall@k     is the right chunk in the top k
  MRR          how high did it rank

GENERATION
  groundedness   is every claim supported by context
  completeness   are conditions and exceptions preserved
                 ← catches omission; the others don't
  correctness    does it match the reference answer
  abstention     did it refuse the unanswerable ones,
                 and only those

COMPLETENESS IS THE ONE PEOPLE MISS. An answer stating a
fee without its tier condition scores well on groundedness
and correctness and is still wrong.
```

**On LLM-as-judge, honestly:**

```
It's the practical option at scale, with real caveats:
  · it needs calibration against human labels before you
    trust it — agreement rate on a sample
  · it's biased toward longer answers and toward answers
    stylistically like its own
  · it's non-deterministic, so re-running gives different
    numbers

That last point sets your regression threshold: run the
same eval twice unchanged, measure the spread, and treat
anything inside that spread as noise. Without that, you
chase phantom regressions — and dismiss real ones.
```

## 5. Why It Matters

- **Evaluate retrieval and generation separately** — one score can't localize.
- **Completeness catches omission**; groundedness and correctness don't.
- **Measure run-to-run variance** to set a meaningful regression threshold.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We tested it manually" and nothing else | Honest but incomplete without the plan |
| An invented accuracy percentage | The follow-up asks how it was measured |
| Only end-to-end scores | Can't tell retrieval from generation |
| No unanswerable questions | Abstention is untested |
| Questions written by the builder | They match the documents' wording |
| Trusting an LLM judge uncalibrated | Unknown agreement with humans |

**On production evaluation:** an offline golden set catches regressions in what you thought to test. Production signals catch what you didn't — thumbs-down rates, escalation-to-human rates, abstention rate, retrieval score distributions, and query clusters with no good match. That last one is the most useful: a cluster of questions the corpus doesn't answer is a content gap, and it's actionable in a way a score isn't.

**On maintenance:** a golden set decays. Policies change, and a reference answer stating last year's fee turns into a false failure. Regenerating reference answers when source documents change — and treating unexplained golden-set failures as possibly a documentation change rather than a code regression — is what keeps it trustworthy.

## 7. Interview Answer

> "[**Your actual practice.** Manual review is a fine starting answer if you follow it with the design.]
>
> "[**If it was manual**] Evaluation was manual — I reviewed answers against the source documents by hand, particularly for the high-traffic questions. That catches obvious failures and it doesn't catch regressions, which is the gap I'd close first.
>
> The structure I'd build, and the part I'd emphasize, is evaluating retrieval and generation separately. A single end-to-end score tells you something is wrong but not which half, and the fixes are completely different.
>
> Retrieval evaluation needs a golden set — real questions with the correct chunk labelled — and then recall at k and mean reciprocal rank. That's cheap, deterministic, and repeatable, so it runs on every change.
>
> The golden set is where the actual work is. The questions have to come from reality — the existing FAQ, call-centre logs, what customers actually asked — not from me, because questions I write unconsciously match how the documents are worded, and then the eval passes on phrasing that real users never use.
>
> And the coverage has to be deliberate: answerable questions, unanswerable ones where the system should abstain, multi-hop questions needing two sections, and near-miss pairs with similar wording but different products. The unanswerable half is the one people skip, and it's the only way abstention gets tested at all. A hundred to two hundred well-labelled questions beats a thousand generated ones, because the labels are what make it useful.
>
> For generation I'd score groundedness, completeness, correctness, and abstention behaviour. Completeness is the one I'd single out — an answer stating a fee without its tier condition scores well on groundedness and on correctness and is still wrong. It's the omission failure, and completeness is the only metric that catches it.
>
> On LLM-as-judge — it's the practical option at scale, and I'd be careful with it. It needs calibrating against human labels first, measuring agreement on a sample. It's biased toward longer answers and toward answers written in its own style. And it's non-deterministic, which sets the regression threshold: run the same evaluation twice unchanged, measure the spread, and treat anything inside that spread as noise. Without that number you chase phantom regressions and dismiss real ones.
>
> Then production signals, because an offline set only catches regressions in what you thought to test. Thumbs-down rate, escalation to human, abstention rate, retrieval score distributions, and clusters of queries with no good match. That last one is the most useful — a cluster of questions the corpus doesn't answer is a content gap, and that's actionable in a way a score isn't.
>
> One maintenance point: golden sets decay. When a policy changes, the reference answer stating last year's fee becomes a false failure. So an unexplained failure might be a documentation change rather than a code regression, and reference answers need regenerating when sources change."

## 8. Likely Follow-ups

**Q: Where do the golden-set questions come from?**
Real sources — the existing FAQ, call-centre logs, support tickets. Questions written by the person building the system unconsciously match the documents' wording, so the eval passes on phrasing real users never use.

**Q: Which metric catches the most important failure?**
Completeness. Omission — a fee stated without its tier condition — passes groundedness and correctness, so completeness is the only one that flags it. It's also the failure most likely to generate a real complaint.

**Q: How big should the golden set be?**
100–200 well-labelled questions beats 1000 generated ones. The labels carry the value, and a set that's expensive to maintain stops being maintained — which is worse than a smaller one that stays current.

**Q: Can you trust an LLM judge?**
After calibrating it against human labels on a sample and knowing the agreement rate. It's biased toward length and toward its own style, and it's non-deterministic — so you also need the run-to-run spread to know what counts as a real change.

**Q: What do you monitor in production?**
Thumbs-down and escalation rates, abstention rate, retrieval score distributions, and query clusters with no good match. The last one identifies content gaps, which is the most directly actionable signal available.

## 9. Common Mistakes

- Quoting an accuracy figure that wasn't measured.
- Only end-to-end evaluation, so failures can't be localized.
- No unanswerable questions, so abstention is untested.
- Writing the golden set questions yourself.
- No regression threshold derived from run-to-run variance.

## 10. What to Remember

- **Evaluate retrieval and generation separately.**
- **Golden-set questions come from real users**, not from you.
- **Include unanswerable questions** — abstention needs testing.
- **Completeness is the metric that catches omission.**
- **Run-to-run variance sets the regression threshold.**
