# Parent-Child Retrieval (Chunking View)

> **Phase 10 · RAG CHUNKING · Topic 13**

## 1. Definition

A chunking strategy that produces two linked levels: small children that get embedded and searched, and large parents that get returned to the LLM. It's the standard resolution of the chunk-size trade-off.

## 2. Simple Explanation

You don't have to pick a chunk size.

Index small chunks so the embeddings are precise and retrieval is sharp. When one matches, hand the model the bigger section it came from, so the answer has its context.

Search precision from the small unit, answer completeness from the large one.

## 3. How It Works

**At ingestion:**

```
Document
  └─ Parent chunk (~2000 tokens, one section)  → docstore, keyed by parent_id
       ├─ Child (~300 tokens)  → embedded, indexed, metadata: {parent_id}
       ├─ Child (~300 tokens)  → embedded, indexed, metadata: {parent_id}
       └─ Child (~300 tokens)  → embedded, indexed, metadata: {parent_id}
```

Only children go in the vector index. Parents live in a key-value store.

**At query time:**

```
1. Search children → matching child chunks
2. Collect their parent_ids
3. DEDUPLICATE — many children map to one parent
4. Fetch parents from the docstore
5. Return parents as context
```

**Sizing guidance:**

| | Size | Aligned to |
|---|---|---|
| Child | 200–400 tokens | A paragraph or a few sentences |
| Parent | 1000–2500 tokens | A document section |

Parents should align with **document structure**, not an arbitrary token count — a section is a natural parent, a 2000-token window is not.

## 4. Practical Example

**The failure it fixes:**

```
Child chunk retrieved (300 tokens):
  "The waiver applies when the average daily balance exceeds
   $10,000 during the statement period."

Precise embedding — matched the query well.
But: waiver of WHAT? Which account? The chunk is uninterpretable.

Parent returned (2000 tokens, § 3.4):
  "## 3.4 Monthly Maintenance Fee — Premier Accounts
   Premier accounts are subject to a $12 monthly maintenance fee.
   ...
   The waiver applies when the average daily balance exceeds
   $10,000 during the statement period.
   ...
   Waivers are applied automatically and appear as a credit on
   the following statement."

→ Complete answer, and the section heading gives a clean citation.
```

**Deduplication, with real numbers:**

```
top-10 children retrieved
  → map to only 3 distinct parents
  → return 3 parents (≈6,000 tokens), not 10 copies

Without dedup: the same 2,000-token section sent three times.
Context budget blown on repetition, and repeated content can
bias the model toward the repeated claim.
```

## 5. Why It Matters

- **It's the cleanest answer to "how do you pick chunk size?"** — you largely don't have to.
- **It's often the single highest-value structural change** to a RAG pipeline.
- **Parents align with sections**, which is also the right citation granularity.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **More context tokens** | 4 parents at 2,000 tokens each is 8,000 tokens per query |
| **Extra store to maintain** | The docstore must stay in sync with the vector index |
| **Deduplication is mandatory** | Otherwise repeated sections flood the context |
| **Parent may contain irrelevant material** | You get the whole section, including unrelated parts |
| **Unbounded parent size** | A 20,000-token "section" isn't a usable parent |
| **Ingestion complexity** | Two-level chunking plus ID linkage plus two stores |

**You've traded a precision problem for a volume problem.** That's usually a good trade, but it needs managing: bound parent size, return fewer parents than you would chunks, and consider the sentence-window variant.

**The sentence-window variant:** index individual sentences, return the matched sentence plus N sentences either side. Same principle, much cheaper in context tokens, and no predefined parent hierarchy required. It's often the better default.

## 7. Interview Answer

> "Parent-child retrieval indexes small chunks for precise matching and returns their larger parent to the LLM. It resolves the chunk-size tension directly instead of compromising on a middle value.
>
> The problem it fixes is concrete. A three-hundred-token chunk saying 'the waiver applies when the average daily balance exceeds ten thousand dollars' has a precise embedding and matches the query well — but it doesn't say which fee or which account, so it's uninterpretable alone. Returning the two-thousand-token section it came from gives the model the fee, the account type, and how the waiver is applied.
>
> Implementation: only children go in the vector index, each with a parent_id in metadata. Parents live in a separate key-value docstore. At query time, search children, collect parent IDs, deduplicate, and fetch the parents.
>
> The deduplication step is mandatory and easy to miss. Ten retrieved children often map to only three distinct parents, so without dedup you'd send the same section three times — blowing the context budget on repetition and potentially biasing the model toward the repeated claim.
>
> I'd size parents to document sections rather than an arbitrary token window, because sections are natural units and they're also the right citation granularity.
>
> The honest trade-off is that you've swapped a precision problem for a volume problem — four parents might be eight thousand tokens. The lighter variant I often prefer is sentence-window: index sentences, return the matched sentence plus its neighbours. Most of the context benefit at a fraction of the tokens, and no parent hierarchy to maintain."

## 8. Likely Follow-ups

**Q: What sizes for parent and child?**
Children 200–400 tokens, small enough for precise embeddings. Parents 1,000–2,500 tokens, aligned to document sections rather than a fixed token window. Then tune how many parents you return against your context budget — fewer parents than you'd return chunks, since each carries more.

**Q: Why not just use bigger chunks?**
Because bigger chunks have blurred embeddings — the vector averages across topics and matches each weakly, so the right chunk can lose to a smaller better-focused one elsewhere. Parent-child keeps the sharp embedding of the small chunk while still delivering the full section. You get both properties instead of trading one for the other.

**Q: What's the sentence-window variant?**
Index individual sentences and return the matched sentence plus N sentences either side. Same principle at finer granularity, computed dynamically so there's no parent hierarchy to define or maintain, and much cheaper in context tokens than returning a whole section. I'd often reach for it first.

**Q: How do you handle the extra context cost?**
Return fewer parents — three rather than the eight chunks you might otherwise use, since each parent carries far more. Bound parent size so sections can't be enormous. And consider contextual compression on the parent, trimming it to the query-relevant portion, though that adds latency and another component.

**Q: Does it help citation?**
Yes, usually. Parents typically map to document sections, and citing "Fees Schedule § 3.4" is far more useful to a reader than citing an arbitrary chunk offset. So parent-child tends to improve citation quality as a side effect of aligning retrieval units with document structure.

## 9. Common Mistakes

- Not deduplicating parents, sending the same section repeatedly.
- Sizing parents by token window instead of by document section.
- Letting parent size go unbounded.
- Indexing parents as well as children, wasting index space.
- Letting the docstore and vector index drift out of sync.

## 10. What to Remember

- **Embed small children, return large parents.** Precision in search, context in the prompt.
- **Only children are indexed**; parents live in a docstore keyed by ID.
- **Deduplicate parents** — many children map to one.
- **Size parents to document sections**, which is also the right citation unit.
- **Sentence-window is the lighter variant** and often the better default.
