# Text Splitters

> **Phase 15 · LANGCHAIN · Topic 04**

## 1. Definition

Components that break loaded documents into chunks sized for embedding and retrieval, ideally respecting structural boundaries so that each chunk is a coherent unit of meaning.

> Chunking strategy in depth is in [10-rag-chunking](../10-rag-chunking/). This topic is the LangChain implementation and its defaults.

## 2. Simple Explanation

Documents are too long to embed as one vector, so they get split. Where you split determines whether each chunk makes sense on its own.

The splitter's job is finding boundaries that don't cut through the middle of a rule, a table row, or a sentence that qualifies the one before it.

## 3. How It Works

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "],
    length_function=count_tokens,      # ← not len
)
chunks = splitter.split_documents(docs)
```

**`RecursiveCharacterTextSplitter` is the sensible default.** It tries separators in order — paragraph breaks before line breaks before sentences — so it cuts at the largest natural boundary that fits.

**Other splitters:** `MarkdownHeaderTextSplitter` (splits by heading and puts the heading path in metadata), `HTMLHeaderTextSplitter`, `RecursiveJsonSplitter`, and language-aware code splitters.

## 4. Practical Example

**Two defaults worth overriding:**

```
1. length_function = len  (characters, not tokens)
   chunk_size=1000 means 1000 CHARACTERS ≈ 250 tokens.
   If you reasoned about the embedding model's token limit,
   you're off by 4×.
   → pass a real token counter

2. separators do not include markdown headings
   The default list starts at "\n\n". For structured policy
   documents, splitting on "\n## " first keeps sections intact.
   → customize the separator list to your corpus
```

**The highest-value addition isn't a splitter setting at all:**

```python
for c in chunks:
    c.page_content = (
        f"[{c.metadata['doc_title']} > {c.metadata['section']}]\n\n"
        + c.page_content
    )
```

```
A chunk reading "This fee is waived for the first two
transactions per calendar month" is unretrievable — no
mention of which fee, or which product.

Prefixed with "[Fee Schedule v4.2 > International Transfers]"
it becomes retrievable AND the model can interpret it
correctly in context.

MarkdownHeaderTextSplitter puts the heading path in metadata;
prefixing it into the embedded text is what makes it affect
retrieval.
```

**That distinction — metadata versus embedded text — is the point.** Metadata is filterable but not searchable. Only text that's embedded influences similarity.

## 5. Why It Matters

- **The character-vs-token default** silently makes chunks a quarter of the intended size.
- **Structure-aware separators** keep policy sections intact.
- **Breadcrumb prefixing into embedded text** is the highest-value chunking change.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Character-based length** | Chunks ~4× smaller than intended |
| **Default separators** | Splits mid-section on structured documents |
| **No overlap** | Content at boundaries becomes unretrievable |
| **Excessive overlap** | Duplicate content across chunks; wasted context |
| **Tables split across chunks** | Rows separated from headers |
| **Metadata assumed searchable** | It isn't — only embedded text is |

**On tables:** a recursive character splitter will cut a table mid-way, separating rows from their header. For a fee schedule that's fatal — a chunk of numbers with no column labels means nothing. Table-aware handling, or keeping small tables whole regardless of chunk size, is worth special-casing.

**On overlap:** 10–20% of chunk size is a reasonable default. Its purpose is ensuring that a sentence spanning a boundary appears completely in at least one chunk. More than that duplicates content across many chunks, which wastes context and can cause near-duplicates to fill top-k.

## 7. Interview Answer

> "Text splitters break documents into chunks sized for embedding. RecursiveCharacterTextSplitter is the sensible default — it tries separators in order, paragraph breaks before line breaks before sentences, so it cuts at the largest natural boundary that fits.
>
> Two defaults I'd always override. First, length_function defaults to character count, not tokens. So chunk_size of a thousand means a thousand characters, roughly two hundred and fifty tokens — if you sized chunks against the embedding model's token limit, you're off by four times and everything downstream is smaller than intended. I'd pass a real token counter.
>
> Second, the default separator list starts at double newline and doesn't know about markdown headings. For structured policy documents I'd put heading separators first, so sections stay intact rather than being cut mid-rule.
>
> But the highest-value change isn't a splitter setting. It's prefixing a breadcrumb into the chunk text before embedding. A chunk reading 'this fee is waived for the first two transactions per calendar month' is unretrievable — it doesn't say which fee or which product. Prefixed with 'Fee Schedule v4.2, International Transfers' it becomes retrievable and the model can interpret it correctly.
>
> And the distinction that matters there: MarkdownHeaderTextSplitter puts the heading path in metadata, but metadata is filterable, not searchable. Only text that's actually embedded influences similarity. So the breadcrumb has to go into page_content, not just metadata — that's a mistake I'd specifically watch for.
>
> On overlap, ten to twenty percent of chunk size. Its purpose is making sure a sentence spanning a boundary appears completely somewhere. More than that duplicates content across chunks, wastes context, and lets near-duplicates fill top-k.
>
> And tables need special-casing. A recursive character splitter cuts a table mid-way, separating rows from their header — for a fee schedule that's fatal, since a chunk of numbers with no column labels means nothing. I'd keep small tables whole regardless of chunk size."

## 8. Likely Follow-ups

**Q: What's wrong with the default length function?**
It counts characters, not tokens. A chunk_size of 1000 gives roughly 250 tokens, so if you sized chunks against the embedding model's token limit you're off by about four times. Passing a real token counter is a one-line fix that most people miss.

**Q: What's the highest-value change to chunking?**
Prefixing a breadcrumb — document title and section path — into the chunk text before embedding. It makes chunks that reference "this fee" self-contained, both for retrieval and for the model's interpretation. It's small and it changes retrieval quality materially.

**Q: Isn't the heading already in metadata?**
It is, but metadata is filterable, not searchable. Only text that's actually embedded affects similarity, so a heading in metadata doesn't help retrieval at all. It has to be in page_content to influence the vector.

**Q: How much overlap?**
Ten to twenty percent of chunk size. The purpose is ensuring a sentence spanning a boundary appears completely in at least one chunk. Beyond that you duplicate content, waste context, and risk near-duplicate chunks filling the top-k slots.

**Q: How do you handle tables?**
Special-case them. A recursive character splitter cuts through a table, separating rows from headers, which makes the numbers meaningless. I'd keep small tables whole regardless of chunk size, and for large ones repeat the header row in each piece.

## 9. Common Mistakes

- Leaving `length_function` as character count.
- Using default separators on structured documents.
- Putting the heading path only in metadata and expecting it to help retrieval.
- Setting overlap far higher than needed.
- Letting the splitter cut tables.

## 10. What to Remember

- **`RecursiveCharacterTextSplitter` with custom separators** for structured docs.
- **Pass a token counter** — the default counts characters.
- **Prefix breadcrumbs into `page_content`**, not just metadata.
- **Metadata is filterable, not searchable.**
- **10–20% overlap**, and special-case tables.
