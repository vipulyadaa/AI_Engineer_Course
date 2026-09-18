# "How Did Retrieval Work?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 09**
>
> ⚠️ **An answer framework.** Describe your actual retrieval path, including
> what it didn't have. Dense-only retrieval with no reranking is a normal
> starting point and describing it honestly is fine.

## 1. Definition

A question about the query path — how a question becomes a set of chunks. It's where most RAG quality problems live, so the depth of the answer matters.

## 2. Simple Explanation

Embed the query, search the index, return the top k. That's the minimum.

Everything interesting is what surrounds it: whether the query was rewritten, whether lexical search ran alongside, whether results were reranked, and what happened when nothing good came back.

## 3. How It Works

```
THE FULL PATH

1. REWRITE     resolve follow-ups into standalone queries
2. EMBED       with the query task type
3. FILTER      permissions, effective dates — in the engine
4. SEARCH      dense, and BM25 in parallel
5. FUSE        reciprocal rank fusion
6. RERANK      cross-encoder over the candidates
7. THRESHOLD   below the floor → abstain
8. ASSEMBLE    numbered, with sources and dates
```

**Steps 1, 5, 6, and 7 are the ones that separate a working system from a minimal one** — and any of them being absent is a legitimate thing to say.

## 4. Practical Example

**Query rewriting, which matters most for multi-turn:**

```
Turn 1: "What's the international transfer fee?"
Turn 2: "And for Premier?"

"And for Premier?" embedded as-is has almost no retrievable
signal — the embedding is nearly meaningless.

Rewritten to "international transfer fee for Premier tier
customers" it retrieves correctly.

That single step matters more for multi-turn quality than
anything else in the pipeline, and it's easy to omit
because the first turn works fine.
```

**Hybrid retrieval, and why it's not optional in banking:**

```
"What's the fee under clause 7.3(b)?"

"7.3(b)" carries almost no semantic signal. Dense retrieval
can miss it entirely while BM25 ranks it first.

Clause references, SWIFT codes, product names, error codes,
and form IDs are a large share of real banking queries —
which makes hybrid the default here rather than an
enhancement.

And the security note: BOTH branches need the same
permission filter. Applying it to the dense retriever and
not the lexical one turns hybrid search into an
authorization bypass, and it's an easy regression because
they're configured separately.
```

**The threshold, and what it's for:**

```
The threshold exists to enable abstention. If the top score
is below a calibrated floor, the system says it doesn't
have that information rather than generating from weak
context.

And calibrated means derived from labelled score
distributions for this model and corpus — a value copied
from elsewhere is a guess, because score scales differ
completely between embedding models.
```

## 5. Why It Matters

- **Query rewriting** is the largest lever on multi-turn quality and easily omitted.
- **Hybrid is the default in banking** — exact identifiers dominate real queries.
- **Both retrieval branches need the same filter**, or hybrid becomes a bypass.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We embedded the query and took top-5" | The minimum, with no reasoning |
| No query rewriting | Follow-ups retrieve almost nothing |
| Dense-only in a corpus of identifiers | Misses the queries that matter |
| Filter on one branch only | An authorization bypass |
| Uncalibrated threshold | Abstention fires wrongly in both directions |
| No abstention path at all | Answers from weak context by design |

**On reranking:** if there wasn't one, say so — and say what it would have added. A cross-encoder scores query and chunk jointly rather than comparing independent embeddings, which typically gives the largest single precision gain in a RAG pipeline. Knowing that and not having had one is a perfectly good answer; claiming one you didn't configure invites questions about candidate counts and recall measurement.

**On top-k:** the honest answer about how it was chosen is usually "we started with a default." The strong version is measuring recall at several values and picking where quality stops improving. Saying "we used 5 and I'd measure that properly now" is credible where an invented measurement isn't.

## 7. Interview Answer

