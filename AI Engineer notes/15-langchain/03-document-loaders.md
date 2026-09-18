# Document Loaders

> **Phase 15 · LANGCHAIN · Topic 03**

## 1. Definition

Components that read source content from files, URLs, databases, or cloud storage and return `Document` objects containing page text and metadata. They're the first stage of ingestion and the one whose quality most constrains everything downstream.

## 2. Simple Explanation

A loader turns a PDF, a web page, or a database row into text plus metadata.

It sounds mechanical, and it's where the most damage happens. If a table becomes a jumble of numbers at this stage, no amount of chunking, embedding, or reranking recovers it.

## 3. How It Works

```python
from langchain_community.document_loaders import PyPDFLoader

docs = PyPDFLoader("fee-schedule.pdf").load()
# → [Document(page_content="...", metadata={"source": ..., "page": 0}), ...]
```

**Common loaders:** `PyPDFLoader`, `UnstructuredPDFLoader`, `Docx2txtLoader`, `WebBaseLoader`, `GCSDirectoryLoader`, `BigQueryLoader`, `SQLDatabaseLoader`, `DirectoryLoader`.

**Two behaviours worth knowing:** `load()` returns everything at once; `lazy_load()` yields documents one at a time, which matters for corpora that don't fit in memory.

## 4. Practical Example

**Why loader choice matters more than it looks:**

```
The same banking PDF, three loaders:

PyPDFLoader           fast, plain text extraction
                      → tables collapse into number soup
                      → multi-column layouts interleave
                        wrongly
UnstructuredPDFLoader slower, preserves structure, can
                      identify titles and tables
Document AI (Google)  best on scanned and complex documents,
                      costs per page, handles forms and
                      tables properly

For a fee schedule that IS a table, PyPDFLoader produces
content that will never retrieve correctly no matter what
happens downstream.
```

**That's the point to make:** parsing quality is the ceiling on RAG quality, and it's the stage teams spend the least time on while spending weeks tuning retrieval.

**Metadata set here is what you get forever:**

```python
for d in docs:
    d.metadata.update({
        "doc_id":         doc_id,
        "doc_type":       "fee_schedule",
        "effective_from": "2024-01-01",
        "acl_groups":     ["all-staff"],
        "source_uri":     f"gs://policies/{name}#page={d.metadata['page']}",
        "version":        "4.2",
    })
```

**Missing metadata at load time is very expensive to add later** — it means reprocessing the corpus. Effective dates, ACL groups, and a citable source URI should be attached here, not retrofitted.

**Verification worth doing:** load a sample and actually read the extracted text against the original document. Ten minutes of reading catches parsing failures that would otherwise be discovered after embedding the whole corpus.

## 5. Why It Matters

- **Parsing quality caps RAG quality** — nothing downstream recovers a bad parse.
- **Metadata attached here persists**; adding it later means reprocessing.
- **Reading a sample of extracted text** is the cheapest high-value check available.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Tables destroyed** | Rows and columns flattened into unusable text |
| **Multi-column interleaving** | Text from adjacent columns mixed |
| **Scanned documents** | No text layer; needs OCR |
| **Headers/footers repeated** | Noise in every chunk |
| **Loading everything into memory** | Large corpora need `lazy_load` |
| **Missing metadata** | Requires full reprocessing to add |

**On Document AI:** for a banking corpus with scanned forms, tables, and complex layouts, Google's Document AI is usually worth the per-page cost. It's built for exactly this content, and the alternative isn't a cheaper parse — it's a corpus that doesn't retrieve correctly.

**On headers and footers:** every page carrying "Confidential — Internal Use Only" means that phrase appears in a large share of chunks, adding noise to embeddings and consuming context. Stripping repeated boilerplate at load time is a small, high-value cleaning step.

## 7. Interview Answer

> "Document loaders read source content and return documents with page text and metadata. They sound mechanical, and they're where the most damage happens — parsing quality is the ceiling on RAG quality, and nothing downstream recovers a bad parse.
>
> Concretely: the same banking PDF through PyPDFLoader gives fast plain text extraction where tables collapse into number soup and multi-column layouts interleave wrongly. UnstructuredPDFLoader is slower but preserves structure and can identify titles and tables. Google's Document AI is best on scanned and complex documents at a per-page cost. For a fee schedule that *is* a table, PyPDFLoader produces content that will never retrieve correctly no matter how well I tune retrieval afterwards.
>
> That's the point I'd emphasize: teams spend weeks tuning retrieval and the least time on parsing, when parsing is the constraint. For a banking corpus with scanned forms and tables, Document AI is usually worth the cost — the alternative isn't a cheaper parse, it's a corpus that doesn't retrieve.
>
> The other thing that happens here is metadata. Whatever I attach at load time is what I have forever — doc ID, document type, effective dates, ACL groups, a citable source URI with a page anchor, version. Adding any of those later means reprocessing the whole corpus, so I'd set them at load rather than retrofit.
>
> Two practical things. Strip repeated headers and footers at load — 'Confidential, internal use only' on every page ends up in a large share of chunks, adding noise to embeddings and consuming context for nothing. And use lazy_load for corpora that don't fit in memory, since load pulls everything at once.
>
> The check I'd always do: load a sample and actually read the extracted text against the original document. Ten minutes of reading catches parsing failures that would otherwise be discovered after paying to embed the entire corpus."

## 8. Likely Follow-ups

**Q: Why does loader choice matter so much?**
Because parsing quality is the ceiling on everything downstream. If a table becomes unstructured number soup at load time, no chunking strategy, embedding model, or reranker recovers the information. It's the stage with the most leverage and usually the least attention.

**Q: Which loader for banking PDFs?**
Document AI for scanned forms and complex tables, despite the per-page cost, because it's built for that content. UnstructuredPDFLoader where structure matters but documents are digital. PyPDFLoader only for simple text documents where layout carries no meaning.

**Q: What metadata do you attach at load time?**
Document ID and type, effective-from and effective-to dates, ACL groups, a citable source URI including a page anchor, and the document version. Adding any of these later requires reprocessing the corpus, so they belong at load rather than as a retrofit.

**Q: What cleaning belongs at this stage?**
Stripping repeated headers and footers, page numbers, and boilerplate. A phrase on every page ends up in a large fraction of chunks, adding noise to embeddings and consuming context for no benefit. It's a small step with disproportionate value.

**Q: How do you verify the loader worked?**
Load a sample and read the extracted text against the original documents. Ten minutes of reading catches table collapse, column interleaving, and encoding problems that would otherwise surface only after embedding the full corpus, which is expensive to redo.

## 9. Common Mistakes

- Choosing the fastest loader without checking output quality.
- Not reading a sample of extracted text before full ingestion.
- Omitting effective dates or ACL groups from load-time metadata.
- Leaving repeated headers and footers in the text.
- Using `load()` on corpora that don't fit in memory.

## 10. What to Remember

- **Parsing quality is the ceiling** on everything downstream.
- **Document AI for scanned and table-heavy banking content.**
- **Attach metadata at load** — retrofitting means reprocessing.
- **Strip repeated boilerplate** before chunking.
- **Read a sample of extracted text** — the cheapest high-value check.
