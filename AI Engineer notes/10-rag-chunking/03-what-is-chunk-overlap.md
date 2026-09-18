# What Is Chunk Overlap?

> **Phase 10 · RAG CHUNKING · Topic 03**

## 1. Definition

Repeating text from the end of one chunk at the beginning of the next, so content near a boundary appears complete in at least one chunk. Typically 10–20% of chunk size.

## 2. Simple Explanation

Chunk boundaries land wherever the splitter decided — not where meaning ends. A sentence, a fact, or a pronoun and its referent can end up on opposite sides of a cut.

Overlap is insurance against that. By repeating the boundary region, anything straddling the cut is intact somewhere.

## 3. How It Works

```
chunk_size = 100, overlap = 20

Chunk 1:  [------------ 100 tokens ------------]
Chunk 2:                    [------------ 100 tokens ------------]
                            └─ starts 20 tokens back
Chunk 3:                                        [------------ ...
```

Each chunk starts `chunk_size - overlap` tokens after the previous one, so consecutive chunks share their boundary region.

**Overlap by content type:**

| Content | Overlap | Why |
|---|---|---|
| Continuous prose | 10–20% | Boundaries are arbitrary |
| Dense legal/technical | ~20% | Each sentence carries a lot |
| Markdown heading splits | **0%** | Boundaries are already meaningful |
| FAQ pairs | **0%** | Units are self-contained |
| Tables | **0%** | Kept whole anyway |
| Code (function splits) | **0%** | Function boundaries are meaningful |

## 4. Practical Example

**The failure overlap prevents:**

```
No overlap:
  Chunk 1: "...international transfers are subject to a fee. The fee is"
  Chunk 2: "$45 for retail accounts and $25 for Premier accounts."

  Query: "what's the international transfer fee?"
  → Chunk 1 has the topic but not the number.
  → Chunk 2 has the number but not the topic — it doesn't say
    "international" or "transfer", so it matches the query poorly.
  → The fact exists in the corpus and is effectively unretrievable.

With 20-token overlap:
  Chunk 2: "subject to a fee. The fee is $45 for retail accounts
            and $25 for Premier accounts."
  → Now self-contained enough to both match and answer.
```

**The opposite failure — too much overlap:**

```
chunk_size = 600, overlap = 240 (40%)

Retrieved top-5 for a query:
  chunk 12, chunk 13, chunk 14 — all from the same passage,
  each sharing 40% of its text with the next.

You've spent your context budget seeing the same paragraph
three times, and lost three slots that could have held
distinct information.
```

**The measured curve:**

```
overlap    index size   recall@5
    0        1.00×        0.81
   10%       1.11×        0.87
   20%       1.25×        0.89
   40%       1.67×        0.88   ← worse, and 67% more index
```

## 5. Why It Matters

- **Zero overlap is a common default and a real quality loss** on prose.
- **It's cheap insurance** — 10–20% costs modest index growth for a meaningful recall gain.
- **Knowing when it's unnecessary** (structure-aware splitting) shows you understand *why* it exists.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No overlap on prose** | Boundary-spanning facts unretrievable |
| **Too much (>25%)** | Near-duplicate chunks crowd top-k; wasted context |
| **Index growth** | 20% overlap ≈ 25% more vectors to store and search |
| **Duplicate text in the prompt** | Repetition can bias the model toward the repeated claim |
| **Overlap on meaningful boundaries** | Pure waste |
| **Citation ambiguity** | The same fact in two chunks — which one do you cite? |

**Two things to handle at retrieval time:**

1. **Deduplicate** — if two retrieved chunks overlap substantially by document and character range, keep the higher-scoring one.
2. **Cite at section level** rather than chunk level, so overlapping chunks from one section collapse to a single reference.

## 7. Interview Answer

> "Overlap repeats text from the end of one chunk at the start of the next, typically ten to twenty percent of chunk size.
>
> It exists because chunk boundaries are arbitrary — they fall where the splitter decided, not where meaning ends. Without overlap, a sentence can be cut so one chunk ends with 'the fee is' and the next begins with the amount. The first chunk has the topic but not the number; the second has the number but doesn't mention 'international transfer,' so it matches the query poorly. The fact is in the corpus and effectively unretrievable.
>
> But more isn't better. Past about twenty-five percent, adjacent chunks become near-duplicates, so a top-five retrieval can return three overlapping views of the same passage. You've spent your context budget on repetition and lost slots that could have held distinct information. In a typical sweep, recall peaks around ten to twenty percent and then declines.
>
> And it's unnecessary when boundaries are already meaningful. If I'm splitting on markdown headings, function definitions, or FAQ pairs, overlap is pure duplication — it compensates for *arbitrary* boundaries specifically.
>
> Two things I'd handle at retrieval: deduplicate chunks that overlap substantially, keeping the higher-scoring one, and cite at section level rather than chunk level so overlapping chunks from the same section collapse into one reference."

## 8. Likely Follow-ups

**Q: How much overlap?**
10–20% of chunk size for continuous prose, leaning toward 20% for dense legal or technical text where each sentence carries a lot. Zero for structure-aware splits where boundaries are already meaningful. Above 25% the near-duplicate problem outweighs the benefit.

**Q: What does overlap cost?**
Index size and embedding cost grow roughly proportionally — 20% overlap means about 25% more chunks to store, embed, and search. At query time, overlapping chunks in the top-k consume context on repeated text. Neither is severe at reasonable levels, but both scale with corpus size.

**Q: Do you need overlap with semantic chunking?**
Much less, because semantic chunking places boundaries at genuine topic shifts rather than arbitrary positions. A small overlap is still reasonable insurance since boundary detection isn't perfect, but not the 20% you'd use with fixed-size splitting.

**Q: How do you handle duplicate content in results?**
Deduplicate by document ID and character span — if two retrieved chunks overlap substantially, keep the higher-scoring one. Alternatively, merge adjacent chunks from the same document into one contiguous passage before prompting, which also gives the model better continuity. For citations, attribute at section level.

**Q: Should overlap be measured in characters or tokens?**
Tokens, consistently with chunk size, since that's what the context budget and embedding limits are denominated in. Mixing units — chunk size in tokens, overlap in characters — produces an overlap percentage that varies unpredictably with content type.

## 9. Common Mistakes

- Zero overlap on continuous prose.
- Large overlap (40%+) filling top-k with near-duplicates.
- Adding overlap to structure-aware splits where boundaries are already meaningful.
- Not deduplicating overlapping chunks before building the prompt.
- Measuring overlap and chunk size in different units.

## 10. What to Remember

- **Repeat the boundary region** so straddling facts stay intact.
- **10–20% for prose; 0% for structure-aware splits.**
- **Too much overlap fills top-k with near-duplicates** and wastes context.
- **It compensates for arbitrary boundaries** — meaningful ones don't need it.
- **Deduplicate at retrieval** and cite at section level.
