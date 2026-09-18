# Recursive Character Splitting

> **Phase 10 · RAG CHUNKING · Topic 07**

## 1. Definition

Splitting text by trying a prioritized list of separators in order — paragraph breaks, then line breaks, then sentences, then words — and using the largest natural boundary that keeps chunks under the size limit. It's the default in LangChain and the right production default generally.

## 2. Simple Explanation

Ask in order: *can I split on paragraph breaks and stay under the limit?* If not, line breaks. If not, sentences. If not, words. Arbitrary character cuts only as a last resort.

It respects the document's natural structure as far as that structure allows, and costs nothing extra.

## 3. How It Works

```python
separators = ["\n\n", "\n", ". ", " ", ""]   # most → least preferred

def split(text, separators, chunk_size):
    sep, rest = separators[0], separators[1:]
    out = []
    for piece in text.split(sep):
        if length(piece) <= chunk_size:
            out.append(piece)                          # fits — keep whole
        elif rest:
            out.extend(split(piece, rest, chunk_size)) # recurse finer
        else:
            out.extend(hard_split(piece, chunk_size))  # last resort
    return merge_small_adjacent(out, chunk_size)       # pack back up
```

1. Try the highest-priority separator.
2. Pieces that fit are kept.
3. Pieces still too large recurse with the next separator.
4. Adjacent small pieces merge back toward the target size.
5. Overlap applied.

**The separator list is the tuning lever**, and it's what most teams leave at the default.

## 4. Practical Example

**Customizing separators per format — the change that matters most:**

```python
# Markdown — heading levels first
md = ["\n## ", "\n### ", "\n#### ", "\n\n", "\n", ". ", " ", ""]

# Python — definitions first
py = ["\nclass ", "\ndef ", "\n    def ", "\n\n", "\n", " ", ""]

# Legal — clause numbering
legal = ["\nSection ", "\nArticle ", "\n\n", ". ", " ", ""]

# HTML (after conversion to text, or use an HTML-aware splitter)
html = ["</section>", "</div>", "\n\n", ". ", " ", ""]
```

**What the markdown version buys:**

```
Default separators:   a chunk can span the end of "## Fees" and
                      the start of "## Overdraft". Two topics,
                      one blurred embedding.

Markdown separators:  chunks never cross a section boundary.
                      AND you know which heading each chunk came
                      from → enrichment + citation metadata.
```

**Two implementation details that are easy to get wrong:**

```python
splitter = RecursiveCharacterTextSplitter(
    separators=md,
    chunk_size=600,
    chunk_overlap=80,
    length_function=lambda t: len(tokenizer.encode(t)),  # ← TOKENS, not chars
    keep_separator=True,                                 # ← keep the heading
)
```

`length_function` matters because tokens are what your context window and cost are denominated in, and the character-to-token ratio varies a lot by language and content type.

## 5. Why It Matters

- **It's the production default** and the baseline everything else is compared against.
- **It gets most of semantic chunking's benefit for free** on structured documents.
- **The separator list is a high-leverage, low-effort change** that most teams never make.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Default separators on structured docs** | Wastes the heading structure entirely |
| **Measuring in characters** | Chunk sizes vary unpredictably by language and content |
| **Tables shredded** | `\n` is a separator, so table rows get split apart |
| **Still character-based at the leaf** | A paragraph longer than chunk_size gets cut arbitrarily eventually |
| **No semantic awareness** | Two small paragraphs on different topics may merge |
| **Uneven sizes from merging** | Some chunks come out well under target |
| **Heading discarded** | If `keep_separator=False`, you lose the metadata you split on |

**The table problem is the one that actually bites in production.** A markdown table is a run of lines separated by `\n`, so the splitter treats every row boundary as a split point and orphans the header from the data. Tables must be extracted during parsing and routed around the splitter as whole units.

## 7. Interview Answer

> "Recursive character splitting tries a prioritized list of separators — paragraph breaks, then line breaks, then sentences, then words — using the largest natural boundary that keeps chunks under the size limit. Arbitrary cuts only happen as a last resort.
>
> It's the production default because it respects document structure at no extra cost, unlike semantic chunking which needs an embedding call per sentence.
>
> The lever most teams leave untouched is the separator list. The framework default is generic — double newline, newline, space. If my documents are markdown, I'd put heading separators first, so chunks never cross a section boundary. If they're code, I'd split on class and def. That single change is usually worth more than tuning chunk size, because it converts arbitrary boundaries into meaningful ones.
>
> It also gives me the heading I split on, which I then prepend to the chunk for retrieval and store as metadata for citation — so I'd set keep_separator to true rather than discarding it.
>
> Two details I'd get right. Pass a token-based length function rather than using character counts, because tokens are what the context window and cost are denominated in and the ratio varies a lot by language. And route tables around the splitter entirely — a markdown table is lines separated by newlines, so a recursive splitter treats every row boundary as a split point and orphans the header from the data."

## 8. Likely Follow-ups

**Q: How is it different from fixed-size splitting?**
Fixed-size cuts at exact intervals regardless of content, splitting mid-sentence and mid-word. Recursive tries natural boundaries in priority order and only cuts arbitrarily when nothing else fits. Same size target, much better boundaries, essentially the same cost — which is why there's no reason to use fixed-size in production.

**Q: How do you customize it for your documents?**
Reorder the separator list to put the document's real structural markers first — markdown headings, code definitions, legal clause numbers, XML tags. Then set `keep_separator=True` so you retain the boundary marker as metadata. That's a few lines of change and it's usually the highest-value chunking improvement available.

**Q: Characters or tokens for chunk size?**
Tokens. The context window, the embedding model's input limit, and your cost are all denominated in tokens, and the character-to-token ratio varies substantially — code and non-Latin scripts are very different from English prose. Most splitters accept a custom `length_function`, so pass the tokenizer's count.

**Q: How do you handle tables and code?**
Extract them at parse time before splitting, keep them as units, and reinsert as their own chunks. A generic recursive splitter will shred a markdown table because it treats row boundaries as split points. Code should split on function or class boundaries, which means a custom separator list or a language-aware splitter.

**Q: What are its limitations versus semantic chunking?**
It uses formatting as a proxy for topic structure, so it's only as good as the document's formatting. On unstructured prose with no headings and inconsistent paragraphing, it falls back to arbitrary cuts. That's where semantic chunking genuinely wins. But on documents with real structure, the proxy is excellent and free.

## 9. Common Mistakes

- Leaving the default separator list on structured documents.
- Measuring chunk size in characters instead of tokens.
- Letting tables pass through the splitter.
- Discarding the separator you split on, losing the heading metadata.
- Assuming it's semantic — it's structural, using formatting as a proxy for meaning.

## 10. What to Remember

- **Priority-ordered separators; largest natural boundary that fits.**
- **Customize the separator list to your document format** — highest-leverage change here.
- **Measure in tokens**, via a custom length function.
- **Keep the separator** so you retain the heading for enrichment and citation.
- **Route tables and code around it** — newlines as separators will shred them.
