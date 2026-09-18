# Design: AI Research Assistant

> **Phase 28 · AI SYSTEM DESIGN · Topic 08**

## 1. Definition

A system that answers open-ended questions requiring synthesis across many sources — where the output is a researched summary with citations rather than a single retrieved fact.

## 2. Simple Explanation

A FAQ assistant finds the answer. A research assistant builds one from pieces.

That changes the design: retrieval breadth matters more than precision, synthesis quality becomes the hard part, and the honest handling of disagreement between sources becomes a core requirement rather than an edge case.

## 3. How It Works

```
PLAN        decompose the question into research sub-questions
GATHER      broad retrieval per sub-question, in parallel
ASSESS      per source: relevance, recency, authority
SYNTHESIZE  combine, attributing each claim
CONFLICT    where sources disagree, present both with
            attribution — do not silently resolve
OUTPUT      structured summary with per-claim citations
```

**Conflict handling is what distinguishes this from summarization.** A research assistant that silently picks one of two disagreeing sources has produced a confident answer that hides the most useful information.

## 4. Practical Example

**Retrieval breadth over precision:**

```
A FAQ system retrieves top-5 precisely.
A research assistant needs coverage — 30-50 candidates
across sub-questions, then reranked and filtered.

Because the failure mode differs:
  FAQ            → wrong answer from a wrong chunk
  RESEARCH       → incomplete synthesis because a relevant
                   source was never surfaced

Missing a source produces a plausible, well-written, and
partial answer — which is harder to detect than a wrong one.
```

**Source assessment, which the design needs and FAQ systems don't:**

```
Not all sources deserve equal weight:

  RECENCY    a 2019 analysis vs a 2025 one
  AUTHORITY  official policy vs an internal opinion piece
  SCOPE      does it actually address the sub-question, or
             is it adjacent

Surfacing these in the output — "per the 2025 market
review" versus "per a 2019 internal note" — lets the reader
weigh the claim themselves, which is what a researcher
needs and a FAQ user doesn't.
```

**Conflict presentation:**

```
SILENT RESOLUTION (wrong)
  "The fee increase is expected to be 3%."

HONEST (right)
  "Estimates differ: the 2025 pricing review projects 3%
   [source A], while the risk committee paper assumes 5%
   [source B]. The difference appears to stem from
   different assumptions about volume."

The second is more useful AND more honest. In a research
context, surfacing disagreement is the value — collapsing
it to a single number destroys exactly what the user
needed.
```

**Bounding the work:** research questions have no natural stopping point, so budget by sub-question count, retrieval rounds, and total tokens — and report what wasn't covered. A summary that silently omits an unexplored angle reads as complete.

## 5. Why It Matters

- **Breadth over precision** — the failure is incompleteness, not wrongness.
- **Conflict surfacing is the value**, not a problem to resolve away.
- **Source authority and recency in the output** let the reader weigh claims.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Precision-tuned retrieval** | Incomplete synthesis from missed sources |
| **Silent conflict resolution** | Destroys the most useful information |
| **No source assessment** | A 2019 note weighted like current policy |
| **Unbounded research** | No natural stopping point |
| **Omissions unreported** | Partial summary reads as complete |
| **Per-claim citation missing** | Synthesis can't be verified |

**On per-claim citation:** a synthesized paragraph drawing on four sources needs claim-level attribution, not a source list at the end. A reader checking one assertion shouldn't have to search four documents to find which one supports it — and a citation block at the bottom makes the synthesis unverifiable in practice even though it looks cited.

**On the honest limit:** a research assistant synthesizes what it retrieved. It cannot tell you what the corpus doesn't contain, and a confident well-written summary of an incomplete search is indistinguishable from a complete one. Stating coverage explicitly — which sub-questions were addressed and which weren't — is the only mitigation, and it should be part of the output rather than a caveat.

## 7. Interview Answer

