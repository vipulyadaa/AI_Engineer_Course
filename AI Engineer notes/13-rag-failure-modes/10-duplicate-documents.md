# Failure Mode: Duplicate Documents

> **Phase 13 · RAG FAILURE MODES · Topic 10**

## 1. Definition

The same or near-identical content appearing multiple times in the index — from multiple sources, overlapping chunks, or repeated ingestion. Duplicates consume top-k slots with redundant information and can bias the model toward the repeated claim.

## 2. Simple Explanation

You retrieve five chunks and three of them say the same thing.

You've spent three of five context slots on one fact, lost the distinct information those slots could have carried, and given the model the same claim three times — which makes it look more strongly supported than it is.

## 3. How It Works

**Four sources of duplication:**

| Source | Example |
|---|---|
| **Multiple systems** | The same policy in SharePoint and on a file share |
| **Chunk overlap** | 20% overlap means adjacent chunks share content by design |
| **Repeated ingestion** | Re-ingested without deduplication or ID stability |
| **Near-duplicates** | Same document, minor edits, different formatting |

**Detection, by type:**

```
Exact duplicates    → content hash. Free.
Near-duplicates     → embedding similarity above a high threshold
                      (e.g. cosine > 0.97), clustered.
Overlap duplicates  → document ID + character span comparison.
```

**Where to deduplicate — both places, for different reasons:**

```
INGESTION: collapse duplicate source documents to one canonical copy.
           Reduces index size and prevents the problem at source.

RETRIEVAL: collapse overlapping/near-duplicate results before
           building the prompt. Necessary because overlap
           duplication is intentional and can't be removed at ingestion.
```

## 4. Practical Example

**The context-slot waste:**

```
top-5 retrieved for "international wire fee":
  [1] "International transfers: $45 retail, $25 Premier."       (SharePoint)
  [2] "International transfers: $45 retail, $25 Premier."       (file share)
  [3] "...subject to a fee. International transfers: $45..."    (overlap w/ [1])
  [4] "Premier waiver: first two per month."
  [5] "Domestic wire: $25."

Three slots carry one fact. The waiver condition in [4] barely
made the cut. Deduplicating frees two slots for distinct content.
```

**The bias effect:**

```
The model sees "$45 retail" three times and "first two per month
waived" once. Repetition is a weak signal of importance, and the
answer may emphasize the fee while under-weighting the waiver.
```

**Retrieval-time deduplication:**

```python
def dedupe(results, sim_threshold=0.95):
    kept = []
    for r in sorted(results, key=lambda x: -x.score):
        # skip if it overlaps an already-kept chunk by span...
        if any(same_doc_overlap(r, k) for k in kept):
            continue
        # ...or is near-identical in content
        if any(cosine(r.vec, k.vec) > sim_threshold for k in kept):
            continue
        kept.append(r)
    return kept
```

## 5. Why It Matters

- **It silently reduces effective k** — you asked for five distinct chunks and got three.
- **Repetition can bias the answer** toward the duplicated claim.
- **It inflates index size and cost** without adding retrievable information.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No exact-duplicate detection** | Free to fix; commonly skipped |
| **Near-duplicates undetected** | Formatting differences defeat hashing |
| **No retrieval-time dedup** | Overlap duplication can't be fixed at ingestion |
| **Over-aggressive dedup** | Two genuinely different chunks that happen to be similar get collapsed |
| **Losing the canonical source** | Deduping without recording which copy is authoritative |
| **Citation ambiguity** | The same fact in two documents — which do you cite? |

**On canonical selection:** when collapsing duplicates at ingestion, record which copy is canonical and keep the others as aliases in metadata. Otherwise you may keep the copy from a deprecated system and cite it, pointing users at the wrong source of truth.

**On over-aggressive deduplication:** a threshold too low collapses genuinely distinct chunks. Two consecutive sections of a policy can be textually similar while saying different things. Combining span-overlap checking with a *high* similarity threshold is safer than similarity alone.

## 7. Interview Answer

> "Duplicate documents means the same or near-identical content appearing multiple times in the index, and the direct cost is that it consumes top-k slots with redundant information.
>
> If I retrieve five chunks and three say the same thing, I've spent three of five slots on one fact and lost the distinct information those slots could have carried. In a concrete case, the fee appears three times and the waiver condition barely makes the cut — so the answer emphasizes the fee and under-weights the exception.
>
> There's also a subtler effect: repetition is a weak signal of importance to the model, so seeing the same claim three times can bias the answer toward it.
>
> It comes from four sources. The same document in multiple systems — SharePoint and a file share. Chunk overlap, which is intentional. Repeated ingestion without stable IDs. And near-duplicates where the same document has minor edits or different formatting.
>
> So I'd deduplicate in two places. At ingestion, collapse duplicate source documents to one canonical copy — content hashing catches exact duplicates for free, and embedding similarity above a high threshold catches near-duplicates. At retrieval, collapse overlapping and near-identical results before building the prompt, because overlap duplication is by design and can't be removed at ingestion.
>
> Two cautions. When collapsing at ingestion, record which copy is canonical — otherwise you might keep the copy from a deprecated system and cite users to the wrong source of truth. And don't set the similarity threshold too low: two consecutive policy sections can be textually similar while saying different things, so I'd combine span-overlap checking with a high similarity threshold rather than relying on similarity alone."

## 8. Likely Follow-ups

**Q: How do you detect near-duplicates?**
Embedding similarity above a high threshold — cosine above about 0.97 — clustered so a group of near-identical chunks collapses to one. Exact duplicates are caught by content hashing for free. Overlap duplicates need document ID and character span comparison rather than similarity, since they're partial rather than whole-chunk matches.

**Q: Why deduplicate at retrieval if you did it at ingestion?**
Because chunk overlap is intentional — you deliberately create overlapping chunks so boundary-spanning facts stay intact. You can't remove that at ingestion without losing the benefit. So retrieval-time deduplication is necessary regardless of how clean the index is.

**Q: What's the risk of over-deduplicating?**
Collapsing genuinely distinct chunks. Two consecutive sections of a policy can be textually very similar while saying different things — a fee section for one product and the next for another. I'd use a high similarity threshold and combine it with span-overlap checking rather than relying on similarity alone.

**Q: How does duplication affect citations?**
It creates ambiguity — the same fact in two documents means two possible citations, and if one is from a deprecated system you'd be pointing users at the wrong source of truth. That's why canonical selection at ingestion matters: record which copy is authoritative and keep the others as aliases in metadata.

**Q: Does duplication affect anything besides top-k?**
Index size and embedding cost, proportionally. And it can skew retrieval statistics — if the same content appears five times, it's more likely that *some* copy ranks highly, which makes that content over-represented relative to unique content. That's a subtle ranking distortion on top of the context-slot waste.

## 9. Common Mistakes

- No exact-duplicate detection, which is free.
- Deduplicating only at ingestion, ignoring overlap duplication at retrieval.
- Similarity threshold set too low, collapsing distinct chunks.
- Not recording which copy is canonical, leading to citations to deprecated sources.
- Not realizing duplicates silently reduce effective k.

## 10. What to Remember

- **Duplicates consume top-k slots** with redundant content and silently reduce effective k.
- **Repetition can bias the answer** toward the duplicated claim.
- **Deduplicate in two places:** ingestion (source duplicates) and retrieval (overlap).
- **Hash for exact, high-threshold embedding similarity for near-duplicates, span comparison for overlap.**
- **Record the canonical copy** or you'll cite a deprecated source.
