# Fairness

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 03**

## 1. Definition

Whether the system serves all groups of users equally well. In a RAG system this is mostly a question of measured service quality per segment, not of a model making biased predictions about people.

## 2. Simple Explanation

A credit-scoring model can be unfair by giving different outcomes to similar applicants. A RAG assistant doesn't make decisions about people — so its fairness problem is different.

Its fairness problem is that it might answer worse for some customers than others, and an aggregate accuracy number hides that completely.

## 3. How It Works

**Where unequal service comes from in a RAG system:**

```
LANGUAGE          retrieval and generation quality vary by
                  language; non-English often worse
TOKENIZATION      non-Latin scripts cost 2-3× more tokens →
                  less content fits, higher cost per user
PHRASING          formal queries match formal documents;
                  colloquial or non-native phrasing retrieves
                  worse
CORPUS COVERAGE   products used by one segment may be
                  documented less thoroughly
SPEECH INPUT      transcription accuracy varies by accent
ASSUMED CONTEXT   answers presuming knowledge some customers
                  don't have
```

**None of these are model bias in the classical sense.** They're retrieval and coverage gaps that happen to fall unevenly.

## 4. Practical Example

**The measurement that makes it visible:**

```
Aggregate answer correctness: 0.89 — looks fine.

Broken down:
  English, formal phrasing        0.94
  English, colloquial phrasing    0.86
  Spanish                         0.79
  Hindi                           0.71

The aggregate hid a 23-point gap. And the affected group is
a real population of customers getting materially worse
service from the same system.

You cannot find this without segmenting the evaluation —
which means the golden set needs per-segment cases, in
realistic proportions, labelled by segment.
```

**That's the substantive point:** fairness in RAG is primarily a measurement discipline. The failure is almost always invisible rather than absent.

**What to do about a gap once found:**

```
LANGUAGE GAP       verify the embedding model is genuinely
                   cross-lingual, not just multilingual; add
                   BM25 for exact product names; consider
                   per-language evaluation of the retrieval
                   threshold, since score scales differ

PHRASING GAP       query rewriting normalizes colloquial
                   phrasing toward corpus vocabulary — one of
                   the highest-value fixes

COVERAGE GAP       a content problem, not a model problem.
                   Cluster failing queries and hand the gaps
                   to the team that owns the documentation.

THRESHOLD EFFECTS  a single relevance floor calibrated on
                   English will over-abstain for other
                   languages, denying service rather than
                   answering badly — which is quieter and
                   still unequal
```

**That last one is worth dwelling on:** over-abstention looks like safe behaviour. If it falls disproportionately on one language group, it's unequal service wearing the appearance of caution.

## 5. Why It Matters

- **Aggregate metrics hide unequal service** — the failure is invisible, not absent.
- **Fairness in RAG is a measurement discipline** before it's a modelling one.
- **Over-abstention on one segment** is unequal service disguised as caution.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Aggregate-only evaluation** | Per-segment gaps invisible |
| **Golden set from one segment** | Gaps can't appear |
| **One threshold across languages** | Over-abstention for some groups |
| **Tokenization cost disparity** | Higher cost and less context per user |
| **Coverage gaps read as model failure** | Wrong fix applied |
| **Accent variation in speech input** | Unequal transcription quality |

**On what fairness isn't here:** a RAG assistant answering policy questions isn't making decisions about individuals, so the classical fairness metrics — demographic parity, equalized odds — don't apply directly. Reaching for them signals the wrong mental model. The applicable question is service quality parity, measured per segment.

**On the segments to measure:** language first, since it's the largest and most measurable axis. Then query phrasing style, then product area as a proxy for customer segment. Avoid segmenting on protected characteristics you don't otherwise hold — the goal is finding service gaps, not building demographic profiles of customers.

## 7. Interview Answer

