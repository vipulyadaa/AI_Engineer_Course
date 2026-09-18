# Context Compression

> **Phase 09 · ADVANCED RAG · Topic 16**

## 1. Definition

Reducing retrieved context before it reaches the LLM — removing sentences irrelevant to the query, extracting only the answering passage, or summarizing. It cuts token cost and reduces distraction from irrelevant text.

## 2. Simple Explanation

You retrieved four chunks. Each is 800 tokens. Maybe 150 tokens across all of them actually bear on the question.

Compression strips the rest. You pay for fewer input tokens, the model has less to be distracted by, and the relevant fact isn't buried in surrounding text the retriever happened to include.

## 3. How It Works

**Three approaches:**

| Method | How | Preserves exact wording? |
|---|---|---|
| **Extractive filtering** | Score each sentence against the query; keep the top ones | Yes |
| **Abstractive summarization** | LLM rewrites the chunk focused on the query | **No — risk** |
| **Token-level pruning** (LLMLingua-style) | Drop low-information tokens using a small model | Partially |

**Extractive is the safe default in a factual domain.** Abstractive compression rewrites text, and a rewrite can subtly change a number, drop a qualifier, or lose a condition — which is exactly what you can't afford in banking.

```
Original chunk (800 tokens, mostly context)
   ↓ extractive filter: keep sentences scoring above threshold
Compressed (180 tokens, the relevant sentences verbatim)
   ↓
prompt
```

## 4. Practical Example

**Why abstractive compression is dangerous here:**

```
Original:
  "Premier customers receive fee waivers on the first two international
   transfers per calendar month. Additional transfers are charged at
   the standard $25 Premier rate. Waivers do not apply to same-day
   or expedited transfers."

Abstractive compression:
  "Premier customers get free international transfers at $25."
   ↑ Lost: the two-per-month limit, and the expedited exclusion.
     Both are material. The compressed version is wrong.

Extractive compression (query: "premier international transfer cost"):
  "Premier customers receive fee waivers on the first two international
   transfers per calendar month. Additional transfers are charged at
   the standard $25 Premier rate."
   ↑ Verbatim. Dropped only the expedited sentence, which may or may
     not be acceptable — measure it.
```

**The cost/benefit:**

```
Without compression: 4 chunks × 800 tokens = 3,200 input tokens
With compression:    4 chunks × ~180       =   720 input tokens
                                              ─────
                     saving: ~77% of retrieval context tokens

Cost of compression: an extra model call (extractive scorer or LLM)
                     ≈ 100-400ms
```

**The honest question:** at current token prices, is saving 2,500 input tokens worth 300ms and another model dependency? Often not. Compression makes most sense when context volume is genuinely large — many chunks, long parent documents — or at very high query volume where token cost dominates.

## 5. Why It Matters

- **Irrelevant context measurably degrades answers**, so compression can improve quality, not just cost.
- **It mitigates the "lost in the middle" effect** by shortening the context so there's less middle.
- **It's the mechanism that makes parent-child retrieval affordable** — return the parent, compress it to the relevant part.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Abstractive rewriting loses qualifiers** | Numbers, conditions, and exceptions dropped or altered |
| **Compressing away the answer** | An aggressive filter removes the sentence that mattered |
| **Latency added** | Another model call in the critical path |
| **Breaks citation** | Compressed text no longer matches the source verbatim |
| **Often not worth it** | Token savings may not justify the latency at typical volumes |
| **Two models to maintain** | Compressor is another dependency to version and monitor |

**The citation problem is underrated.** If you compress abstractively, the answer's quoted text no longer appears in the source document, so verification against the original fails. Extractive compression preserves this; abstractive doesn't.

**The better first move is usually retrieving less.** If four 800-token chunks contain only 180 useful tokens each, the real problem may be chunk size or retrieval precision. Fixing those upstream is cheaper than compressing downstream.

## 7. Interview Answer

> "Context compression reduces retrieved text before it reaches the LLM — filtering out sentences irrelevant to the query, or summarizing. The goal is fewer input tokens and less distraction.
>
> There are extractive and abstractive approaches, and in a factual domain like banking I'd strongly prefer extractive. Abstractive compression rewrites the text, and a rewrite can drop a qualifier — turning 'fee waivers on the first two international transfers per month' into 'free international transfers,' which is materially wrong. Extractive keeps sentences verbatim, so that can't happen.
>
> Abstractive also breaks citation. If the compressed text doesn't appear in the source document, verifying the answer against the original fails, and in a regulated domain that's usually a requirement.
>
> The honest assessment is that compression often isn't worth it. Saving twenty-five hundred input tokens costs another model call — a few hundred milliseconds and another dependency to maintain. At current token prices that trade is frequently bad. It makes sense when context volume is genuinely large, like returning big parent documents, or at very high query volume where token cost dominates.
>
> And I'd check upstream first. If four eight-hundred-token chunks contain only a hundred and eighty useful tokens each, the real problem is probably chunk size or retrieval precision. Fixing those is cheaper than compressing downstream — you get the same token savings with less latency and no extra component.
>
> Where it genuinely earns its place is alongside parent-child retrieval: return the full parent section for context, then compress it to the query-relevant portion."

## 8. Likely Follow-ups

**Q: Extractive or abstractive?**
Extractive for factual domains, because it preserves exact wording — numbers, conditions, and exceptions survive, and citation verification still works. Abstractive is only acceptable when the content is genuinely narrative and exact wording doesn't carry meaning, which is rare in policy or technical documentation.

**Q: Does compression improve quality or just cost?**
Both, potentially. Irrelevant context measurably degrades answers — the model can be pulled toward a tangentially related passage. Shortening the context also reduces the "lost in the middle" problem by reducing how much middle there is. So it's not purely a cost optimization, though cost is usually the stated motivation.

**Q: What's the risk of compressing away the answer?**
Real, and it fails silently — the model just says it doesn't have the information. I'd mitigate by being conservative with the threshold, keeping whole sentences rather than fragments, and measuring end-to-end answer quality with and without compression rather than only measuring token savings.

**Q: When is compression clearly worth it?**
When retrieved context is genuinely large — parent-child retrieval returning multi-thousand-token sections, or a high top-k for a recall-critical application. Also at very high query volume where input token cost dominates the bill. For a typical four-chunk, three-thousand-token context, the latency usually isn't worth the savings.

**Q: How does it interact with citation?**
Extractive compression preserves it, since the retained sentences are verbatim from the source and still map to their chunk. Abstractive breaks it, because the text in context no longer appears in the source document — so a verification step comparing the answer to the original will fail even when the answer is correct. That alone rules abstractive out for most regulated use cases.

## 9. Common Mistakes

- Using abstractive compression in a factual domain and losing qualifiers.
- Adding compression before checking whether chunk size or retrieval precision is the real problem.
- Not measuring end-to-end quality, only token savings.
- Breaking citation verification with abstractive rewriting.
- Assuming the token savings justify the latency without doing the arithmetic.

## 10. What to Remember

- **Strip irrelevant text from retrieved context** before prompting.
- **Extractive over abstractive** in factual domains — rewriting drops qualifiers and breaks citation.
- **It can improve quality, not just cost** — irrelevant context distracts.
- **Often not worth the latency** at typical context sizes. Do the arithmetic.
- **Fix chunk size and retrieval precision upstream first** — cheaper than compressing downstream.
