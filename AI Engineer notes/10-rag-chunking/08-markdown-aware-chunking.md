# Markdown-Aware Chunking

> **Phase 10 · RAG CHUNKING · Topic 08**

## 1. Definition

Splitting on markdown structure — heading levels, lists, code blocks, tables — rather than on character counts. It produces chunks that are one topic each and supplies the heading breadcrumb for enrichment and citation.

## 2. Simple Explanation

Markdown already tells you where topics begin and end. `## Fees` starts a topic; `## Overdraft Protection` starts a different one. Splitting anywhere other than those boundaries throws away information the document handed you for free.

And the headings are useful twice: as boundaries, and as the context each chunk needs to be interpretable.

## 3. How It Works

1. **Parse the heading hierarchy** — track the current H1 > H2 > H3 path as you walk the document.
2. **Split at heading boundaries**, at the deepest level that keeps chunks under the size limit.
3. **Attach the breadcrumb** to each chunk as metadata *and* prepend it to the text before embedding.
4. **Protect code blocks and tables** — never split inside a fenced block or a table.
5. **Fall back to recursive splitting** within any section that's still too large.

```
# Retail Banking Policy
## 3. Fees
### 3.2 International Transfers
Content here...

→ chunk metadata: {h1: "Retail Banking Policy",
                   h2: "3. Fees",
                   h3: "3.2 International Transfers"}
→ chunk text: "Retail Banking Policy > 3. Fees > 3.2 International
               Transfers\n\nContent here..."
```

**That prepended breadcrumb is the main win**, and it's larger than the boundary improvement.

## 4. Practical Example

**The retrieval difference:**

```
Raw chunk:
  "The fee is $45 for retail accounts and $25 for Premier."

  Query: "international wire transfer cost"
  → Weak match. The chunk never says "wire" or "international".

With breadcrumb prepended:
  "Retail Banking Policy > 3. Fees > 3.2 International Transfers

   The fee is $45 for retail accounts and $25 for Premier."

  → Strong match. The heading supplied the topic the body assumed.
```

**And citation comes for free:**

```
Answer: "International wires cost $45 for retail accounts [1]."
[1] Retail Banking Policy § 3.2 International Transfers

Section-level citation is far more useful to a reader than a
chunk offset — they can find it in the source document.
```

**Code blocks and tables must be protected:**

```python
# Wrong: the splitter sees \n inside the fence and splits there
```
| Type          | Retail | Premier |
|---------------|--------|---------|
| Domestic wire | $25    | $0      |
```

# Right: detect fenced blocks and table regions during parsing,
# treat each as an atomic unit that never splits internally.
```

## 5. Why It Matters

- **Markdown is the common internal format** — documentation, wikis, and most parsers emit it.
- **The breadcrumb prepend is one of the cheapest large recall gains** available in RAG.
- **It gives you section-level citation**, which is what compliance reviewers actually want.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Sections vary wildly in size** | One section is 80 tokens, another is 6,000. Needs a size fallback |
| **Deep nesting** | H5/H6 sections may be too small to be useful alone; merge with parents |
| **Inconsistent heading use** | Documents that use bold text instead of headings defeat it |
| **Code blocks split** | A fenced block's newlines look like separators |
| **Tables split** | Same problem; header orphaned from rows |
| **Converted markdown is unreliable** | HTML-to-markdown conversion often produces inconsistent heading levels |
| **Breadcrumb added twice** | Once as metadata and once in text is correct; adding it to both the parent and child chunk text duplicates it |

**The size-variance problem needs an explicit policy:**

```
if section < min_size:   merge with the next sibling section
if section > max_size:   split recursively WITHIN the section,
                         repeating the breadcrumb on each piece
```

## 7. Interview Answer

> "Markdown-aware chunking splits on heading structure rather than character counts. Markdown already tells you where topics begin and end, so splitting anywhere else discards information the document gave you for free.
>
> The mechanics are: track the heading hierarchy as you walk the document, split at heading boundaries at the deepest level that keeps chunks under the size limit, and attach the breadcrumb path to each chunk.
>
> The biggest win isn't actually the boundaries — it's prepending that breadcrumb to the chunk text before embedding. A chunk saying 'the fee is forty-five dollars for retail accounts' matches a query about international wire costs poorly, because the chunk never says 'wire' or 'international' — the heading did. Prepending 'Retail Banking Policy, Fees, International Transfers' fixes that completely, and it's essentially free.
>
> It also gives me section-level citation, which is what a compliance reviewer actually wants — they can open the policy at section 3.2 rather than being pointed at a chunk offset.
>
> Two things to handle. Sections vary enormously in size — one might be eighty tokens and another six thousand — so I need an explicit policy: merge undersized sections with siblings, and recursively split oversized ones while repeating the breadcrumb on each piece. And code blocks and tables must be protected, because their internal newlines look like split points to a generic splitter."

## 8. Likely Follow-ups

**Q: What's the biggest benefit — boundaries or breadcrumbs?**
Breadcrumbs, by a clear margin. Good boundaries prevent chunks spanning two topics, which matters. But prepending the heading path gives each chunk the vocabulary that connects it to user questions, and that consistently moves recall more. It's also the part that works even if your boundaries are imperfect.

**Q: How do you handle sections of very different sizes?**
An explicit policy at both ends. Below a minimum, merge the section with an adjacent sibling so you don't index a heading with two sentences under it. Above a maximum, split recursively within the section and repeat the breadcrumb on each resulting piece so all of them keep their context.

**Q: What if documents don't use consistent headings?**
Then markdown-aware splitting degrades toward recursive splitting, which is a fine fallback. The realistic case is documents converted from HTML or Word, where heading levels are often inconsistent or expressed as bold text. I'd normalize during parsing where possible, and fall back gracefully rather than assuming structure exists.

**Q: How do you keep code blocks and tables intact?**
Detect them during parsing as atomic regions and exclude them from the splitter's separator matching. A fenced code block and a markdown table are both runs of newline-separated lines, which is exactly what a generic splitter treats as boundaries. Handle them as units, and if a table must be split, repeat the header row on each piece.

**Q: Should the breadcrumb go in the text or the metadata?**
Both, for different purposes. In the metadata for filtering and citation. In the text — prepended before embedding — so it influences the vector. Metadata alone doesn't help retrieval, because metadata isn't embedded. That distinction is worth being explicit about.

## 9. Common Mistakes

- Using the heading only as a boundary and not prepending it to the chunk text.
- Storing the breadcrumb only in metadata, where it doesn't affect the embedding.
- Not handling size variance between sections.
- Letting code blocks and tables pass through the splitter.
- Assuming converted markdown has consistent heading levels.

## 10. What to Remember

- **Split on heading hierarchy**, falling back to recursive within oversized sections.
- **Prepend the breadcrumb to the chunk text** before embedding — the biggest win, and free.
- **Store it in metadata too**, for filtering and section-level citation.
- **Protect code blocks and tables** as atomic units.
- **Handle size variance explicitly** — merge small sections, split large ones with repeated breadcrumbs.
