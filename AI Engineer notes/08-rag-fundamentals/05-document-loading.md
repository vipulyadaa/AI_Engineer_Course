# Document Loading

> **Phase 08 · RAG FUNDAMENTALS · Topic 05**

## 1. Definition

The first ingestion stage: pulling raw content from its source systems — file storage, wikis, databases, APIs, web pages — along with the source metadata needed for citation, permissions, and freshness.

## 2. Simple Explanation

Getting the bytes and the facts about the bytes.

Loading looks trivial and isn't, because the metadata you capture here — who owns this, who can see it, when was it last updated, where does it live — cannot be reconstructed later. If you load a PDF as a blob of text and discard its source URL and ACL, your system can never cite or permission it.

## 3. How It Works

1. **Enumerate** the source — list files, page through an API, crawl a site, query a table.
2. **Fetch** content, handling auth, rate limits, retries, and pagination.
3. **Capture source metadata** — URI, title, owner, permissions, last-modified, version.
4. **Detect type** — by content sniffing, not just file extension, which lies.
5. **Route to the right parser** based on type.
6. **Record provenance** — what was loaded, when, from where, and whether it succeeded.

**Common source types and their real problem:**

| Source | The actual difficulty |
|--------|-----------------------|
| **PDFs** | Layout, columns, tables, scans needing OCR |
| **Confluence / SharePoint** | Permissions model, nested pages, attachments |
| **Databases** | Turning rows into meaningful documents; deciding the unit |
| **Web pages** | Boilerplate, navigation, JS-rendered content |
| **Office docs** | Tracked changes, comments, embedded objects |
| **Email / tickets** | Threading, quoted replies duplicating content |
| **Code repos** | Which files matter; binary and generated files |

## 4. Practical Example

**Loading from a database is the case people get wrong.** The question is: what is a document?

```
Table: products (12,000 rows, 40 columns)

❌ One document per row, all columns concatenated
   → 12,000 near-identical chunks, embeddings barely distinguishable

❌ One document for the whole table
   → a single chunk nobody can retrieve usefully

✅ One document per product, rendered as readable prose/markdown:
   "## Premier Savings Account
    Interest rate: 4.2% APY. Minimum balance: $10,000.
    Monthly fee: waived above minimum, otherwise $12.
    Eligibility: ..."
   → retrievable, and the text resembles how users ask about it
```

**The principle:** the indexed text should resemble the language of the questions. A raw CSV row doesn't; a rendered description does. That framing — *render structured data into natural language at load time* — is worth raising unprompted.

**Provenance capture:**

```python
doc = {
    "content": raw_bytes,
    "source_uri": "confluence://SPACE/page/12345",
    "title": page.title,
    "last_modified": page.version.when,
    "acl_group": derive_acl(page.restrictions),   # capture NOW
    "loaded_at": run_timestamp,
}
```

## 5. Why It Matters

- **Source metadata can't be reconstructed.** Citation, permissions, and freshness all depend on capturing it at load time.
- **The permission model is inherited from the source**, and mapping it correctly is the foundation of secure RAG.
- **Structured sources need rendering, not dumping.** This is one of the highest-leverage decisions in the pipeline.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---------|--------|
| **Losing source permissions** | Can't build an ACL filter later; the whole security model fails |
| **Trusting file extensions** | A `.pdf` that's actually HTML routes to the wrong parser and produces garbage |
| **Silent fetch failures** | Rate limits or auth expiry drop documents with no alert |
| **Duplicate sources** | The same document in SharePoint and a file share → duplicate chunks crowding top-k |
| **Dumping structured data raw** | CSV rows and JSON blobs embed poorly; they don't resemble questions |
| **Ignoring attachments** | The answer is often in the attached PDF, not the wiki page |
| **No incremental loading** | Re-fetching an entire corpus nightly when only 12 documents changed |

## 7. Interview Answer

> "Document loading is pulling raw content from source systems — file storage, Confluence, databases, APIs — along with the metadata that describes it.
>
> It looks trivial and isn't, because the metadata I capture here can't be reconstructed later. Source URI for citation, the permission model for access control, last-modified for freshness. If I load a PDF as a blob of text and discard its ACL, my system can never permission it, and that's usually a launch blocker in banking.
>
> The decision I'd highlight is how to handle structured sources. Loading a database table as one document per row with columns concatenated gives you twelve thousand near-identical chunks whose embeddings barely differ. The better approach is rendering each record into readable prose — 'Premier Savings Account, interest rate 4.2% APY, minimum balance ten thousand dollars.' The principle is that indexed text should resemble the language of the questions users ask, and a raw CSV row doesn't.
>
> Two operational things I'd build in. Detect content type by sniffing rather than by file extension, because extensions lie and a mis-routed parser produces silent garbage. And make loading incremental with a last-modified check, so a nightly run fetches the twelve documents that changed rather than the whole corpus.
>
> The failure I'd guard against is silent drops — an expired token or a rate limit quietly skipping documents. I'd assert on expected document counts and alert on unexplained changes."

## 8. Likely Follow-ups

**Q: How do you load from a database for RAG?**
Decide what a "document" is first — usually one logical entity, not one row and not the whole table. Then render it into natural language rather than dumping the raw fields, because the embedded text should resemble how people ask questions. Join in the related data the answer would need, so a product document includes its fee schedule rather than requiring a second retrieval hop.

**Q: How do you capture permissions from the source?**
Read the source system's ACL at load time and map it to a group identifier you store in chunk metadata. The mapping needs to be one you can also evaluate at query time from the caller's identity. The hard part is usually that source permission models are richer than a single group tag, so you may need to store a list and filter on intersection — and you have to re-check when source permissions change, not just when content changes.

**Q: How do you handle duplicates across sources?**
Content hashing catches exact duplicates. Near-duplicates — the same policy in SharePoint and on a file share with different formatting — need embedding similarity at ingestion, clustering above a high threshold and keeping one canonical copy with the others recorded as aliases. It matters because duplicates crowd the top-k and waste context on repeated information.

**Q: What about scanned documents?**
They need OCR, and OCR quality varies enormously. I'd detect pages with little or no extractable text and route those through OCR, then validate — OCR output is often subtly wrong in ways that break retrieval, like mangled account numbers. For high-stakes documents I'd flag low-confidence OCR in metadata so answers sourced from them can be marked accordingly.

**Q: How do you make loading incremental?**
Track last-modified or a version token per document and fetch only what changed since the last run. Most source APIs support a modified-since filter. Keep a state table of what was loaded when, so a failed run resumes rather than restarting. And run a periodic full reconciliation, because change feeds miss deletions more often than they miss updates.

## 9. Common Mistakes

- Discarding source permissions and trying to add access control later.
- Trusting file extensions instead of sniffing content type.
- Dumping structured data raw instead of rendering it as prose.
- Ignoring attachments, where the real content often lives.
- No alerting on document counts, so silent fetch failures go unnoticed.

## 10. What to Remember

- **Capture source metadata at load time** — URI, ACL, last-modified. It can't be reconstructed.
- **Render structured data into natural language.** Indexed text should resemble the questions.
- **Sniff content type**; extensions lie.
- **Load incrementally** on last-modified, with periodic full reconciliation for deletes.
- **Alert on document counts** — silent fetch failures are invisible otherwise.
