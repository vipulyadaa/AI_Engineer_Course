# Dense Retrieval

> **Phase 11 · RAG RETRIEVAL · Topic 06**

## 1. Definition

Retrieval by embedding queries and documents into a shared dense vector space and finding nearest neighbours. "Dense" because every dimension carries a value, in contrast to sparse representations where most entries are zero.

## 2. Simple Explanation

Every chunk becomes a point in high-dimensional space. Your query becomes a point too. The nearest points are your results.

What makes it work is that the space was *trained* so that semantically similar text lands nearby — which means you can match "how much to send money abroad" to "international wire fee: $45" despite zero shared vocabulary.

## 3. How It Works

**Ingestion:**
1. Embed each chunk with a bi-encoder → a fixed-length vector (384–3072 dims).
2. Store in an ANN index (HNSW, IVF, ScaNN).

**Query:**
3. Embed the query with the **same model**.
4. ANN search for nearest neighbours by cosine.
5. Return top-k.

**Why the geometry is meaningful:** embedding models are trained **contrastively** on triples of (query, relevant passage, irrelevant passage), pulling relevant pairs together and pushing others apart. Cosine similarity means something because the model was explicitly optimized to make it mean something.

**Dense vs. sparse, structurally:**

| | Dense | Sparse (BM25) |
|---|---|---|
| Dimensions | 384–3072, all populated | Vocabulary-sized, mostly zero |
| Matches on | Meaning | Exact tokens |
| Needs a model | Yes | No |
| Handles paraphrase | Yes | No |
| Handles identifiers | **Poorly** | Yes |
| Index | ANN graph/clusters | Inverted index |

## 4. Practical Example

**The three implementation details that silently cost recall:**

```python
# 1. ASYMMETRY — queries and documents encode differently
doc_vec   = embed(chunk, task_type="RETRIEVAL_DOCUMENT")
query_vec = embed(question, task_type="RETRIEVAL_QUERY")
# E5-family models use literal prefixes: "passage: " / "query: "
# Getting this wrong costs recall with NO error.

# 2. TRUNCATION — chunk must fit the model's input limit
assert chunk_tokens <= model.max_input_tokens
# Otherwise the tail is silently dropped from the embedding.
# The text is stored and returned; the VECTOR ignores it.

# 3. SAME MODEL both sides
# Vectors from different models are not comparable at all.
# A model change means re-embedding the entire corpus.
```

**Where dense retrieval structurally fails:**

```
Query: "policy AC-4471-B"

The embedding encodes "this is a policy identifier of roughly
this shape." AC-4471-B, AC-4472-C, and AC-9983-X all land in
nearly the same region of the space.

The model was never trained to preserve exact character sequences —
it was trained to capture meaning, and the "meaning" of an
arbitrary identifier is just "identifier."
```

That's not a tuning problem. It's what the representation is.

## 5. Why It Matters

- **It's the core of semantic search** and the reason RAG works on natural-language questions.
- **Its failure mode is specific and predictable** — exact strings — which is what motivates hybrid.
- **The silent failure modes** (asymmetry, truncation, model mismatch) are exactly what interviews probe.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Exact identifiers missed** | Structural — add BM25 |
| **Query/document asymmetry ignored** | Real recall loss, no error |
| **Chunk exceeds model max input** | Silent truncation; tail unretrievable |
| **Different models for index and query** | Retrieval returns noise |
| **Model version changed by provider** | Silent quality shift with no code change |
| **Poor domain fit** | Jargon and product codes don't separate well |
| **Changing the model** | Full corpus re-embed required |
| **ANN recall loss** | The index itself drops some true neighbours — measure it |

**Dimension choice is a real cost decision:** a 3072-dim model costs 4× the storage of a 768-dim one and makes ANN search slower, often for marginal quality gain on domain data. Matryoshka embeddings help — trained so you can truncate dimensions with graceful degradation.

## 7. Interview Answer

> "Dense retrieval embeds queries and documents into a shared vector space and finds nearest neighbours. 'Dense' means every dimension carries a value, as opposed to sparse representations that are mostly zeros.
>
> What makes the geometry meaningful is that embedding models are trained contrastively — on triples of query, relevant passage, and irrelevant passage, pulling relevant pairs together and pushing others apart. So cosine similarity means something because the model was explicitly optimized to make it mean something.
>
> Its strength is paraphrase — matching 'how much to send money abroad' to 'international wire fee: forty-five dollars' with no shared vocabulary. Its structural weakness is exact strings. A query for policy AC-4471-B embeds as 'a policy identifier of roughly this shape,' so all policy numbers land in nearly the same region. That's not a tuning problem, it's what the representation is — which is why hybrid retrieval exists.
>
> Three implementation details cost recall silently. Query-document asymmetry: several models expect different task types or prefixes for queries versus passages, and ignoring that degrades recall with no error. Truncation: if a chunk exceeds the model's input limit, the tail is dropped from the embedding while the text is still stored and returned — so content is indexed and unretrievable. And using the same model on both sides, since vectors from different models aren't comparable at all.
>
> That last point also means changing the embedding model requires re-embedding the whole corpus. I'd build the new index alongside the old, evaluate both on a golden set, then cut over."

## 8. Likely Follow-ups

**Q: Why is dense retrieval bad at exact matching?**
Because embeddings encode meaning rather than surface form. An identifier's "meaning" to the model is just "this is an identifier," so different identifiers of the same shape land in nearly the same region. The model was never trained to preserve exact character sequences — that's precisely what BM25 does, which is why they're complementary rather than competing.

**Q: What is query-document asymmetry?**
Queries and documents have structurally different forms — a short interrogative versus a long declarative passage — and several embedding models are trained to encode them differently. Vertex AI uses task types like RETRIEVAL_QUERY and RETRIEVAL_DOCUMENT; E5 models use literal "query:" and "passage:" prefixes. Using the wrong one costs recall with no error message, which makes it a common silent bug.

**Q: How do you choose an embedding model?**
Evaluate on your own data with a small set of real questions and known correct chunks, measuring recall@k. Then weigh dimensions against storage and latency cost, check max input length against your chunk size, confirm language coverage, and consider data residency for hosted models. A leaderboard like MTEB is a filter for candidates, not an answer.

**Q: What happens when the provider updates the model?**
Quality shifts with no change on your side, and if the update changes the embedding space, existing vectors become inconsistent with new queries. I'd pin the model version explicitly and run a golden eval set on every provider update rather than discovering the change through user complaints.

**Q: Does higher dimension always mean better?**
No. It means more storage, more memory, and slower ANN search, for often marginal quality gain on domain-specific data. A 3072-dimension model is four times the storage of a 768-dimension one. Matryoshka embeddings are trained so you can truncate to fewer dimensions with graceful degradation, which lets you make that trade explicitly.

## 9. Common Mistakes

- Chunk size exceeding the embedding model's input limit.
- Ignoring query-document asymmetry.
- Using different models for indexing and querying.
- Expecting dense retrieval to handle exact identifiers.
- Not pinning the model version.
- Never measuring ANN recall against exact search.

## 10. What to Remember

- **Embed both sides into one space; nearest neighbours are results.**
- **Trained contrastively** — that's why cosine similarity is meaningful.
- **Structurally weak on exact identifiers.** Add BM25; it's not fixable by tuning.
- **Three silent failures:** asymmetry, truncation, model mismatch.
- **Changing the model = full re-embed.** Version the index and cut over.
