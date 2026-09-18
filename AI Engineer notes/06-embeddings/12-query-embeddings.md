# Query Embeddings

> **Phase 06 · EMBEDDINGS · Topic 12**

## 1. Definition

The vector produced from the user's question at search time. Several embedding models encode queries **differently from documents**, and using the document encoding for a query is a silent recall loss.

## 2. Simple Explanation

A query and a document have different shapes. A query is short, interrogative, and incomplete. A document passage is long, declarative, and self-contained.

Several models are trained to account for that — expecting an explicit signal that this text is a query rather than a passage. Ignoring it costs recall, with no error.

## 3. How It Works

**The asymmetry signal, by model family:**

```
Vertex AI:
  embed(text, task_type="RETRIEVAL_QUERY")     ← queries
  embed(text, task_type="RETRIEVAL_DOCUMENT")  ← chunks

E5 family:
  embed("query: "   + question)
  embed("passage: " + chunk)

BGE family:
  some variants use an instruction prefix for queries

Symmetric models (e.g. some MiniLM variants):
  no distinction — same encoding both sides
```

**Check the model card.** Using the wrong task type, or none, is the most common silent embedding bug — retrieval just quietly performs worse.

## 4. Practical Example

**Why asymmetry helps:**

```
Query:   "wire fee"                              2 tokens
Chunk:   "International wire transfers incur a $45 fee for
          retail accounts and $25 for Premier accounts,
          per the Retail Fees Schedule..."       ~40 tokens

Symmetric encoding treats these as the same kind of text.
Asymmetric encoding lets the model represent "this is a
short information NEED" differently from "this is a
declarative passage" — which is closer to what's actually
being matched.
```

**Query embeddings are cacheable:**

```python
@lru_cache(maxsize=100_000)
def embed_query(normalized_question: str):
    return embed(normalized_question, task_type="RETRIEVAL_QUERY")

# In a banking assistant, a substantial fraction of queries
# repeat — "what's my balance", "how do I reset my password".
# Caching the embedding saves an API call and latency on every hit.
#
# Normalize first (lowercase, strip punctuation and whitespace)
# to increase the hit rate.
```

**Query transformation happens before embedding:**

```
raw query
  → rewrite (resolve pronouns, add conversational context)
  → expand (optional synonyms)
  → EMBED
  → search

A follow-up like "and for premier?" embeds to something
nearly meaningless. Rewriting it to "international wire
transfer fee for Premier accounts" is what makes the
embedding useful.
```

**HyDE is a query-embedding technique:** embed a generated hypothetical *answer* rather than the question, so document-shaped text is compared to documents. The caveat is that it destroys exact identifiers, so in a hybrid system BM25 must run on the original query.

## 5. Why It Matters

- **Asymmetry is the most common silent embedding bug**, and it costs real recall.
- **Query embedding caching** is a free latency and cost win in a system with repeated questions.
- **Everything upstream — rewriting, expansion, HyDE — is about producing a better query embedding.**

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Wrong or missing task type** | Silent recall loss |
| **Different model than the documents** | Retrieval returns noise |
| **Not caching repeated queries** | Unnecessary API calls and latency |
| **Embedding a conversational fragment** | "and for premier?" is nearly meaningless |
| **HyDE on the BM25 side** | Destroys the exact identifiers BM25 was there to catch |
| **Not normalizing before caching** | Low cache hit rate |

**On verification:** the asymmetry bug is silent, so it needs explicit checking. Read the model card, and validate empirically — embed a query with both task types and compare recall on your eval set. A meaningful difference confirms the model is asymmetric and that you're using it correctly.

**On the caching caveat:** cache the *embedding*, not the retrieval result, unless the cache key includes the caller's entitlements. A response cache keyed only on query text serves one user's answer to another, which is a real access-control leak.

## 7. Interview Answer

> "The query embedding is the vector produced from the user's question at search time, and the thing to get right is asymmetry.
>
> A query and a document have different shapes — a query is short, interrogative, and incomplete; a passage is long, declarative, and self-contained. Several models are trained to account for that and expect an explicit signal. Vertex AI uses task types, RETRIEVAL_QUERY versus RETRIEVAL_DOCUMENT. The E5 family uses literal 'query:' and 'passage:' prefixes. Using the wrong one, or neither, costs real recall with no error message — it's the most common silent embedding bug.
>
> Because it's silent, I'd verify rather than assume. Read the model card, then validate empirically: embed queries with both task types and compare recall on the eval set. A meaningful difference confirms both that the model is asymmetric and that I'm using it correctly.
>
> A free win is caching query embeddings. In a banking assistant a substantial fraction of queries repeat — 'what's my balance,' 'how do I reset my password' — so caching the embedding keyed on a normalized question saves an API call and latency on every hit. Normalizing first, lowercasing and stripping punctuation, raises the hit rate.
>
> Important caveat there: cache the embedding, not the retrieval result — unless the cache key includes the caller's entitlements. A response cache keyed only on query text serves one user's answer to another, which is a genuine access-control leak and an easy one to build accidentally.
>
> Everything upstream is about producing a better query embedding. Query rewriting matters most in conversation: a follow-up like 'and for premier?' embeds to something nearly meaningless, and rewriting it to 'international wire transfer fee for Premier accounts' is what makes the embedding useful. And HyDE is a query-embedding technique — embed a generated hypothetical answer so document-shaped text is compared to documents — with the caveat that it destroys exact identifiers, so BM25 must run on the original query."

## 8. Likely Follow-ups

**Q: What is query-document asymmetry?**
Several embedding models encode queries and passages differently, because they have different shapes — short interrogative versus long declarative. Vertex AI signals it with task types; E5 uses literal prefixes. Using the wrong one costs recall with no error, which makes it a silent bug.

**Q: How do you verify you're using it correctly?**
Read the model card, then validate empirically — embed queries both ways and compare recall@k on your eval set. A meaningful difference confirms the model is asymmetric and that you're on the right side of it. Since the failure is silent, assuming isn't enough.

**Q: Can you cache query embeddings?**
Yes, and it's a free win where questions repeat, which they do substantially in a support assistant. Cache the embedding keyed on a normalized question — lowercased, punctuation stripped — to raise the hit rate. But cache the embedding, not the retrieval result, unless the key includes the caller's entitlements.

**Q: Why is caching retrieval results dangerous?**
Because a cache keyed only on query text serves one user's results to another, bypassing the access-control filter entirely. If two users ask the same question and have different entitlements, the second gets the first's results. The fix is including groups and tenant in the cache key.

**Q: What happens before the query is embedded?**
Query rewriting, primarily — resolving pronouns and conversational ellipsis so the query is standalone. A follow-up like "and for premier?" embeds to something nearly meaningless. Optionally expansion for synonym coverage, and HyDE if the question-document vocabulary gap is large — with BM25 kept on the original query so identifiers survive.

## 9. Common Mistakes

- Not using the model's task type or prefix for queries.
- Using a different model for queries than for documents.
- Caching retrieval results keyed only on query text.
- Embedding conversational fragments without rewriting.
- Applying HyDE to the BM25 side, destroying identifiers.

## 10. What to Remember

- **Asymmetry is the most common silent embedding bug** — check the model card and verify empirically.
- **Same model both sides**, always.
- **Cache query embeddings** on a normalized key — free latency and cost win.
- **Never cache retrieval results without entitlements in the key** — that's a leak.
- **Rewriting before embedding** is what makes conversational follow-ups work.
