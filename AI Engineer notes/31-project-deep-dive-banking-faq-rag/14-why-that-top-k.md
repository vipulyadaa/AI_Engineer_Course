# "Why That Top-K?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 14**
>
> ⚠️ **An answer framework.** "It was a default and I'd measure it" is
> credible. The reasoning about what k trades off is what's being assessed.

## 1. Definition

A question about how many chunks were retrieved and why. The insight being looked for is that k trades recall against precision, and that raising it isn't free.

## 2. Simple Explanation

Too few chunks and the answer isn't in the context. Too many and the right chunk is buried among irrelevant ones — which makes the model's job harder, not easier.

More context is not reliably better context.

## 3. How It Works

```
WHAT k TRADES OFF

k TOO LOW
  · the answer isn't retrieved at all
  · a question needing two sections gets one

k TOO HIGH
  · irrelevant chunks dilute the context
  · the model has to pick, and sometimes picks wrong
  · cost and latency rise linearly
  · lost-in-the-middle: content in the middle of a long
    context gets less attention than the ends

THE ASYMMETRY
  a missing chunk is unrecoverable
  an extra irrelevant chunk is usually survivable
  → which is why retrieve-wide-then-rerank exists
```

## 4. Practical Example

**Why "just raise k" fails:**

```
k=5  → the fee schedule chunk plus 4 near-misses
k=20 → the fee schedule chunk plus 19 near-misses

Recall went up. Precision went down. And the model now has
19 plausible-looking policy chunks to choose from, several
mentioning fees for other products.

The failure this produces: an answer citing the wrong
product's fee. It's grounded, it's cited, and it's wrong —
which means groundedness evaluation won't catch it.
```

**The pattern that resolves the trade-off:**

```
RETRIEVE WIDE, RERANK, PASS FEW

  retrieve k=50  → maximize recall; the answer is in there
  rerank         → cross-encoder scores query+chunk jointly
  pass top 5     → maximize precision into the prompt

Two different k values for two different purposes. That's
the answer to "why not just raise k" — you raise retrieval
k and lower generation k.

Without a reranker, one k has to serve both jobs, which is
why a lone k is usually a compromise rather than a choice.
```

**How to choose it, if you measured:**

```
On a golden set, plot recall@k as k rises.

It climbs steeply, then flattens. The elbow is where
additional chunks stop containing new answers — that's
your retrieval k.

Generation k is separately bounded by how many chunks a
reranked list needs before the marginal chunk is noise.
```

**On dynamic k:** a fixed k means a simple question gets five chunks it doesn't need, and a comparison question spanning three products gets five when it needs six. Selecting by score threshold — take everything above the relevance floor, capped — adapts to the query, and it composes with abstention: if nothing clears the floor, k is zero and the system says so.

## 5. Why It Matters

- **More context isn't better context** — irrelevant chunks cause wrong-but-grounded answers.
- **Two k values**: wide for retrieval, narrow for generation, with a reranker between.
- **Score thresholds beat a fixed k** and compose with abstention.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "5, it's the default" | True, with no reasoning |
| "More context is always better" | Ignores dilution and lost-in-the-middle |
| One k for retrieval and generation | A compromise, not a choice |
| No mention of cost/latency | k scales input tokens linearly |
| Fixed k for every query type | Simple and complex questions differ |

**On cost and latency:** k directly multiplies input tokens, and input tokens drive both cost and time-to-first-token. Going from 5 to 20 chunks roughly quadruples the retrieved-context portion of every request. At low volume that's invisible; at scale it's one of the larger cost lines, and it's the easiest one to have set carelessly.

**On lost-in-the-middle:** models attend less reliably to content in the middle of a long context than at the beginning or end. With a large k the most relevant chunk can land in the weak zone. Ordering reranked results so the highest-scoring chunks sit at the start of the context — or at both ends — is a cheap mitigation and worth knowing about.

## 7. Interview Answer

> "[**Your value, honestly.** The trade-off reasoning is the substance.]
>
> "It was [**your k**], and it started as a default rather than a measured choice.
>
> What k actually trades off: too low and the answer simply isn't in the context — a question that needs two sections gets one. Too high and the right chunk is buried among irrelevant ones, which makes the model's job harder rather than easier.
>
> The failure from too high a k is the one worth naming. At k equals twenty you get the right chunk plus nineteen near-misses, several of them fee tables for other products. The model has to choose, and sometimes it chooses wrong — producing an answer that's grounded in a retrieved chunk, correctly cited, and about the wrong product. Groundedness evaluation won't catch that, because the answer does faithfully reflect a chunk it was given.
>
> So 'just raise k' doesn't work. The pattern that resolves it is two different k values: retrieve wide — say fifty — to maximize the chance the answer is in the candidate set, rerank with a cross-encoder that scores query and chunk jointly, then pass only the top five into the prompt. Wide for recall, narrow for precision. Without a reranker, one k has to serve both jobs, which is why a single k is usually a compromise.
>
> How I'd choose it properly: on a golden set, plot recall at k as k rises. It climbs steeply then flattens, and the elbow is where additional chunks stop containing new answers. That's the retrieval k. Generation k is separate — it's bounded by how far down a reranked list you go before the marginal chunk is just noise.
>
> Two things I'd add. k multiplies input tokens directly, so it drives both cost and time-to-first-token — going from five to twenty roughly quadruples the retrieved-context portion of every request, which at scale is a significant cost line and an easy one to have set carelessly.
>
> And there's the lost-in-the-middle effect: models attend less reliably to content in the middle of a long context than at either end. With a large k the most relevant chunk can land in the weak zone, so ordering reranked results with the strongest at the start is a cheap mitigation.
>
> If I were improving it, I'd move from a fixed k to a score threshold — take everything above a calibrated relevance floor, capped at a maximum. That adapts to the query, and it composes with abstention: if nothing clears the floor, k is zero and the system says it doesn't have the answer."

## 8. Likely Follow-ups

**Q: Why not just retrieve more?**
Because irrelevant chunks dilute the context and the model can pick the wrong one — producing an answer that's grounded and cited and about the wrong product, which groundedness evaluation won't flag. It also raises cost and latency linearly.

**Q: How would you choose k properly?**
Plot recall@k on a golden set as k rises; it climbs then flattens, and the elbow is where extra chunks stop containing new answers. Generation k is a separate question about how far down a reranked list is still useful.

**Q: Should retrieval k and generation k be the same?**
No, if there's a reranker. Retrieve wide for recall, rerank, pass few for precision. A single k has to compromise between the two jobs — that's the main argument for having a reranker at all.

**Q: Would a dynamic k be better?**
Usually. A fixed k gives a simple question chunks it doesn't need and a multi-product comparison fewer than it needs. A calibrated score threshold with a cap adapts, and it composes with abstention when nothing clears the floor.

**Q: What's the cost impact?**
Linear in input tokens, which drives both spend and time-to-first-token. Five to twenty chunks roughly quadruples the retrieved-context portion of every request — invisible at low volume, a major line at scale.

## 9. Common Mistakes

- Quoting a default with no trade-off reasoning.
- Claiming more context is always better.
- Using one k for both retrieval and generation when a reranker exists.
- Ignoring the cost and latency impact.
- Not knowing about lost-in-the-middle.

## 10. What to Remember

- **k trades recall against precision** — both directions have real failures.
- **Too-high k produces grounded, cited, wrong-product answers.**
- **Retrieve wide, rerank, pass few** — two k values, two purposes.
- **The elbow in recall@k** is the choosing method.
- **A score threshold beats a fixed k** and enables abstention.
