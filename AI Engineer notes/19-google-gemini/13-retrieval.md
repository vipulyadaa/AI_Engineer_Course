# Retrieval

> **Phase 19 · GOOGLE GEMINI · Topic 13**

## 1. Definition

The options for getting relevant content in front of Gemini on Google Cloud — a managed path via Vertex AI Search, a component path via Vertex AI Vector Search, or a fully custom pipeline.

## 2. Simple Explanation

You can hand Google a bucket of documents and get retrieval that works, or you can build the pipeline yourself with more control.

The choice is a real trade-off, and the answer depends on how much of the retrieval behaviour you need to own — which in banking is usually more than the managed option gives.

## 3. How It Works

```
VERTEX AI SEARCH (managed)
  point it at documents → parsing, chunking, embedding,
  indexing, retrieval all handled
  → fastest to working, least control

VERTEX AI VECTOR SEARCH (component)
  you parse, chunk, embed; it stores and searches
  → full control of the pipeline, managed index

FULLY CUSTOM
  your parsing, chunking, embedding, hybrid retrieval,
  reranking, thresholds
  → maximum control, maximum work
```

**The middle option is where most production banking systems land** — the index is managed, everything that determines quality is yours.

## 4. Practical Example

**What you give up with the managed option:**

```
· CHUNKING STRATEGY — the single biggest quality lever,
  and it's chosen for you
· HYBRID SEARCH configuration — BM25 weighting for exact
  identifiers like clause references and SWIFT codes
· RERANKING — whether, and with what model
· THRESHOLDS — the relevance floor that enables abstention
· EMBEDDING MODEL choice and version pinning

Every one of those is something I'd want to tune against a
golden set. Chunking especially — a fee schedule that's a
table needs different treatment from prose policy, and a
generic chunker handles neither well.
```

**What you gain:**

```
Weeks of work, a maintained pipeline, and a system that
works acceptably without a retrieval specialist.

For an internal tool, a pilot, or a team without capacity
to own a retrieval pipeline, that's the right trade.
```

**My recommendation, and the reasoning:**

```
Start managed to prove the use case. Build a golden set
while doing it.

Then measure: if managed retrieval hits the recall target on
the golden set, keep it. If it doesn't — and for a corpus
with tables, clause references, and version-dated policies
it usually won't — the golden set tells you exactly which
query types fail, which is what justifies building the
custom pipeline.

That sequencing means the build decision is evidence-based
rather than a preference, and the golden set is needed
either way.
```

## 5. Why It Matters

- **Chunking is the biggest quality lever** and the managed option takes it from you.
- **The component path** — own the pipeline, managed index — is where production usually lands.
- **Start managed, measure, then decide** makes the build choice evidence-based.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No chunking control** | Tables and structured policy handled poorly |
| **No hybrid tuning** | Exact identifiers under-retrieved |
| **No threshold control** | Abstention becomes impossible |
| **Managed retrieval as a black box** | Failures hard to diagnose |
| **Migration cost** | Moving off managed means re-ingesting |
| **Custom pipeline maintenance** | A real ongoing cost |

**On thresholds and abstention:** if you can't see or set a relevance floor, you can't decide to abstain. That's not a tuning preference — in banking, abstaining rather than answering from weak context is a core requirement, and a retrieval layer that always returns its top-k regardless of relevance makes it unimplementable.

**On diagnosing failures:** with a custom pipeline, a bad answer can be traced to parsing, chunking, embedding, retrieval, or generation. With a managed black box, you know retrieval returned the wrong thing and not why — which makes improvement guesswork rather than engineering.

## 7. Interview Answer

> "There are three options on Google Cloud. Vertex AI Search is fully managed — point it at documents and parsing, chunking, embedding, indexing, and retrieval are all handled. Vertex AI Vector Search is the component path, where I parse, chunk, and embed, and it stores and searches. Or fully custom, where I own everything including the index.
>
> For a production banking system I'd expect to land on the middle option: managed index, everything that determines quality is mine.
>
> What I'd give up with the fully managed path is significant. Chunking strategy, which is the single biggest quality lever and gets chosen for me — and a fee schedule that's a table needs completely different treatment from prose policy, which a generic chunker handles poorly either way. Hybrid search configuration, so BM25 weighting for exact identifiers like clause references and SWIFT codes. Reranking. Embedding model choice and version pinning. And thresholds.
>
> That last one matters most and isn't a tuning preference. If I can't see or set a relevance floor, I can't decide to abstain — and abstaining rather than answering from weak context is a core banking requirement. A retrieval layer that always returns its top-k regardless of relevance makes abstention unimplementable.
>
> The other thing I'd lose is diagnosability. With a custom pipeline, a bad answer can be traced to parsing, chunking, embedding, retrieval, or generation. With a managed black box I know retrieval returned the wrong thing and not why, which makes improvement guesswork.
>
> But I wouldn't dismiss managed retrieval. For a pilot, an internal tool, or a team without capacity to own a pipeline, it's weeks of work saved and it works acceptably.
>
> So my actual recommendation is sequencing: start managed to prove the use case, and build a golden set while doing it. Then measure. If managed retrieval hits the recall target, keep it. If it doesn't — and for a corpus with tables, clause references, and version-dated policies it usually won't — the golden set tells me exactly which query types fail, which is what justifies building the custom pipeline. That makes the build decision evidence-based rather than a preference, and the golden set is needed either way."

## 8. Likely Follow-ups

**Q: What do you lose with Vertex AI Search?**
Chunking strategy, hybrid search tuning, reranking choice, embedding model selection and pinning, and relevance thresholds. Chunking is the biggest quality lever and thresholds are what make abstention possible, so both matter more than the convenience saved.

**Q: Why do thresholds matter so much?**
Because abstention depends on them. Without a visible relevance floor you can't decide that nothing retrieved was good enough, so the system always answers — including from weak context. In banking, abstaining is a requirement rather than a nicety, which makes this a blocking limitation.

**Q: Where do production systems usually land?**
The component path — own the parsing, chunking, embedding, hybrid retrieval, reranking, and thresholds, with Vertex AI Vector Search as a managed index. That keeps everything determining quality under your control while avoiding operating a vector database.

**Q: Would you ever use the managed option?**
Yes — for a pilot, an internal tool, or a team without the capacity to own a retrieval pipeline. It saves weeks and works acceptably. The mistake is keeping it once requirements like abstention, exact-identifier matching, and version-dated policy have appeared.

**Q: How would you decide?**
Start managed, build a golden set alongside it, then measure. If managed retrieval meets the recall target, keep it. If not, the golden set shows exactly which query types fail, which justifies the custom build with evidence. The golden set is needed either way, so the sequencing costs nothing.

## 9. Common Mistakes

- Choosing managed retrieval without checking abstention is possible.
- Not recognizing chunking as the largest quality lever.
- Building a custom pipeline before proving the use case.
- Deciding on preference rather than golden-set measurement.
- Underestimating the ongoing maintenance cost of a custom pipeline.

## 10. What to Remember

- **Three options:** managed, component (own pipeline + managed index), fully custom.
- **Chunking and thresholds** are what the managed path takes from you.
- **No threshold means no abstention** — a blocking limitation in banking.
- **Production usually lands on the component path.**
- **Start managed, measure on a golden set, then decide.**
