# Parent-Child Retrieval

> **Phase 09 · ADVANCED RAG · Topic 09**

## 1. Definition

Embedding small chunks for precise matching but returning their larger parent chunk to the LLM. It resolves the chunk-size tension directly: search precision from the small unit, context completeness from the large one.

## 2. Simple Explanation

Chunk size forces a bad choice. Small chunks embed precisely but lack context. Large chunks have context but their embeddings blur across topics.

Parent-child says: don't choose. Index the small chunks so retrieval is sharp, but when one matches, hand the model the whole section it came from.

## 3. How It Works

```
INGEST
  Document
    └─ Parent chunk (~2000 tokens, one full section)
         ├─ Child chunk (~300 tokens)  → embedded & indexed
         ├─ Child chunk (~300 tokens)  → embedded & indexed
         └─ Child chunk (~300 tokens)  → embedded & indexed

  Only children go in the vector index.
  Parents are stored in a docstore, keyed by parent_id.
  Each child's metadata carries its parent_id.

QUERY
  1. Search the child index → matching children
  2. Look up their parent_ids
  3. Deduplicate (several children often share a parent)
  4. Return the parents to the LLM
```

**The variant worth knowing — "sentence window":** index individual sentences, return the sentence plus N sentences either side. Same principle, finer granularity, and it doesn't need a predefined parent structure.

## 4. Practical Example

**Where naive chunking fails and this succeeds:**

```
Query: "What's the waiver threshold?"

300-token chunk that matches (precise embedding):
  "...the waiver applies when the average daily balance exceeds
   $10,000 during the statement period."
  → Retrieved correctly, but: waiver of WHAT? Which account type?
    The chunk is precise and uninterpretable.

2000-token parent returned instead:
  "## 3.4 Monthly Maintenance Fee — Premier Accounts
   Premier accounts are subject to a $12 monthly maintenance fee.
   ...
   The waiver applies when the average daily balance exceeds $10,000
   during the statement period.
   ...
   Waivers are applied automatically and appear on the following statement."
  → Now the model can answer completely and cite the section.
```

**The deduplication step is essential:**

```
top-10 children retrieved → they map to only 3 distinct parents
→ return 3 parents, not 10

Without dedup, you'd send the same 2000-token section three times
and blow the context budget on repetition.
```

## 5. Why It Matters

- **It's the cleanest resolution of the chunk-size trade-off**, and often the single highest-value structural change to a RAG pipeline.
- **It lets you use genuinely small chunks** for embedding precision without the usual context penalty.
- **It pairs naturally with document structure** — parents map to sections, which is also your citation unit.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **More context tokens per result** | Parents are large; 4 parents may be 8000 tokens |
| **Requires a docstore** | Parents live outside the vector index; another store to maintain |
| **Dedup is mandatory** | Multiple children per parent otherwise duplicates content |
| **Parent may contain irrelevant material** | You get the whole section including parts unrelated to the question |
| **Ingestion complexity** | Two-level chunking plus ID linkage plus two stores |
| **Parent size must be bounded** | A 20,000-token "section" isn't a usable parent |

**The context-budget tension is the real trade-off.** You've traded a precision problem for a volume problem. If parents are large, you can afford fewer of them — which may be fine, since each contains more. I'd tune the parent size and the number of parents returned together against an eval set.

**The middle ground:** rather than returning the full parent, return the matched child plus its immediate neighbours (sentence-window style). You get most of the context benefit at a fraction of the token cost.

## 7. Interview Answer

> "Parent-child retrieval embeds small chunks for precise matching but returns the larger parent chunk to the LLM. It resolves the chunk-size tension directly rather than compromising on it.
>
> The problem is that small chunks embed precisely but lack context, and large chunks have context but blur across topics. Concretely, a three-hundred-token chunk saying 'the waiver applies when the average daily balance exceeds ten thousand dollars' retrieves precisely — but waiver of what, on which account type? It's precise and uninterpretable. Returning the two-thousand-token section it came from gives the model the fee it's a waiver for, the account type, and how it's applied.
>
> Implementation is: index only the children with a parent_id in their metadata, store parents in a separate docstore, then at query time look up parent IDs for the matching children, deduplicate, and return the parents.
>
> The deduplication step is essential and easy to miss. Ten retrieved children often map to only three distinct parents, and without dedup you'd send the same section three times and blow the context budget on repetition.
>
> The trade-off I'd name honestly is that you've swapped a precision problem for a volume problem — four parents might be eight thousand tokens. So I'd tune parent size and the number returned together. A middle ground that often works better is returning the matched child plus its immediate neighbours rather than the whole parent — most of the context benefit at a fraction of the tokens."

## 8. Likely Follow-ups

**Q: How do you choose parent and child sizes?**
Children small enough for precise embeddings, typically 200–400 tokens. Parents large enough to be self-contained, ideally aligned with document structure — one section per parent rather than an arbitrary token count. Then tune the number of parents returned against your context budget, measuring recall and groundedness on an eval set.

**Q: What's the sentence-window variant?**
Index individual sentences and return the matched sentence plus N sentences on either side. It's the same principle at finer granularity, and it doesn't require a predefined parent hierarchy — the window is computed dynamically. It's cheaper in context tokens than returning a full parent and often works just as well.

**Q: Why do you need a separate docstore?**
Because parents aren't embedded, so they don't belong in the vector index — storing them there wastes space and you'd never search them. A key-value store keyed by parent_id is enough. It's an extra component to maintain and keep in sync with the vector index, which is the main operational cost of the pattern.

**Q: What if the parent contains mostly irrelevant content?**
That's the honest downside — you get the whole section including parts unrelated to the question. Mitigations: bound parent size so sections are genuinely focused, use contextual compression to strip irrelevant sentences from the parent before prompting, or use the sentence-window variant which returns only the neighbourhood of the match rather than everything.

**Q: How does this interact with citation?**
Well, usually — parents typically map to document sections, which is the natural citation unit. Citing "Fees Schedule § 3.4" is more useful to a reader than citing an arbitrary chunk offset. So parent-child often improves citation quality as a side effect, which is worth mentioning.

## 9. Common Mistakes

- Forgetting to deduplicate parents, sending the same section multiple times.
- Making parents so large they blow the context budget.
- Indexing parents as well as children, wasting index space.
- Not bounding parent size, so a "section" can be 20,000 tokens.
- Keeping the docstore and vector index out of sync.

## 10. What to Remember

- **Embed small children, return large parents.** Precision in search, context in the prompt.
- **Only children go in the vector index**; parents live in a docstore keyed by ID.
- **Deduplicate parents** — many children map to one parent.
- **You've traded precision for volume** — tune parent size and count against the context budget.
- **Sentence-window is the lighter variant**: matched sentence plus neighbours.
