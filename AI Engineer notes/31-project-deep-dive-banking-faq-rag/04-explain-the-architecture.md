# "Explain the Architecture"

> **Phase 31 · PROJECT DEEP DIVE · Topic 04**
>
> ⚠️ **An answer framework.** Describe your own architecture. Where yours was
> simpler, say so — a simple system explained with clear reasoning beats a
> complex one you can't defend.

## 1. Definition

A question testing whether you can describe a system clearly and justify its parts. Interviewers are listening for structure, for which decisions you made deliberately, and for whether you know where it was weak.

## 2. Simple Explanation

Describe two pipelines — ingestion and query — then go deeper on whichever the interviewer picks.

The failure is narrating every component. Give the shape in thirty seconds, name two decisions you'd defend, and stop.

## 3. How It Works

```
INGESTION (batch)
  source documents → parse → clean → chunk → embed → index

QUERY (per request)
  question → retrieve → assemble context → generate → answer

That's the honest minimum. Then add what you actually had:
  · query rewriting for follow-ups
  · hybrid retrieval
  · reranking
  · a relevance threshold and abstention
  · citation
  · verification
```

**Describe what you built, not the reference architecture.** Adding components you didn't have invites questions you can't answer, and the gap is obvious.

## 4. Practical Example

**The two decisions worth naming:**

```
Pick two you can defend three questions deep. Candidates:

CHUNKING
  "Structure-aware rather than fixed-size, because the
   documents had sections and sub-sections, and fixed
   chunks split rules from their conditions."

BREADCRUMB PREFIXING
  "The section path is prefixed into the chunk text before
   embedding, not just stored as metadata — because
   metadata is filterable but not searchable, and a chunk
   saying 'this fee is waived' is unretrievable without
   knowing which fee."

ABSTENTION
  "A relevance threshold, so when nothing retrieved clears
   it the system says it doesn't have that information
   rather than answering from weak context."

HYBRID RETRIEVAL
  "Because clause references and product codes carry almost
   no semantic signal — dense retrieval missed them
   entirely until BM25 was added."
```

**The breadcrumb one is the strongest if it applies**, because the metadata-versus-embedded-text distinction is a real insight that most people miss.

**Naming a weakness:**

```
Something honest, for example:
  · "there was no reranking, so retrieval precision
     depended entirely on the embedding model"
  · "evaluation was sampling and reading answers rather
     than a labelled golden set"
  · "the corpus was re-indexed on a schedule, so there was
     a staleness window between a policy change and it
     being reflected"

Naming a real limitation is the most credible thing in this
answer, and it invites a good follow-up rather than a
probing one.
```

## 5. Why It Matters

- **Shape in thirty seconds, then stop** — the follow-ups are where depth shows.
- **Two defensible decisions** beat a complete component list.
- **A named weakness** is the most credible element.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Narrating every component | Detail without structure |
| Describing the reference architecture | Invites questions about things you didn't build |
| No decisions justified | Assembly, not design |
| No weakness named | Sounds rehearsed |
| Starting with the stack | Tools rather than design |
| Over-answering | No room for follow-ups |

**On the ingestion/query split:** naming it explicitly is worth doing, because it shows you understand they have different properties — ingestion is batch, inspectable, and rerunnable, while the query path is what users experience and what an auditor asks about. That framing explains why you'd accept more convenience in one and more control in the other.

**On drawing it:** if there's a whiteboard, draw the two pipelines. A diagram makes the shape obvious in seconds and gives the interviewer something to point at, which produces better follow-ups than a monologue.

## 7. Interview Answer

> "[**Your architecture.** The skeleton below shows the structure.]
>
> "Two pipelines. Ingestion is batch: source documents from [**where**], parsed, cleaned, chunked, embedded, and written to [**your index**]. The query path is per request: the question comes in, retrieval runs against the index, the retrieved chunks are assembled into context, and the model generates an answer with citations.
>
> I'd name that split explicitly because the two have different properties. Ingestion is batch, inspectable, and rerunnable — if it's wrong you fix it and re-run. The query path is what users experience and what an auditor asks about, so it needs more control and more visibility.
>
> Two decisions I'd defend. [**Pick two of yours.** For example:]
>
> Chunking was structure-aware rather than fixed-size, because the documents had sections and sub-sections and fixed-size chunks split rules away from their conditions — a chunk would state that a fee was waived without the sentence saying for which customers.
>
> And the section path is prefixed into the chunk text before embedding, not just stored as metadata. That matters because metadata is filterable but not searchable — only text that's actually embedded influences similarity. A chunk reading 'this fee is waived for the first two transactions' is unretrievable on its own; prefixed with the document and section it becomes retrievable and the model can interpret it correctly.
>
> [**Then a weakness.** For example:] Where it was weak — [**your honest limitation**]. There was no reranking, so retrieval precision depended entirely on the embedding model, and I'd add a cross-encoder if I were extending it.
>
> [**Stop there.**] That's the shape and the reasoning — I can go deeper on any part of it.
>
> [**If there's a whiteboard, draw the two pipelines.** It makes the shape obvious in seconds and gives the interviewer something to point at, which produces better follow-ups than a monologue.]"

## 8. Likely Follow-ups

**Q: Why two pipelines rather than one?**
Because they have different properties. Ingestion is batch, inspectable, and rerunnable; the query path is per-request, latency-sensitive, and what an auditor asks about. That difference justifies accepting more convenience in ingestion and demanding more control in the query path.

**Q: Why structure-aware chunking?**
Because the documents had sections and sub-sections, and fixed-size chunks split rules away from their conditions — a chunk stating a fee was waived without the sentence saying for whom. That's the omission failure introduced by the chunking strategy rather than the model.

**Q: Why prefix the breadcrumb into the text?**
Because metadata is filterable but not searchable — only embedded text influences similarity. A chunk saying "this fee is waived" is unretrievable without its section context, and putting the path in metadata alone doesn't help retrieval at all.

**Q: What was missing?**
[**Your honest answer.**] A real limitation — no reranking, sampling-based evaluation rather than a golden set, or a staleness window from scheduled re-indexing. Naming one is the most credible part of the answer and invites a constructive follow-up.

**Q: What would you add first?**
[**Your view, with reasoning.**] A defensible answer names the largest gap and why — usually evaluation if there wasn't a golden set, because nothing else is measurable without it, or reranking if precision was the weak point.

## 9. Common Mistakes

- Narrating every component rather than giving the shape.
- Describing the reference architecture instead of what you built.
- No decisions justified.
- Claiming no weaknesses.
- Talking long enough to prevent follow-ups.

## 10. What to Remember

- **Two pipelines, thirty seconds, then stop.**
- **Name the ingestion/query split** — different properties, different treatment.
- **Two defensible decisions** beat a complete list.
- **Metadata is filterable, not searchable** — a strong point if breadcrumbs applied.
- **Name a real weakness** — it's the most credible thing you'll say.
