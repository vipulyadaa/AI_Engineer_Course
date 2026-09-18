# Query Expansion

> **Phase 09 · ADVANCED RAG · Topic 06**

## 1. Definition

Adding terms, synonyms, or related phrasings to a query to increase retrieval recall. Unlike [rewriting](05-query-rewriting.md), which replaces the query, expansion augments it — covering more of the vocabulary the answer might be written in.

## 2. Simple Explanation

A user asks about "overdraft charges." The document says "insufficient funds fee." Dense retrieval catches some of that gap, but not all, and BM25 catches none of it.

Expansion adds the likely alternative phrasings — "insufficient funds," "NSF fee," "negative balance charge" — so the retriever has more ways to match.

## 3. How It Works

**Three approaches:**

| Method | How | Cost |
|---|---|---|
| **Synonym/thesaurus** | Static domain vocabulary mapping | Free, needs curation |
| **LLM-generated** | Ask a model for alternative phrasings | One LLM call |
| **Pseudo-relevance feedback** | Retrieve once, extract frequent terms from top results, re-retrieve | Two retrievals, no LLM |

**LLM expansion in practice:**

```
Prompt: List 4 alternative phrasings or related terms a document
might use for this question. Output one per line, no explanation.

Query: "overdraft charges"

→ insufficient funds fee
  NSF fee
  negative balance charge
  overdraft protection cost
```

Then either search with the expanded term set (helps BM25 most) or run separate retrievals per phrasing and fuse (helps both, costs more).

**Expansion helps BM25 much more than dense retrieval**, because dense embeddings already capture some synonymy. That's worth knowing — in a hybrid system, expansion is mostly improving the sparse half.

## 4. Practical Example

**A domain synonym map is often better than LLM expansion** for a stable vocabulary:

```python
DOMAIN_SYNONYMS = {
    "overdraft":     ["insufficient funds", "NSF", "negative balance"],
    "wire":          ["wire transfer", "SWIFT", "telegraphic transfer"],
    "statement":     ["account statement", "e-statement"],
    "premier":       ["Premier account", "premium tier"],
}
```

Zero latency, fully predictable, and curated by someone who knows the domain. The LLM approach is better when the vocabulary is open-ended or you can't enumerate it.

**Pseudo-relevance feedback** — no LLM needed:

```
1. Retrieve top-10 for the original query
2. Extract the most distinctive terms from those results (high TF-IDF)
3. Add those terms to the query
4. Retrieve again

Assumes the top-10 are mostly relevant. If they aren't,
you've amplified the error — which is its main weakness.
```

## 5. Why It Matters

- **It targets a specific gap:** vocabulary mismatch between how users ask and how documents are written.
- **It's the main way to improve the BM25 half** of a hybrid system.
- **A curated domain synonym map is cheap, fast, and often better than the LLM version.**

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Query drift** | Expansion terms pull retrieval toward a different topic |
| **Precision loss** | More matching terms means more marginally-relevant results |
| **Latency** | LLM expansion adds a call; multi-query expansion multiplies retrievals |
| **Hallucinated terms** | LLM invents domain vocabulary that doesn't exist in the corpus |
| **PRF amplifies errors** | If the initial top-10 were wrong, expansion makes it worse |
| **Redundant with dense retrieval** | Dense embeddings already handle much synonymy |

**The redundancy point matters practically.** If you're already running hybrid retrieval with a good embedding model, expansion's marginal value is mostly on the BM25 side. Measure whether it helps before adding the latency — in some systems it adds cost for no recall gain.

## 7. Interview Answer

> "Query expansion adds terms, synonyms, or alternative phrasings to a query to increase recall. The difference from rewriting is that rewriting replaces the query to fix it, while expansion augments a well-formed query to cover more vocabulary.
>
> The gap it targets is vocabulary mismatch — a user asks about 'overdraft charges' and the document says 'insufficient funds fee.' Dense retrieval catches some of that because embeddings capture synonymy, but BM25 catches none of it. So expansion is mostly improving the sparse half of a hybrid system, and that's worth knowing before you decide whether it's worth the cost.
>
> Three approaches. A curated domain synonym map is zero latency, fully predictable, and for a stable vocabulary it's often better than the alternatives — someone who knows banking writes down that overdraft, NSF, and insufficient funds are the same concept. LLM-generated expansion is more flexible and handles open-ended vocabulary, at the cost of a call. Pseudo-relevance feedback retrieves once, pulls distinctive terms from the top results, and re-retrieves — no LLM, but it amplifies the error if those initial results were wrong.
>
> The risk is query drift — expansion terms pulling retrieval toward a related but different topic, which costs precision. And an LLM expander can hallucinate domain vocabulary that doesn't exist in the corpus at all.
>
> Practically I'd measure before adding it. In a system already running hybrid retrieval with a good embedding model, expansion sometimes adds latency for no recall gain, because the dense side was already covering the synonymy."

## 8. Likely Follow-ups

**Q: Expansion or rewriting — which do you need?**
Different problems. Rewriting fixes a malformed or context-dependent query — pronouns, ellipsis, conversational noise. Expansion improves recall on a query that's already well-formed. Conversational RAG needs rewriting; a vocabulary-mismatch problem needs expansion. They compose: rewrite to make it standalone, then expand to cover phrasing.

**Q: Does expansion help dense retrieval?**
Less than it helps BM25, because embeddings already capture a lot of synonymy — "overdraft charge" and "insufficient funds fee" are already close in vector space. The main gain is on the lexical side. If you're dense-only, expansion's value is limited; if you're hybrid, it's improving the BM25 contribution.

**Q: What is pseudo-relevance feedback?**
Retrieve once, assume the top results are relevant, extract their most distinctive terms, add those to the query, and retrieve again. It's an old IR technique that needs no LLM. The weakness is the assumption — if the initial results were off-topic, the expansion terms come from the wrong documents and the second retrieval is worse than the first.

**Q: How do you prevent query drift?**
Limit the number of expansion terms, weight the original query terms higher than the added ones, and validate that expanded retrieval doesn't reduce precision on an eval set. The safest structural approach is running separate retrievals for the original and each expansion and fusing with RRF, rather than merging everything into one query — that way the original always contributes strongly.

**Q: When would you use a static synonym map over an LLM?**
When the domain vocabulary is stable and enumerable, which is true for most enterprise domains. Banking terminology doesn't change weekly. The map is free, instant, deterministic, and curated by a domain expert rather than guessed by a model. I'd reach for LLM expansion when the vocabulary is open-ended or the corpus spans domains I can't enumerate.

## 9. Common Mistakes

- Adding expansion without measuring whether it improves recall in your specific system.
- Using LLM expansion when a curated synonym map would be better and free.
- Merging all expansion terms into one query, causing drift.
- Using pseudo-relevance feedback without checking initial retrieval quality.
- Confusing expansion with rewriting — they fix different problems.

## 10. What to Remember

- **Augments a query with synonyms and related phrasings** to raise recall.
- **Helps BM25 much more than dense retrieval**, which already captures synonymy.
- **A curated domain synonym map is often the best option** — free, instant, predictable.
- **Main risk is query drift** and precision loss. Fuse separate retrievals rather than merging terms.
- **Measure before adding.** In a good hybrid system it sometimes buys nothing.