> "A FAQ assistant finds the answer; a research assistant builds one from pieces. That changes three things: retrieval breadth matters more than precision, synthesis quality becomes the hard part, and handling disagreement between sources becomes a core requirement rather than an edge case.
>
> The pipeline is: decompose the question into research sub-questions, retrieve broadly per sub-question in parallel, assess each source for relevance, recency, and authority, synthesize with per-claim attribution, surface conflicts explicitly, and output a structured summary.
>
> On breadth — a FAQ system retrieves top-five precisely; this needs thirty to fifty candidates across sub-questions, then reranked. Because the failure mode is different. A FAQ system fails by giving a wrong answer from a wrong chunk. A research assistant fails by producing an incomplete synthesis because a relevant source was never surfaced — and that's a plausible, well-written, partial answer, which is much harder to detect than a wrong one.
>
> Source assessment is something FAQ systems don't need and this does. A 2019 analysis and a 2025 one deserve different weight; official policy and an internal opinion piece deserve different weight. And I'd surface that in the output — 'per the 2025 pricing review' versus 'per a 2019 internal note' — so the reader can weigh the claim themselves. That's what a researcher needs and a FAQ user doesn't.
>
> The part I'd emphasize is conflict handling. If two sources disagree, saying 'the fee increase is expected to be three percent' is a confident answer that hides the most useful information. The honest version presents both with attribution and, where possible, why they differ. In a research context surfacing disagreement is the value — collapsing it to a single number destroys exactly what the user came for.
>
> On per-claim citation: a synthesized paragraph drawing on four sources needs claim-level attribution, not a source list at the end. A reader checking one assertion shouldn't have to search four documents to find which supports it. A citation block at the bottom looks cited and makes the synthesis unverifiable in practice.
>
> Two things on bounding. Research questions have no natural stopping point, so I'd budget by sub-question count, retrieval rounds, and total tokens — and report what wasn't covered.
>
> And the honest limit: it synthesizes what it retrieved. It cannot tell you what the corpus doesn't contain, and a confident well-written summary of an incomplete search is indistinguishable from a complete one. Stating coverage explicitly — which sub-questions were addressed and which weren't — is the only mitigation, and it belongs in the output rather than as a caveat somewhere."

## 8. Likely Follow-ups

**Q: How does this differ from a FAQ assistant?**
Retrieval breadth over precision, synthesis rather than extraction, and conflict handling as a core requirement. The failure mode also differs — incompleteness rather than wrongness, which is harder to detect because a partial answer reads as complete.

**Q: How should source conflicts be handled?**
Presented with attribution, not silently resolved. If two sources give different figures, saying one number hides the most useful information. In a research context, surfacing the disagreement and why it exists is the value the user came for.

**Q: Why does per-claim citation matter more here?**
Because a synthesized paragraph draws on several sources, so a citation list at the end makes it unverifiable in practice — a reader checking one assertion would have to search four documents. Claim-level attribution is what makes synthesis checkable.

**Q: How do you bound the work?**
By sub-question count, retrieval rounds, and total tokens, since research questions have no natural stopping point. And critically, report what wasn't covered — a summary that silently omits an unexplored angle reads as complete.

**Q: What's the honest limit?**
It synthesizes what it retrieved and can't tell you what the corpus lacks. A confident summary of an incomplete search is indistinguishable from a complete one, so stating which sub-questions were addressed and which weren't is the only real mitigation.

## 9. Common Mistakes

- Tuning retrieval for precision rather than coverage.
- Silently resolving conflicts between sources.
- No recency or authority weighting.
- Citations as a list at the end rather than per claim.
- Not reporting what the research didn't cover.

## 10. What to Remember

- **Breadth over precision** — the failure is incompleteness.
- **Surface conflicts with attribution** — that's the value, not a problem.
- **Recency and authority in the output**, so the reader can weigh claims.
- **Per-claim citation**, not a list at the end.
- **Report coverage gaps** — a partial summary reads as complete.
