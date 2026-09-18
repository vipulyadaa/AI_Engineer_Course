# Chunk Overlap

> **Phase 08 · RAG FUNDAMENTALS · Topic 10**

## 1. Definition

Repeating some text from the end of one chunk at the start of the next, so content near a boundary appears complete in at least one chunk. Typically 10–20% of chunk size.

## 2. Simple Explanation

Chunk boundaries are arbitrary — they fall wherever the splitter decided, not where meaning ends. A sentence, a fact, or a pronoun and its referent can land on opposite sides of a cut.

Overlap is insurance: by repeating the boundary region, a fact that straddles the cut is intact somewhere.

## 3. How It Works

```
Without overlap (chunk size 100, overlap 0):
  Chunk 1: "...International transfers are subject to a fee. The fee is"
  Chunk 2: "$45 for retail accounts and $25 for Premier accounts..."
           ↑ neither chunk contains a complete, answerable fact

With overlap (chunk size 100, overlap 20):
  Chunk 1: "...International transfers are subject to a fee. The fee is"
  Chunk 2: "subject to a fee. The fee is $45 for retail accounts and $25..."
           ↑ chunk 2 is now self-contained and answerable
```

1. Split at `chunk_size` intervals.
2. Start each subsequent chunk `chunk_size - overlap` characters/tokens back.
3. Result: adjacent chunks share their boundary region.

**Rules of thumb:**

| Content | Overlap |
|---|---|
| Continuous prose | 10–20% of chunk size |
| Structure-aware splits (headings, functions) | 0 — boundaries are already meaningful |
| Tables, FAQ pairs | 0 — units are self-contained |
| Dense technical/legal text | Toward 20% |

## 4. Practical Example

```
chunk_size = 600 tokens

overlap    index size   recall@5   notes
    0         1.00×       0.81     facts split at boundaries
   60 (10%)   1.11×       0.87     good balance
  120 (20%)   1.25×       0.89     marginal gain over 10%
  240 (40%)   1.67×       0.88     near-duplicates crowd top-k
```

**The 40% row is the instructive one.** Beyond a point, overlap stops helping and starts hurting: adjacent chunks become near-duplicates, so a top-5 retrieval returns three overlapping views of the same passage instead of five distinct pieces of information. You've spent context budget on repetition.

**When overlap is unnecessary:** if you're splitting on markdown headings, function boundaries, or FAQ pairs, the boundaries already fall at meaningful places. Adding overlap there just duplicates content for no benefit. Overlap exists to compensate for *arbitrary* boundaries.

## 5. Why It Matters

- **It's cheap insurance** against the arbitrary-boundary problem, which is otherwise unrecoverable.
- **Zero overlap is a common and costly default** — facts split at boundaries simply can't be retrieved intact.
- **Knowing when it's unnecessary** (structure-aware splitting) signals you understand *why* it exists.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No overlap** | Facts spanning boundaries are incomplete in every chunk |
| **Too much overlap (>25%)** | Near-duplicate chunks crowd top-k, wasting context on repetition |
| **Index size grows** | 20% overlap ≈ 25% more vectors to store, embed, and search |
| **Duplicate content in the prompt** | The model sees the same sentence three times; can bias its answer |
| **Overlap on structured splits** | Pure waste — the boundaries were already meaningful |
| **Citation ambiguity** | The same fact appears in two chunks; which one do you cite? |

**On that last point:** deduplicate by document and character range at retrieval time, or cite at the section level rather than the chunk level, so overlapping chunks from the same section collapse to one citation.

## 7. Interview Answer

> "Overlap repeats some text from the end of one chunk at the start of the next, typically ten to twenty percent of chunk size.
>
> It exists because chunk boundaries are arbitrary — they fall where the splitter decided, not where meaning ends. Without overlap, a sentence like 'the fee is forty-five dollars for retail accounts' can get cut so that one chunk ends with 'the fee is' and the next begins with the amount. Neither chunk contains an answerable fact, and no amount of downstream work recovers it.
>
> The thing I'd add is that more isn't better. Past about twenty-five percent, adjacent chunks become near-duplicates, so a top-five retrieval returns three overlapping views of the same passage instead of five distinct facts. You've spent your context budget on repetition and reduced effective diversity.
>
> And I'd point out when it's unnecessary. If I'm splitting on markdown headings, function boundaries, or FAQ pairs, the boundaries are already meaningful — overlap there is pure duplication for no benefit. Overlap compensates for arbitrary boundaries specifically, so structure-aware splitting mostly removes the need for it.
>
> One practical detail: with overlap you get the same fact appearing in two chunks, which creates citation ambiguity. I'd deduplicate at retrieval by document and character range, or cite at section level so overlapping chunks from the same section collapse into one citation."

## 8. Likely Follow-ups

**Q: How much overlap should you use?**
10–20% of chunk size for continuous prose. Zero for structure-aware splits where boundaries are already meaningful. Lean toward 20% for dense technical or legal text where a sentence carries a lot and splitting it is costly. Above 25% the near-duplicate problem outweighs the benefit.

**Q: What's the cost of overlap?**
Index size and embedding cost grow roughly proportionally — 20% overlap means about 25% more chunks. At query time, overlapping chunks in the top-k waste context on repeated text. Neither is severe at reasonable overlap levels, but both scale, so at very large corpora it's a real budget line.

**Q: Does overlap help or hurt retrieval quality?**
Both, in different regimes. It helps by making boundary-spanning facts retrievable. It hurts past a threshold by reducing the diversity of the top-k — you retrieve the same passage several times. The sweet spot on a typical eval sweep is around 10–20%, and the curve is fairly flat there.

**Q: Do you need overlap with semantic chunking?**
Much less, because semantic chunking places boundaries at genuine topic shifts rather than arbitrary positions. A small overlap is still reasonable insurance since the boundary detection isn't perfect, but the 20% you'd use with fixed-size splitting is unnecessary.

**Q: How do you handle duplicate content from overlap in results?**
Deduplicate at retrieval by checking document ID and character span — if two retrieved chunks overlap substantially, keep the higher-scoring one. Or merge adjacent chunks from the same document into a single contiguous passage before building the prompt, which also gives the model better continuity. For citations, attribute at the section level so overlapping chunks collapse to one reference.

## 9. Common Mistakes

- Using zero overlap on prose, so boundary-spanning facts are unretrievable.
- Using large overlap (40%+) and filling top-k with near-duplicates.
- Adding overlap to structure-aware splits where it's pure waste.
- Not deduplicating overlapping chunks before building the prompt.
- Measuring overlap in characters when chunk size is in tokens.

## 10. What to Remember

- **Repeats the boundary region so straddling facts survive intact.**
- **10–20% of chunk size** for prose; **0%** for structure-aware splits.
- **Too much overlap fills top-k with near-duplicates** and wastes context.
- **It compensates for arbitrary boundaries** — meaningful boundaries don't need it.
- **Deduplicate overlapping results** before prompting, and cite at section level.