> "A credit-scoring model can be unfair by giving different outcomes to similar applicants. A RAG assistant doesn't make decisions about people, so its fairness problem is different — it's whether it answers worse for some customers than others.
>
> And the failure is almost always invisible rather than absent. An aggregate answer-correctness of 0.89 looks fine. Broken down it might be 0.94 for English formal phrasing, 0.86 for English colloquial, 0.79 for Spanish, and 0.71 for Hindi. That's a twenty-three point gap affecting a real population of customers, completely hidden by the aggregate.
>
> So fairness in RAG is primarily a measurement discipline. You can't find that gap without segmenting the evaluation, which means the golden set needs per-segment cases in realistic proportions, labelled by segment. If the golden set is all English formal queries, the gap literally cannot appear.
>
> On causes, none of these are model bias in the classical sense. They're retrieval and coverage gaps that fall unevenly — cross-lingual retrieval quality varying by language, tokenization costing two to three times more for non-Latin scripts so less content fits and cost per user is higher, colloquial phrasing retrieving worse than formal phrasing that matches the documents, products used by one segment being documented less thoroughly, and accent variation in speech input.
>
> The fixes differ by cause. A language gap means verifying the embedding model is genuinely cross-lingual rather than just multilingual, and adding BM25 for exact product names. A phrasing gap is fixed by query rewriting that normalizes toward corpus vocabulary — that's one of the highest-value fixes. A coverage gap is a content problem, not a model problem, so I'd cluster the failing queries and hand the gaps to the team owning the documentation.
>
> The one I'd dwell on is thresholds. A single relevance floor calibrated on English will over-abstain for other languages, because score distributions differ. That looks like safe behaviour — the system declining to answer rather than answering badly. But if it falls disproportionately on one language group, it's unequal service wearing the appearance of caution, and nobody flags it because abstention reads as the system being careful.
>
> One thing I'd avoid: reaching for demographic parity or equalized odds. Those apply to systems making decisions about individuals, and using them here signals the wrong mental model. The applicable question is service quality parity, measured per segment — and I'd segment on language and phrasing style rather than protected characteristics, because the goal is finding service gaps, not building demographic profiles of customers."

## 8. Likely Follow-ups

**Q: How is fairness different in a RAG system?**
It doesn't make decisions about people, so classical fairness metrics like demographic parity don't apply. The question is service quality parity — whether it answers as well for some groups as others — which is a measurement problem before it's a modelling one.

**Q: How do you detect unequal service?**
By segmenting the evaluation. An aggregate score hides a twenty-point gap between languages entirely, so the golden set needs per-segment cases in realistic proportions, labelled by segment. If the set is all one segment, the gap can't appear no matter how carefully you measure.

**Q: What causes the gaps?**
Cross-lingual retrieval quality, tokenization cost disparities, colloquial versus formal phrasing, uneven corpus coverage across products, and accent variation in speech input. None are model bias in the classical sense — they're retrieval and coverage gaps falling unevenly.

**Q: Why is over-abstention a fairness problem?**
Because a single relevance threshold calibrated on English over-abstains for other languages, and that reads as the system being careful rather than as a failure. If the declining falls disproportionately on one group, it's unequal service disguised as caution, and nobody flags it.

**Q: Which segments would you measure?**
Language first, as the largest and most measurable axis, then query phrasing style, then product area. I'd avoid segmenting on protected characteristics the system doesn't otherwise hold — the goal is finding service gaps, not building demographic profiles of customers.

## 9. Common Mistakes

- Reporting only aggregate quality metrics.
- Building the golden set from one language or phrasing style.
- Using one relevance threshold across all languages.
- Applying demographic parity metrics to a system that doesn't decide about people.
- Treating a coverage gap as a model problem.

## 10. What to Remember

- **Service quality parity**, not classical fairness metrics — it doesn't decide about people.
- **Aggregate scores hide the gap** — segment the evaluation or it's invisible.
- **Causes are retrieval and coverage**, falling unevenly.
- **Query rewriting** is the highest-value fix for phrasing gaps.
- **Over-abstention on one group** is unequal service disguised as caution.
