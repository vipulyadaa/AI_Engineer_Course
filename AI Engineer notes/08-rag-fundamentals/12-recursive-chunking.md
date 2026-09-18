# Recursive Chunking

> **Phase 08 · RAG FUNDAMENTALS · Topic 12**

## 1. Definition

Splitting text by trying a prioritized list of separators in order — paragraph breaks first, then line breaks, then sentences, then words — and using the largest natural boundary that keeps chunks under the size limit. It's the sensible default for most RAG pipelines.

## 2. Simple Explanation

Fixed-size splitting cuts at character 600 no matter what's there, including mid-word. Recursive splitting asks: *can I split on paragraph breaks and stay under the limit? No? Then line breaks. Still too big? Sentences. Still too big? Words.*

It respects the document's natural structure as far as that structure allows, and only falls back to arbitrary cuts when it has to.

## 3. How It Works

```python
separators = ["\n\n", "\n", ". ", " ", ""]   # most → least preferred

def split(text, separators, chunk_size):
    sep, rest = separators[0], separators[1:]
    pieces = text.split(sep)

    out = []
    for piece in pieces:
        if len(piece) <= chunk_size:
            out.append(piece)          # fits — keep it whole
        elif rest:
            out.extend(split(piece, rest, chunk_size))   # recurse finer
        else:
            out.extend(hard_split(piece, chunk_size))    # last resort
    return merge_small_adjacent(out, chunk_size)         # pack back up
```

1. Try the highest-priority separator.
2. Any resulting piece that fits, keep.
3. Any piece still too large, recurse with the next separator.
4. Merge adjacent small pieces back up toward the target size.
5. Apply overlap.

**The separator list is the customization point** — that's how you make it structure-aware for a given format.

## 4. Practical Example

**Tuning separators per content type is where the real value is:**

```python
# Markdown — split on heading levels first
md_separators = ["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""]

# Python code — split on definitions
py_separators = ["\nclass ", "\ndef ", "\n\tdef ", "\n\n", "\n", " ", ""]

# Legal documents — split on clause numbering
legal_separators = [r"\nSection ", r"\n\d+\.\d+ ", "\n\n", ". ", " ", ""]
```

**What this buys you concretely:**

```
Document: policy with "## Fees", "## Overdraft", "## Disputes"

❌ Generic ["\n\n", "\n", " "]:
   a chunk can span the end of Fees and the start of Overdraft

✅ Markdown separators ["\n## ", ...]:
   chunks never cross a section boundary; each is one topic
   AND you know which section each chunk came from → citation metadata
```

That second benefit is easy to miss: splitting on headings gives you the heading, which you then prepend to the chunk and store as metadata for citation.

## 5. Why It Matters

- **It's the default in LangChain and most frameworks** (`RecursiveCharacterTextSplitter`), so you'll encounter it constantly.
- **It gets most of semantic chunking's benefit for none of the cost** — no embedding pass at ingestion.
- **The separator list is a real tuning lever** that most teams leave at the default.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Default separators on structured docs** | Leaving `["\n\n", "\n", " ", ""]` on markdown wastes the heading structure |
| **Still character-based at the leaf** | A paragraph longer than chunk_size gets cut arbitrarily eventually |
| **No semantic awareness** | Two paragraphs on different topics may be merged if both are small |
| **Measuring in characters, not tokens** | Chunk size should be denominated in tokens; use a token-length function |
| **Tables destroyed** | `\n` is a separator, so table rows get split. Route tables around the splitter |
| **Uneven chunk sizes** | Merging behavior can produce chunks well under target |

**The table problem is the one that actually bites.** A generic recursive splitter treats a markdown table's newlines as split points and shreds it. Detect tables during parsing and handle them separately, before the text ever reaches the splitter.

## 7. Interview Answer

> "Recursive chunking splits on a prioritized list of separators — paragraph breaks first, then line breaks, then sentences, then words — using the largest natural boundary that keeps the chunk under the size limit. It only falls back to arbitrary cuts when nothing else fits.
>
> It's the sensible default because it respects document structure without costing anything at ingestion, unlike semantic chunking which needs an embedding call per sentence.
>
> The lever most teams leave untouched is the separator list. The framework default is generic — double newline, newline, space — but if my documents are markdown I'd put heading separators first, so chunks never cross a section boundary. If they're code, I'd split on class and def. If they're legal documents, on clause numbering.
>
> That buys two things. Chunks that each cover one topic, so the embedding is specific. And the heading itself, which I then prepend to the chunk for retrieval and store as metadata for citation.
>
> Two details I'd get right. Measure chunk size in tokens, not characters, since tokens are what the context window and cost are denominated in — most splitters accept a custom length function. And route tables around the splitter entirely: a recursive splitter treats a markdown table's newlines as split points and shreds it, orphaning the header row from the data."

## 8. Likely Follow-ups

**Q: How is this different from fixed-size chunking?**
Fixed-size cuts at exact intervals regardless of content, so it splits mid-sentence and mid-word. Recursive tries natural boundaries in priority order and only cuts arbitrarily as a last resort. Same size target, much better boundaries, essentially the same cost.

**Q: How does it compare to semantic chunking?**
Semantic chunking finds boundaries by meaning, which is better on unstructured prose but costs an embedding call per sentence at ingestion. Recursive chunking approximates the same thing using the document's own formatting as a proxy for topic structure — and on documents with headings that proxy is excellent. I'd use recursive by default and semantic only for content with no structure at all.

**Q: How do you customize it for your documents?**
By reordering the separator list to put the document's real structural markers first. Markdown headings, code definitions, legal clause numbers, XML tags. That single change is usually worth more than tuning chunk size, because it converts arbitrary boundaries into meaningful ones.

**Q: How do you handle content the splitter would destroy, like tables?**
Extract it during parsing before splitting, keep it as a unit, and reinsert it as its own chunk. A generic recursive splitter treats table newlines as separators and shreds the table. The parsing stage should emit tables as distinct objects routed around the text splitter entirely.

**Q: Should chunk size be in characters or tokens?**
Tokens, because that's what the context window, the embedding model's limit, and your cost are all denominated in. Characters are a rough proxy that varies by language and content — code and non-Latin scripts have very different character-to-token ratios. Most splitters accept a custom length function, so pass the tokenizer's count.

## 9. Common Mistakes

- Leaving the default separator list on structured documents.
- Measuring chunk size in characters instead of tokens.
- Letting tables pass through the recursive splitter.
- Not capturing the heading you split on as chunk metadata.
- Assuming recursive splitting is semantic — it's structural, using formatting as a proxy.

## 10. What to Remember

- **Try separators in priority order**, largest natural boundary that fits.
- **The default in most frameworks** — and the sensible default in general.
- **Customize the separator list** to your document format. Biggest lever here.
- **Measure in tokens**, not characters.
- **Route tables around it** — newlines as separators will shred them.
