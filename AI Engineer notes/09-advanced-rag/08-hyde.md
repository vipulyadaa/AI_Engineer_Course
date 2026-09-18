# HyDE (Hypothetical Document Embeddings)

> **Phase 09 · ADVANCED RAG · Topic 08**

## 1. Definition

Instead of embedding the question, have an LLM write a hypothetical *answer* to it, then embed that and search with it. The generated answer resembles a real document more than a question does, so it lands closer to the right chunks in vector space.

## 2. Simple Explanation

A question and its answer are written differently. "What does an international wire cost?" and "International wire transfers incur a $45 fee for retail accounts" share almost no structure — one is interrogative and short, the other declarative and specific.

HyDE closes that gap by making the query look like a document. Let the model guess an answer, embed the guess, and find real documents that look like it.

The guess can be factually wrong and still work — you're matching on *form and topic*, not on truth.

## 3. How It Works

```
question
   │
   ▼
┌──────────────────────────────────┐
│ LLM: "Write a passage that       │
│ answers this question."          │
└──────────────┬───────────────────┘
               ▼
   hypothetical answer (possibly wrong!)
               │
               ▼
        embed the hypothesis
               │
               ▼
   search → real chunks that resemble it
               │
               ▼
   generate the real answer from real chunks
```

1. LLM generates a plausible answer passage from its parametric knowledge.
2. Embed that passage — **not** the question.
3. Retrieve nearest real chunks.
4. Generate the actual answer from the retrieved real documents.

**The key insight:** the hypothetical answer's factual accuracy doesn't matter. If the model guesses "$30" and the real fee is "$45," the hypothesis still lands in the region of vector space containing wire-fee documents — which is all you needed.

## 4. Practical Example

```
Question: "What happens if my international transfer is rejected?"

Direct embedding: short interrogative, matches FAQ-style content
                  and generic transfer pages.

HyDE hypothesis (LLM-generated, factually unverified):
  "If an international transfer is rejected, the funds are typically
   returned to the originating account within 5–7 business days. A
   rejection may occur due to incorrect beneficiary details, sanctions
   screening, or insufficient funds. The originating bank may retain
   the transfer fee."

Embedding this retrieves the actual "Transfer Rejections and Returns"
policy section — which the raw question missed, because the question
never used the words "returned," "beneficiary," or "screening."
```

**HyDE is essentially query expansion done by generating document-shaped text** rather than listing synonyms. It works best when the question and answer vocabularies differ sharply, which is common in policy and technical documentation.

## 5. Why It Matters

- **It addresses the question-document asymmetry** structurally, rather than by listing synonyms.
- **It's strongest in zero-shot settings** — a domain where you haven't tuned anything else.
- **It's a good illustration** of using an LLM to improve retrieval rather than only to generate.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Latency** | An LLM generation before retrieval can start — 300–800ms, more than rewriting |
| **Cost** | One generation per query, on top of the answer generation |
| **Hallucinated direction** | If the model's guess is topically wrong, retrieval goes wrong confidently |
| **Weak on unfamiliar domains** | The model can't hypothesize well about proprietary terminology it's never seen |
| **Destroys identifiers** | A hypothesis about "policy AC-4471-B" won't contain that string — BM25 loses it |
| **Redundant with good embeddings** | Models with asymmetric query/document training already handle much of this gap |

**The identifier problem is the practical gotcha.** HyDE replaces the query with generated prose, so exact codes vanish. In a hybrid system, run BM25 on the *original* query and dense retrieval on the HyDE embedding — otherwise you lose exactly the queries hybrid was there to catch.

**When HyDE underperforms:** if your embedding model supports asymmetric query/document encoding (Vertex AI task types, E5 prefixes), much of the question-document gap is already handled and HyDE's marginal gain shrinks. Measure before adopting.

## 7. Interview Answer

> "HyDE is hypothetical document embeddings. Instead of embedding the question, you have an LLM write a hypothetical answer, embed that, and search with it.
>
> The reasoning is that questions and documents are written differently — a short interrogative versus a long declarative passage — so a question embedding isn't naturally close to the answer's embedding. Generating an answer-shaped passage closes that gap, because you're now comparing document-like text to documents.
>
> The counterintuitive part is that the hypothetical answer can be factually wrong and it still works. If the model guesses thirty dollars and the real fee is forty-five, the hypothesis still lands in the region of vector space containing wire-fee documents, which is all retrieval needed. You're matching on form and topic, not on truth.
>
> The gotcha I'd flag is identifiers. HyDE replaces the query with generated prose, so a policy number like AC-4471-B disappears entirely — and that's exactly the query type hybrid retrieval was there to catch. So in a hybrid system I'd run BM25 on the original query and dense retrieval on the HyDE embedding, not HyDE on both.
>
> Costs are real: an LLM generation before retrieval can even start, so three to eight hundred milliseconds, more than query rewriting. And it's weak on proprietary domains, because the model can't hypothesize well about terminology it's never seen.
>
> I'd also check whether it's redundant. If the embedding model supports asymmetric query and document encoding, much of the gap HyDE addresses is already handled, and the marginal gain may not justify the latency."

## 8. Likely Follow-ups

**Q: Why does it work if the hypothetical answer is wrong?**
Because retrieval matches on semantic similarity, not factual correctness. A wrong-but-topically-correct passage about wire transfer fees still embeds near real wire transfer fee documents — it uses the same vocabulary, the same register, the same concepts. The generated text is a navigation aid into vector space, not a claim.

**Q: When does HyDE fail?**
When the model's hypothesis is topically wrong, not just factually wrong — then retrieval confidently goes to the wrong region. That happens most on proprietary domains where the model has no basis to guess, like internal product names or company-specific processes. It also loses exact identifiers, which is a structural problem rather than a quality one.

**Q: How does it compare to query rewriting?**
Rewriting produces a better *question*; HyDE produces a hypothetical *answer*. Rewriting is cheaper and safer, and it's what you need for conversational context resolution. HyDE targets the question-document form asymmetry specifically and is more aggressive. They're not alternatives — you might rewrite to resolve pronouns and then apply HyDE to the rewritten query.

**Q: Does HyDE work with hybrid retrieval?**
Yes, but carefully. Use the original query for BM25 and the HyDE embedding for dense retrieval. Running HyDE on both loses exact identifiers, which defeats the purpose of having BM25. That split is the right configuration and it's easy to get wrong.

**Q: Is it worth the latency?**
Measure it. In a domain with a sharp question-document vocabulary gap and no other query optimization, it can be a real recall gain. In a system already using an asymmetric embedding model with hybrid retrieval and reranking, the marginal gain is often small and the 300–800ms is a real cost. I'd A/B it on recall@k before shipping it.

## 9. Common Mistakes

- Applying HyDE to the BM25 side and losing exact identifiers.
- Assuming the hypothetical answer's factual accuracy matters.
- Using it on domains where the model has no basis to hypothesize.
- Adding it without measuring against an asymmetric embedding baseline.
- Confusing it with query rewriting — they target different gaps.

## 10. What to Remember

- **Embed a generated hypothetical answer, not the question.** Document-shaped text matches documents.
- **Factual accuracy of the hypothesis is irrelevant** — you're matching form and topic.
- **It destroys identifiers.** Use the original query for BM25 in a hybrid setup.
- **Weak on proprietary domains** the model can't hypothesize about.
- **Check redundancy** with asymmetric embedding models before paying the latency.
