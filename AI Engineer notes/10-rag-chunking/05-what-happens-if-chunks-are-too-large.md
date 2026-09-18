# What Happens If Chunks Are Too Large?

> **Phase 10 · RAG CHUNKING · Topic 05**

## 1. Definition

Chunks big enough that their embedding averages across multiple topics. The content is complete, but the vector is unfocused — so the right chunk ranks poorly against better-focused chunks that contain less.

## 2. Simple Explanation

An embedding is one vector for the whole chunk. Put five topics in and the vector points at the middle of all five.

A chunk containing the answer can lose to a chunk from a different document that has less relevant content but a sharper vector. The information is in your index and it doesn't surface.

## 3. How It Works

**The five failures:**

1. **Embedding blur** — the vector sits between topics and matches each weakly.
2. **Retrieval precision drops** — the relevant portion is a small fraction of what's retrieved.
3. **Context cost rises** — `chunk_size × top_k` is your input token bill; large chunks multiply it.
4. **Lost in the middle** — the answer can be buried in a long chunk where models attend less reliably.
5. **Silent truncation** — if chunk size exceeds the embedding model's max input, the tail is dropped entirely.

```
2000-token chunk: fees + eligibility + disputes + transfers + rates

              disputes
                 ●
   fees ●      [chunk]      ● transfers
                 ●
             eligibility

The chunk's vector sits at the centroid — near nothing specific.
A dedicated 400-token disputes chunk lands right on "disputes".
```

## 4. Practical Example

**The right chunk losing to a worse one:**

```
Query: "how do I dispute a transaction?"

Chunk A (2000 tokens, from the correct product document):
  "Premier Savings offers 4.2% APY... maintenance is $12, waived
   above $10,000... eligibility requires proof of income...
   disputes must be filed within 60 days of the statement date...
   international transfers are $25..."
  → cosine 0.68  — contains the answer

Chunk B (400 tokens, from a generic disputes FAQ):
  "## Disputing a Transaction
   To dispute a transaction, contact support within 60 days..."
  → cosine 0.87  — ranks first

B wins. If B is generic and A was product-specific, the answer
may be subtly wrong — and A never surfaced.
```

**The silent truncation trap, which is often the real cause:**

```
Embedding model max input: 512 tokens
Chunk size:                1500 tokens

→ 988 tokens of every chunk are silently dropped before embedding.
  The text is stored and returned, but the EMBEDDING only reflects
  the first third. Content in the tail is effectively unretrievable.

No error. No warning. Just quietly worse recall.
```

**Always verify `chunk_size < embedding_model.max_input_tokens`.**

## 5. Why It Matters

- **It's the more common error** — people default large because it feels safer.
- **It's expensive**, multiplying input tokens on every query forever.
- **It presents as "the LLM is bad,"** so teams swap models instead of fixing chunking.

## 6. Trade-offs / Failure Modes

| Symptom | Diagnosis |
|---|---|
| Correct content exists but ranks poorly | Blurred embedding |
| recall@20 much better than recall@5 | Ranking problem from unfocused vectors |
| Retrieved context mostly irrelevant filler | Chunks too large |
| High per-query token cost | `chunk_size × top_k` too big |
| Content in the tail of chunks never retrieved | **Silent truncation** — check the model's limit |
| Answers miss details present in the retrieved text | Lost in the middle of a long chunk |

**The fixes:**

1. **Check for truncation first** — it's free to verify and it's often the whole problem.
2. **Reduce chunk size** and re-measure.
3. **Split on structure** rather than token count — one section per chunk.
4. **Parent-child retrieval** — small chunks for embedding, large for context. Resolves the tension rather than trading it.
5. **Add a reranker** — helps recover ranking, but doesn't fix the underlying blur.

## 7. Interview Answer

> "Too-large chunks produce complete content with a blurred embedding. The vector is an average across every topic in the chunk, so it sits at the centroid and matches each one weakly.
>
> The concrete consequence is that the chunk containing the answer can lose to a chunk from a different document that has less relevant content but a sharper vector. A two-thousand-token section covering fees, eligibility, disputes, and transfers scores worse on a disputes question than a focused four-hundred-token disputes FAQ — even though the large chunk is the product-specific one and the FAQ is generic. So you get a subtly wrong answer and the right content never surfaced.
>
> There's also a cost dimension: chunk size times top-k is your input token bill on every query, forever. Large chunks multiply that permanently.
>
> The first thing I'd check, though, is silent truncation. If the embedding model caps at 512 tokens and chunks are 1500, two-thirds of every chunk is dropped before embedding — the text is stored and returned, but the vector only reflects the first third. Content in the tail is effectively unretrievable, with no error and no warning. That's free to verify and it's frequently the actual cause.
>
> This is also the failure that gets misdiagnosed most. It presents as bad answers, so teams conclude the LLM is the problem and swap models, when the cause is upstream. The signature that points at chunking is recall@20 being much better than recall@5 — the content is there, it just ranks poorly."

## 8. Likely Follow-ups

**Q: How do you detect over-large chunks?**
Compare recall at high k to recall at low k — a large gap means the content is retrievable but ranks poorly, which is the blur signature. Also check whether retrieved context is mostly irrelevant filler, and verify chunk size against the embedding model's input limit. Reading a few retrieved chunks makes it obvious.

**Q: What is silent truncation and why does it matter so much?**
If a chunk exceeds the embedding model's max input, the model truncates it without error. The full text is stored and returned at retrieval, but the *vector* only reflects the part that fit. So content in the tail is stored, visible, and unretrievable — a failure mode with no symptom except quietly worse recall. It's the first thing to rule out.

**Q: Won't a reranker fix it?**
Partially. A reranker sees the query and chunk together, so it can correctly score a large chunk that the bi-encoder blurred — but only if the chunk was retrieved in the first place. If blur pushed it out of the candidate set entirely, reranking never sees it. And reranker input limits mean a long chunk may be truncated there too. It mitigates rather than fixes.

**Q: What's the best fix?**
Parent-child retrieval, because it resolves the tension rather than trading one problem for the other — embed small chunks for a sharp vector, return the large parent for complete context. Short of that, split on document structure rather than token count so each chunk is one topic, and check the truncation limit.

**Q: Does a long context window help?**
For the generation side, yes — you can fit more chunks. For the retrieval side, no. Blur is a property of the embedding, not of context capacity. A blurred chunk ranks poorly regardless of how much room you have to put it in. Long context makes chunking more forgiving but doesn't address this failure.

## 9. Common Mistakes

- Defaulting to large chunks because it feels safer.
- Not verifying chunk size against the embedding model's max input.
- Concluding the LLM is bad when the chunking is the cause.
- Expecting a reranker to fix a blur problem it never gets to see.
- Ignoring the permanent per-query token cost of large chunks.

## 10. What to Remember

- **Blurred embedding** — the vector averages across topics and matches none precisely.
- **The right chunk can lose** to a smaller, better-focused chunk elsewhere.
- **Check for silent truncation first** — `chunk_size < model max input`. Free to verify.
- **Signature:** recall@20 ≫ recall@5, and retrieved context that's mostly filler.
- **Presents as "the LLM is bad."** Fix chunking before swapping models.