> "[**Your path.** Describe what you had, and name what you didn't.]
>
> "The query path was: rewrite the query if it was a follow-up, embed it with the query task type, search the index with filters applied, and return the top k for assembly into context.
>
> [**On rewriting**] Query rewriting mattered more than I expected. A follow-up like 'and for Premier?' embedded as-is has almost no retrievable signal — the embedding is nearly meaningless on its own. Rewritten to 'international transfer fee for Premier tier customers' it retrieves correctly. That single step drives multi-turn quality more than anything else in the pipeline, and it's easy to omit because the first turn always works fine.
>
> [**On hybrid, if you had it — or as what you'd add**] Hybrid retrieval running BM25 alongside dense search, fused with reciprocal rank fusion. The reason it's the default in banking rather than an enhancement: a query like 'what's the fee under clause 7.3(b)' — that string carries almost no semantic signal, so dense retrieval can miss it entirely while BM25 ranks it first. Clause references, SWIFT codes, product names, and form IDs are a large share of real banking queries.
>
> And a security note on hybrid: both branches need the same permission filter. Applying it to the dense retriever and not the lexical one turns hybrid search into an authorization bypass, and it's an easy regression because the two retrievers are configured separately. So the filter construction should live in one place with a test covering both.
>
> [**On the threshold**] There was a relevance threshold, and its purpose was abstention — if the top score fell below the floor, the system said it didn't have that information rather than generating from weak context. Calibrating it means deriving it from labelled score distributions for this model and corpus; a value copied from elsewhere is a guess, because score scales differ completely between embedding models.
>
> [**Name what you didn't have.**] There was no reranking, so retrieval precision depended entirely on the embedding model. A cross-encoder would have scored query and chunk jointly rather than comparing independent embeddings, which is typically the largest single precision gain available — that's the first thing I'd add.
>
> [**On top-k, be honest.**] We used [**your value**], chosen as a starting point. The proper approach is measuring recall at several values on a golden set and taking the point where quality stops improving, and I'd do that now."

## 8. Likely Follow-ups

**Q: How did you handle follow-up questions?**
Query rewriting into a standalone query. "And for Premier?" has almost no retrievable signal embedded as-is, so it has to carry the topic and qualifiers forward. That single step drives multi-turn quality more than anything else in the pipeline.

**Q: Did you use hybrid retrieval?**
[**Honest answer.**] And the reason it matters in banking: clause references, SWIFT codes, and product names carry almost no semantic signal, so dense retrieval misses them while BM25 ranks them first. That's a large share of real queries, making hybrid the default rather than an enhancement.

**Q: What's the risk with hybrid search?**
Filter inconsistency. The two retrievers are configured separately, so the permission filter gets applied to one and not the other — which makes hybrid search an authorization bypass. Shared filter construction with a test covering both branches is the fix.

**Q: How was the threshold set?**
[**Honest answer.**] Properly it's derived from labelled score distributions — sample queries, label the top results relevant or not, plot both distributions, and pick the point with an acceptable false-negative rate. Score scales differ per model, so a borrowed value is a guess.

**Q: Was there reranking?**
[**Honest answer.**] If not, saying what it would add — a cross-encoder scores query and chunk jointly rather than comparing independent embeddings, which is typically the largest precision gain available — is a good answer. Claiming one you didn't configure invites questions about candidate counts.

## 9. Common Mistakes

- Describing only embed-and-search with no surrounding steps.
- No query rewriting for follow-ups.
- Dense-only retrieval in a corpus full of identifiers.
- Permission filter on one hybrid branch only.
- A threshold copied from elsewhere rather than calibrated.

## 10. What to Remember

- **Query rewriting** is the largest multi-turn lever and easily omitted.
- **Hybrid is the default in banking** — identifiers carry no semantic signal.
- **Both branches need the same filter**, or it's an authorization bypass.
- **The threshold exists to enable abstention** and must be calibrated.
- **Name what you didn't have** — reranking absent is a fine answer.
