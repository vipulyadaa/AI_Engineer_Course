# Failure Mode: Bad Chunking

> **Phase 13 · RAG FAILURE MODES · Topic 02**

## 1. Definition

Chunk boundaries that split facts, blur embeddings, or destroy structure. Like parsing, the damage is done at ingestion — retrieval can only find what chunking created, in the form it created it.

## 2. Simple Explanation

Chunking decides what the atomic unit of retrieval is. Get it wrong and you either have fragments that can't be interpreted, or blurred blobs that can't be found precisely.

The two failures are opposite, have different signatures, and need opposite fixes — so the first job is telling them apart.

## 3. How It Works

**The two failures and how to distinguish them:**

| | Too small | Too large |
|---|---|---|
| **Signature** | Retrieved chunks relevant but fragmentary; model can't answer | Correct content exists but ranks poorly; recall@20 ≫ recall@5 |
| **Cause** | Facts split across boundaries; lost referents | Embedding averages multiple topics |
| **Fix direction** | Larger, or parent-child, or enrichment | Smaller, or structure-aware splitting |

**The other chunking failures, which aren't about size at all:**

```
· Tables shredded — newlines treated as split points
· Code split mid-function
· No overlap — facts straddling boundaries incomplete in both chunks
· No enrichment — chunks lack the heading that gave them their topic
· Uniform strategy across content types
· Chunk size exceeding the embedding model's input limit
  → silent truncation; the tail is indexed and unretrievable
```

**That last one is worth checking first**, because it's free to verify and it produces exactly the "too large" signature for a completely different reason.

## 4. Practical Example

**The failure that enrichment fixes for free:**

```
Chunk (300 tokens):
  "The waiver applies when the average daily balance exceeds
   $10,000 during the statement period."

Query: "how do I avoid the Premier monthly fee?"
  → Poor match. The chunk never says "Premier", "monthly", or
    "fee" in a way connecting it to the question. The heading did.
  → And even if retrieved, the model can't tell WHICH fee.

Fix (free, no re-chunking):
  "Retail Banking Policy > 3.4 Monthly Maintenance Fee — Premier
   Accounts

   The waiver applies when the average daily balance exceeds
   $10,000 during the statement period."
  → Strong match, and interpretable.
```

**The blur failure:**

```
2000-token chunk covering fees, eligibility, disputes, and transfers.
Its vector sits at the centroid of all four.

Query: "how do I dispute a transaction?"
  → this chunk scores 0.68
  → a dedicated 400-token disputes FAQ from a DIFFERENT document
    scores 0.87 and wins
  → the product-specific answer never surfaces
```

## 5. Why It Matters

- **It's the highest-leverage ingestion decision** and the most common source of mediocre retrieval.
- **The two size failures need opposite fixes**, so misdiagnosis makes things worse.
- **Enrichment often fixes it without re-chunking**, which saves a full re-index.

## 6. Trade-offs / Failure Modes

**The fix ladder, cheapest first:**

```
1. Check chunk_size < embedding_model.max_input   ← free, often the cause
2. Add title + section heading enrichment          ← free, big recall gain
3. Add 10-20% overlap if there is none
4. Switch to structure-aware splitting (markdown headings, code defs)
5. Route tables and code around the text splitter
6. Parent-child retrieval — resolves the size tension entirely
7. Only then: sweep chunk size against an eval set
```

**Most teams start at step 7 and skip 1–3**, which is backwards — the cheap steps often make the sweep unnecessary.

**On diagnosis:** read the retrieved chunks for failing questions. Fragments that are individually relevant but incomplete means too small. Chunks that are mostly irrelevant filler with the answer buried means too large. This takes ten minutes and is more informative than any metric.

## 7. Interview Answer

> "Bad chunking is boundaries that split facts, blur embeddings, or destroy structure. Like parsing, the damage happens at ingestion — retrieval can only find what chunking created, in the form it created it.
>
> There are two opposite size failures with different signatures. Too small: retrieved chunks are individually relevant but fragmentary, and the model can't assemble an answer. Too large: the correct content exists but ranks poorly, and recall at twenty is much better than recall at five — the embedding averaged across topics so the chunk matches everything weakly.
>
> Distinguishing them matters because the fixes are opposite. And the diagnosis is simple: read the retrieved chunks for failing questions. Ten minutes of reading is more informative than any metric.
>
> But before resizing anything, I'd check two cheap things. First, whether chunk size exceeds the embedding model's input limit — if it does, the tail of every chunk is silently truncated from the embedding, which produces exactly the too-large signature for a completely different reason. Second, whether chunks carry their heading breadcrumb. A chunk saying 'the waiver applies when the average daily balance exceeds ten thousand dollars' matches a Premier monthly fee query poorly because the chunk never says Premier or monthly — the heading did. Prepending the breadcrumb fixes that at zero cost with no re-chunking.
>
> Most teams jump straight to sweeping chunk size and skip those. The cheap steps often make the sweep unnecessary.
>
> And the failures that aren't about size at all — tables shredded by newline splitting, code split mid-function — need routing around the splitter entirely, not a different size."

## 8. Likely Follow-ups

**Q: How do you tell too small from too large?**
Read the retrieved chunks for failing questions. Fragments that are relevant but incomplete means too small. Mostly-irrelevant filler with the answer buried means too large. Quantitatively, a large gap between recall@20 and recall@5 points to blur, which is the too-large signature.

**Q: What would you try before changing chunk size?**
Check that chunk size is under the embedding model's input limit, because silent truncation mimics the too-large failure. Then add title and section heading enrichment, which is free and often the largest single recall gain. Then check overlap exists. Those three cost nothing and frequently make a resize unnecessary.

**Q: How do you handle tables and code?**
Route them around the text splitter entirely. A markdown table is lines separated by newlines, which a generic splitter treats as boundaries — it orphans the header from the data. Extract tables during parsing and keep them whole; split code on function or class boundaries with a language-aware parser.

**Q: What's the cleanest fix for the size tension?**
Parent-child retrieval — embed small chunks for precise matching, return their larger parent section for context. It resolves the trade-off rather than compromising on a middle value. If I find myself agonizing over the exact token count, that's the signal to use parent-child instead of tuning harder.

**Q: How do you validate a chunking change?**
Sweep against an eval set measuring recall@k and groundedness, and read a sample of chunks by hand. The eval set catches quality changes; reading catches structural damage like shredded tables that a metric might not register. And I'd check chunks-per-document before and after, since an unexpected change there signals something structural broke.

## 9. Common Mistakes

- Sweeping chunk size before checking the embedding model's input limit.
- Resizing when enrichment would have fixed the matching problem for free.
- Applying one strategy to prose, tables, and code alike.
- Zero overlap on continuous prose.
- Diagnosing from metrics without reading the retrieved chunks.

## 10. What to Remember

- **Two opposite size failures** with different signatures and opposite fixes.
- **Check `chunk_size < model max input` first** — truncation mimics the too-large failure.
- **Enrichment before resizing** — title + heading breadcrumb, free, big gain.
- **Tables and code need routing around the splitter**, not a different size.
- **Read the retrieved chunks.** Ten minutes beats any metric for diagnosis.
