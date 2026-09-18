# RAG on Vertex AI

> **Phase 20 · VERTEX AI · Topic 11**

## 1. Definition

The options for building retrieval-augmented generation on Vertex AI — fully managed via Vertex AI Search, the RAG Engine as a middle layer, or a custom pipeline over Vector Search — and the criteria for choosing between them.

## 2. Simple Explanation

Google offers RAG at three levels of abstraction. More managed means faster to working and less control; more custom means the opposite.

The deciding question in banking isn't quality — it's whether you can control the things that make the system defensible: chunking, thresholds, filters, and abstention.

## 3. How It Works

```
VERTEX AI SEARCH (managed)
  documents in → parsing, chunking, embedding, indexing,
  retrieval, and often generation all handled
  → days to working; least control

VERTEX AI RAG ENGINE (middle)
  managed corpus and retrieval with more configuration
  exposed than Search, less than custom
  → a reasonable middle ground

CUSTOM over VECTOR SEARCH
  your parsing, chunking, enrichment, hybrid retrieval,
  reranking, thresholds; managed index
  → most control; most work
```

## 4. Practical Example

**The four controls that decide it for banking:**

```
1. CHUNKING STRATEGY
   The biggest quality lever. A fee schedule that's a table
   needs different treatment from prose policy, and a
   generic chunker serves neither well.

2. RELEVANCE THRESHOLD
   Without a visible score and a settable floor, you cannot
   abstain. Abstention isn't a preference in banking — an
   unsupported answer is worse than no answer.

3. PRE-FILTERING
   Permission and effective-date filters must be applied
   during the search. Post-filtering leaks and
   under-retrieves.

4. HYBRID RETRIEVAL
   Clause references, SWIFT codes, and product names carry
   almost no semantic signal. BM25 catches what dense
   retrieval misses, and that's a large share of banking
   queries.

If a managed option gives me all four, I'd use it. Where
it doesn't, the gap is in exactly the properties that make
the system defensible.
```

**That checklist is the answer** — it turns "managed versus custom" from a preference into a requirements test.

**The sequencing I'd recommend:**

```
1. Start with the most managed option that might work
2. Build the golden set while doing it — needed either way
3. Measure recall, groundedness, and abstention accuracy
   per question type
4. If it meets the bar, keep it. If not, the golden set
   shows exactly which query types fail, which justifies
   the custom build with evidence.

That makes the build decision evidence-based rather than
an architectural preference, and nothing is wasted.
```

**The migration cost:** moving from managed to custom means re-ingesting the corpus, which is the main one-time cost. Keeping source documents and metadata in your own GCS bucket from the start means the migration is a re-index rather than a reconstruction.

## 5. Why It Matters

- **The four controls** turn the managed-versus-custom question into a requirements test.
- **No threshold means no abstention** — a blocking limitation in banking.
- **Start managed, measure, then decide** costs nothing and produces evidence.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No chunking control** | Tables and structured policy handled poorly |
| **No threshold** | Abstention unimplementable |
| **Post-filtering** | Leaks and silently under-retrieves |
| **Dense-only retrieval** | Exact identifiers missed |
| **Black-box failures** | Can't tell which stage went wrong |
| **Migration cost** | Re-ingesting the corpus |

**On diagnosability:** with a custom pipeline, a bad answer can be traced to parsing, chunking, embedding, retrieval, reranking, or generation. With a managed black box you know the answer was wrong and not why — which turns improvement into guesswork and makes an incident review much harder to conclude.

**On not over-building:** the custom pipeline is a real ongoing commitment — chunking to maintain, embedding versions to manage, thresholds to recalibrate, hybrid weighting to tune. For a team without capacity to own that, a managed option that mostly works beats a custom one that's poorly maintained.

## 7. Interview Answer

> "There are three levels: Vertex AI Search fully managed, the RAG Engine as a middle layer with more configuration exposed, and a custom pipeline over Vector Search.
>
> The way I'd decide isn't on quality — it's on whether I can control four things that make the system defensible in banking.
>
> Chunking strategy, because it's the biggest quality lever and a fee schedule that's a table needs completely different treatment from prose policy. Relevance thresholds, because without a visible score and a settable floor I cannot abstain — and abstention isn't a preference here, an unsupported answer is worse than no answer. Pre-filtering, because permission and effective-date filters have to be applied during the search, since post-filtering both leaks and silently under-retrieves. And hybrid retrieval, because clause references, SWIFT codes, and product names carry almost no semantic signal, and that's a large share of real banking queries.
>
> If a managed option gives me all four, I'd use it — I have no interest in building a pipeline for its own sake. Where it doesn't, the gap is in exactly the properties that make the system defensible, which is why it matters more than the convenience.
>
> On sequencing: start with the most managed option that might work, build the golden set while doing it since it's needed either way, and measure recall, groundedness, and abstention accuracy per question type. If it meets the bar, keep it. If not, the golden set shows exactly which query types fail, which justifies the custom build with evidence rather than as an architectural preference. Nothing is wasted either way.
>
> The migration cost if I do move is re-ingesting the corpus. Keeping source documents and metadata in my own GCS bucket from the start means that's a re-index rather than a reconstruction — a day-one decision that's hard to retrofit.
>
> One thing I'd weigh honestly: the custom pipeline is a real ongoing commitment. Chunking to maintain, embedding versions to manage, thresholds to recalibrate, hybrid weighting to tune. For a team without capacity to own that, a managed option that mostly works beats a custom one that's poorly maintained."

## 8. Likely Follow-ups

**Q: How do you choose between managed and custom?**
By four controls: chunking strategy, relevance thresholds, pre-filtering, and hybrid retrieval. If the managed option provides all four, use it. Where it doesn't, the gap is in the properties that make the system defensible, which matters more than the convenience saved.

**Q: Why are thresholds a blocking issue?**
Because abstention depends on them. Without a visible relevance score and a settable floor, the system always answers — including from weak context. In banking an unsupported answer is worse than no answer, so this isn't a tuning preference but a requirement.

**Q: Why does hybrid retrieval matter specifically here?**
Because exact identifiers dominate a large share of banking queries — clause references, SWIFT codes, product names, form IDs. Strings like "7.3(b)" carry almost no semantic signal, so dense retrieval can miss them entirely while BM25 ranks them first.

**Q: How would you sequence the decision?**
Start with the most managed option that might work, build the golden set alongside it, and measure per question type. If it meets the bar, keep it; if not, the golden set shows exactly which query types fail and justifies the custom build with evidence. Nothing is wasted.

**Q: What's the argument against building custom?**
Ongoing maintenance — chunking, embedding versions, threshold recalibration, hybrid weighting. That's a real commitment, and for a team without capacity to own it, a managed option that mostly works beats a custom one that's poorly maintained.

## 9. Common Mistakes

- Choosing custom by preference rather than measured requirement.
- Adopting a managed option without checking abstention is possible.
- Post-filtering permissions because the managed layer only offers that.
- Not keeping source documents in your own storage from the start.
- Underestimating the ongoing maintenance of a custom pipeline.

## 10. What to Remember

- **Four controls decide it:** chunking, thresholds, pre-filtering, hybrid.
- **No threshold means no abstention** — blocking in banking.
- **Start managed, measure per question type, then decide.**
- **Keep source documents in your own bucket** so migration is a re-index.
- **A custom pipeline is an ongoing commitment** — weigh it honestly.
