# Fixed-Size vs. Semantic Chunking

> **Phase 10 · RAG CHUNKING · Topic 06**

## 1. Definition

**Fixed-size** splits at a constant token count regardless of content. **Semantic** splits where meaning shifts, detected by comparing embeddings of consecutive sentences. Between them sits **recursive/structure-aware** splitting, which is what most production systems actually use.

## 2. Simple Explanation

- **Fixed-size:** cut at token 600, whatever is there. Fast, free, splits mid-sentence.
- **Semantic:** read the text, find where the topic changes, cut there. Better boundaries, costs an embedding call per sentence.
- **Recursive/structure-aware:** use the document's own formatting — headings, paragraphs — as boundary hints. Free, and on structured documents it's about as good as semantic.

The honest framing: this is usually a three-way comparison, and the middle option wins most of the time.

## 3. How It Works

| | Fixed-size | Recursive/structural | Semantic |
|---|---|---|---|
| **Boundary rule** | Token count | Separator priority (`\n## `, `\n\n`, `. `) | Embedding similarity drop |
| **Ingestion cost** | None | None | 1 embedding per sentence |
| **Chunk size** | Uniform | Mostly uniform | Highly variable |
| **Respects meaning** | No | Via formatting proxy | Directly |
| **Needs structure** | No | Yes, to be useful | No |
| **Incremental re-index** | Clean | Clean | Boundaries shift downstream |

**Semantic chunking mechanics:**

```
sentences:   s1   s2   s3   s4   s5   s6
similarity:    .91  .88  .43  .89  .38
                         ↑cut        ↑cut

Threshold set as a PERCENTILE of the document's own similarity
distribution — absolute cosine values aren't comparable across
documents or embedding models.
```

## 4. Practical Example

**All three on the same document:**

```
Document:
  "## Fees
   Premier accounts are charged $12 monthly. The fee is waived
   above $10,000 average daily balance.
   ## Overdraft Protection
   Overdraft protection covers transactions exceeding your
   available balance..."

FIXED-SIZE (600 tokens):
  Chunk spans the end of Fees and the start of Overdraft.
  Embedding sits between two unrelated topics. ❌

RECURSIVE with markdown separators:
  Splits on "## ". One chunk per section. ✅
  Bonus: you get the heading for enrichment and citation metadata.

SEMANTIC:
  Detects the similarity drop at the section change. Splits there. ✅
  Same result as recursive — at the cost of an embedding call
  per sentence across the whole corpus.
```

**That's the key comparison.** On documents with structure, recursive achieves what semantic achieves, for free, and gives you the heading as a bonus.

**Where semantic genuinely wins:**

```
Call transcript, no headings, continuous speech:
  "...so anyway the transfer went through fine. Right, moving on,
   I wanted to ask about the overdraft situation..."

  Recursive has nothing to split on except paragraph breaks,
  which may not exist.
  Semantic detects the topic shift at "moving on". ✅
```

## 5. Why It Matters

- **The default choice matters** — fixed-size is what tutorials use and it's the weakest option.
- **Recursive is the right production default**, and it's free.
- **Knowing when semantic earns its cost** — unstructured content only — is the useful judgment.

## 6. Trade-offs / Failure Modes

| Approach | Weakness |
|---|---|
| **Fixed-size** | Splits mid-sentence, mid-table, mid-thought. No reason to use it in production |
| **Recursive** | Only as good as the document's formatting; still character-based at the leaf |
| **Semantic** | Embedding call per sentence; variable chunk sizes; gradual topic drift has no clear boundary; re-indexing shifts all downstream boundaries |

**The re-indexing problem with semantic chunking is practically annoying and rarely mentioned.** With fixed-size or recursive splitting, editing a paragraph affects only local chunks, so content-hash-based incremental re-embedding works well. With semantic chunking, a change in similarity can shift every subsequent boundary, invalidating chunk IDs across the rest of the document.

**Neither handles tables or code.** Both need those routed around the text splitter entirely, split on structural boundaries instead.

## 7. Interview Answer

> "Fixed-size splits at a constant token count regardless of content. Semantic splits where meaning shifts, detected by comparing embeddings of consecutive sentences. But I'd frame it as a three-way comparison, because recursive structure-aware splitting sits between them and is what I'd actually use.
>
> Fixed-size is what tutorials default to and it's the weakest option — it splits mid-sentence and mid-table with no awareness of content. I wouldn't ship it.
>
> Semantic produces genuinely good boundaries, but it costs an embedding call per sentence across the entire corpus, and that's a significant ingestion expense that recurs on every re-index.
>
> The thing is, on documents with real structure, recursive splitting gets the same result for free. If I split on markdown headings, chunks never cross a section boundary — which is exactly what semantic chunking would have detected. And I get the heading as a bonus, for enrichment and citation metadata.
>
> So my rule is: recursive with separators tuned to the document format as the default, and semantic only for content with no usable structure — call transcripts, OCR'd prose, continuous narrative where there's nothing to split on.
>
> One practical downside of semantic that's rarely mentioned: because boundaries depend on similarity, editing one paragraph can shift every downstream boundary, which breaks content-hash-based incremental re-indexing. With recursive splitting, an edit affects only local chunks."

## 8. Likely Follow-ups

**Q: Is fixed-size ever the right choice?**
As a baseline for comparison, and for content with genuinely no structure and no budget for semantic chunking. In production I'd use recursive instead — it costs nothing extra and strictly dominates fixed-size, since it falls back to character splitting only when no better boundary fits.

**Q: How do you set the semantic threshold?**
As a percentile of the document's own distribution of consecutive-sentence similarities, typically the 5th or 10th. Absolute cosine values aren't comparable across documents or embedding models, so a hardcoded value behaves very differently on different content. I'd also enforce minimum and maximum chunk sizes on top, since pure semantic splitting produces very uneven chunks.

**Q: What's the cost of semantic chunking at scale?**
One embedding call per sentence. For a corpus of a few million sentences that's a real expense in money and ingestion time, and it recurs on re-ingestion. Whether it's worth it depends entirely on whether it beats recursive splitting on your content — which it usually doesn't, if your documents have headings.

**Q: Do either handle tables?**
No. Both treat a table's newlines as potential split points and will shred it. Tables need to be extracted at parse time and routed around the text splitter entirely, kept as whole units. The same goes for code, which should split on function or class boundaries rather than by either method.

**Q: What about gradual topic drift?**
That's semantic chunking's genuine weakness — a passage that shifts slowly has no sharp similarity drop to cut at, so it either doesn't split or splits arbitrarily. Enforcing a maximum chunk size handles the practical consequence. Comparing each sentence against a rolling window average rather than just its neighbour also helps detect slow drift.

## 9. Common Mistakes

- Using fixed-size splitting in production when recursive is free and better.
- Paying for semantic chunking on documents that have headings.
- Setting an absolute similarity threshold instead of a percentile.
- Not enforcing min/max sizes on semantic chunks.
- Letting either method touch tables or code.

## 10. What to Remember

- **Three options, not two.** Recursive structure-aware splitting is the production default.
- **Fixed-size is the tutorial default and the weakest** — splits mid-sentence.
- **Semantic costs an embedding per sentence** and only earns it on unstructured content.
- **On structured documents, recursive equals semantic for free** — plus you get the heading.
- **Neither handles tables or code.** Route those around the splitter.
