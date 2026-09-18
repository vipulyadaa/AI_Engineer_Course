# Design: Multimodal Document Assistant

> **Phase 28 · AI SYSTEM DESIGN · Topic 07**

## 1. Definition

An assistant answering questions about documents containing text, tables, charts, and scanned pages — where the design question is how each modality enters the retrieval index, not whether the model can read images.

## 2. Simple Explanation

Gemini can read a scanned page. That doesn't mean you should send scanned pages at query time.

The design question is what gets indexed: the image, or a text description of it. And for most document corpora, describing at ingestion and retrieving text is both cheaper and better.

## 3. How It Works

```
INGESTION — per content type
  TEXT      parse → chunk structure-aware → embed
  TABLES    extract structure → serialize with headers
            preserved → embed as text
  CHARTS    vision model describes at INGESTION → embed
            the description
  SCANS     OCR or Document AI → text → embed

QUERY
  text retrieval over everything
  → the original image or page available as a citation link
```

**Describe once at ingestion; retrieve text.** That converts an expensive per-query operation into a one-time cost, and it makes the retrievable content inspectable.

## 4. Practical Example

**Why describe-then-embed beats multimodal embedding here:**

```
MULTIMODAL EMBEDDING
  image and text in one shared space; query text retrieves
  images directly
  · CLIP-style models are weak at reading text IN images
  · banking images are scans, forms, tables, and diagrams —
    dense with text, out of distribution
  · you can't read an image embedding to debug why it
    retrieved

DESCRIBE-THEN-EMBED
  vision model generates a description at ingestion; the
  description is embedded as text
  · reuses the entire text pipeline
  · descriptions are inspectable — you can read why it
    retrieved
  · captures what matters for YOUR use case, not a generic
    visual representation
  · costs one model call per image at ingestion

For a document-heavy corpus the second wins, and the
inspectability argument is the one that decides it in
practice.
```

**Tables, which are the hardest case:**

```
A fee schedule IS a table. Flattened into text it becomes
number soup — rows separated from headers, columns
interleaved.

What works:
  · extract the table structure (Document AI)
  · serialize preserving the header-value relationship:
    "International transfer | Standard: $45 | Premier: $25"
  · keep small tables whole regardless of chunk size
  · repeat the header row in each chunk of a large table

Getting this wrong means the fee schedule — the most
queried document in the corpus — doesn't retrieve.
```

**Charts, and the honest limit:**

```
A vision model describing a chart produces something like
"bar chart showing transaction volume by month, peaking in
December at approximately 45,000."

"Approximately" is doing real work there. Values read from
a chart are estimates, and for anything a customer acts on
the underlying data is the source, not the chart.

So chart descriptions are useful for FINDING the relevant
document and weak as a source of figures. That distinction
should be explicit in how the description is used and
cited.
```

## 5. Why It Matters

- **Describe at ingestion, retrieve text** — cheaper, inspectable, usually better.
- **Tables are the hardest case** and often the most-queried content.
- **Chart-derived figures are estimates** — useful for finding, weak for citing.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Querying images at request time** | Expensive, repeated, slow |
| **Multimodal embedding for text-bearing scans** | CLIP-style models are weak at this |
| **Tables flattened to text** | The most-queried document stops retrieving |
| **Chart values cited as facts** | They're estimates |
| **Description quality unverified** | A bad description is silently unretrievable |
| **Original not linked** | The user can't check the source |

**On verifying descriptions:** the generated description becomes the retrievable content, so a bad description means the image is effectively invisible. Sampling descriptions and reading them against the originals — the same ten-minute check that applies to text parsing — catches systematic problems before the whole corpus is embedded.

**On citations:** the answer should cite the original page or image, not the description. The description is an indexing artifact; the source of truth is the document. A citation pointing at a generated description is unverifiable in exactly the way citations exist to prevent.

## 7. Interview Answer

> "Gemini can read a scanned page, but that doesn't mean you should send scanned pages at query time. The design question is what gets indexed — the image, or a text description of it.
>
> For a document-heavy corpus I'd describe at ingestion and retrieve text. A vision model generates a description once, that description is embedded, and queries run through the normal text pipeline. That converts an expensive per-query operation into a one-time cost.
>
> The argument against multimodal embedding here is specific. CLIP-style models are trained on natural images with captions and are weak at reading text within images — and banking images are scans, forms, tables, and diagrams, dense with text and out of distribution for them. But the argument that actually decides it is inspectability: I can read a generated description and immediately see why something retrieved or didn't. You can't read an image embedding.
>
> Tables are the hardest case and often the most-queried content. A fee schedule *is* a table, and flattened into text it becomes number soup — rows separated from headers, columns interleaved. What works is extracting the structure with Document AI, serializing so the header-value relationship survives, keeping small tables whole regardless of chunk size, and repeating the header row in each chunk of a large one. Getting this wrong means the most important document in the corpus doesn't retrieve.
>
> For charts, I'd be explicit about a limit. A vision model describing a chart produces something like 'bar chart showing transaction volume by month, peaking in December at approximately forty-five thousand.' That 'approximately' is doing real work — values read from a chart are estimates. So chart descriptions are useful for finding the relevant document and weak as a source of figures, and for anything a customer acts on the underlying data is the source rather than the chart. That distinction should be explicit in how descriptions are used and cited.
>
> Two operational points. The generated description becomes the retrievable content, so a bad description means the image is effectively invisible — I'd sample descriptions and read them against the originals, the same ten-minute check that applies to text parsing, before embedding the whole corpus.
>
> And citations should point at the original page or image, not the description. The description is an indexing artifact; the document is the source of truth. A citation pointing at a generated description is unverifiable in exactly the way citations exist to prevent."

## 8. Likely Follow-ups

**Q: Why describe at ingestion rather than query the image?**
It converts an expensive repeated operation into a one-time cost, reuses the whole text pipeline, and makes the retrievable content inspectable — you can read a description and see why it retrieved, which you can't do with an image embedding.

**Q: Why not multimodal embedding?**
CLIP-style models are trained on natural images with captions and are weak at reading text within images. Banking images are scans, forms, and tables — dense with text and out of distribution. And the embeddings aren't inspectable, so debugging retrieval failures is guesswork.

**Q: How do you handle tables?**
Extract the structure with Document AI, serialize preserving the header-value relationship, keep small tables whole regardless of chunk size, and repeat the header row across chunks of large ones. A flattened fee schedule is number soup and it's usually the most-queried document.

**Q: Can you cite figures from a chart?**
Not reliably — chart-derived values are estimates. Descriptions are useful for finding the relevant document but weak as a source of figures, so for anything a customer acts on, the underlying data is the source. That distinction should be explicit in the citation.

**Q: How do you verify the descriptions?**
Sample them and read against the originals before embedding the corpus. The description becomes the retrievable content, so a bad one makes the image effectively invisible — and that's the same ten-minute check that catches text parsing failures.

## 9. Common Mistakes

- Sending images to the model at query time.
- Using multimodal embedding for text-bearing scans.
- Flattening tables into unstructured text.
- Citing chart-derived figures as facts.
- Citing the generated description rather than the original document.

## 10. What to Remember

- **Describe once at ingestion, retrieve text** — cheaper and inspectable.
- **CLIP-style models are weak at text in images** — most banking content.
- **Tables need structure-preserving serialization** — often the most-queried content.
- **Chart values are estimates** — good for finding, weak for citing.
- **Cite the original**, not the description.
