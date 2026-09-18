# FAISS

> **Phase 07 · VECTOR DATABASES · Topic 19**

## 1. Definition

Facebook AI Similarity Search — an open-source C++/Python library for efficient similarity search over dense vectors. A library, not a service: it provides indexes and search, and nothing around them.

## 2. Simple Explanation

FAISS is the reference implementation of most ANN techniques. Flat, IVF, HNSW, PQ, and combinations are all there, with CPU and GPU support.

What it doesn't have is persistence beyond `write_index`, metadata filtering, updates, replication, or a network interface. You embed it in your process and build everything else yourself.

## 3. How It Works

```python
import faiss, numpy as np

d = 768
index = faiss.IndexHNSWFlat(d, 32)      # M = 32
index.hnsw.efConstruction = 200
index.add(vectors)                       # (N, 768) float32

index.hnsw.efSearch = 64                 # query-time knob
D, I = index.search(query_vectors, k=10) # distances, indices

faiss.write_index(index, "corpus.index")
```

**The index factory covers most combinations in one string:**

```
"Flat"              exact
"HNSW32"            graph, M=32
"IVF4096,Flat"      4096 cells, uncompressed
"IVF4096,PQ96"      4096 cells, PQ to 96 bytes
"OPQ96,IVF4096,PQ96" with a learned rotation before PQ
```

**Note `index.search` returns integer positions**, not your IDs. Mapping those back to chunk IDs is your responsibility — a small thing that causes real bugs.

## 4. Practical Example

**Where FAISS is genuinely the right tool:**

```
1. MEASURING ANN RECALL
   Build IndexFlatIP over the same vectors, run the same
   queries, compare top-k overlap with production results.
   This is the standard way to get a ground-truth baseline,
   and it's a dozen lines.

2. OFFLINE BATCH WORK
   Deduplication, near-duplicate detection, clustering a
   corpus — no serving, no filtering, no updates.

3. PROTOTYPING
   Testing whether retrieval works at all before choosing
   infrastructure.

4. EMBEDDED USE
   A static index shipped with an application.
```

**Where it stops:**

```
Serving it means building:
  · a network layer and concurrency model
  · metadata filtering (FAISS has only crude ID selectors)
  · updates and deletes (remove_ids is limited by index type)
  · persistence beyond dump-and-reload
  · replication, backup, monitoring, access control

That list is a vector database. Building it is the mistake —
not because it's impossible, but because it's a year of work
that Vertex AI Vector Search or pgvector already did.
```

**The reason to know FAISS anyway:** managed vector databases hide their index internals. FAISS is where you can actually see what M, efSearch, nlist, and nprobe do, and measure their effect directly. That understanding transfers to tuning a managed service you can't inspect.

## 5. Why It Matters

- **It's the measurement tool** for ANN recall — the exact baseline, in a dozen lines.
- **It's the reference implementation**, so understanding it explains every managed store's parameters.
- **Knowing where it stops** is the substance of "why not just use FAISS."

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No metadata filtering** | Only crude ID selectors |
| **Limited deletes** | `remove_ids` unsupported on several index types |
| **No persistence model** | `write_index` dumps everything; no incremental |
| **No concurrency guarantees** | Writes aren't safe alongside reads |
| **In-process, single-node** | No replication or sharding |
| **Positions, not IDs** | Easy off-by-one style bugs in the mapping |

**On concurrency — the bug that hurts:** FAISS indexes are not safe for concurrent writes with reads. A service adding vectors while serving queries needs external locking, and getting it wrong causes crashes or corrupted results under load rather than clean errors. That's a strong argument against serving it directly.

**On GPU:** FAISS has excellent GPU support and is dramatically faster for batch operations — building an exact index over millions of vectors for a recall baseline, for instance. For serving, GPU memory is usually the wrong place to keep a corpus, but for offline batch work it's a large win.

## 7. Interview Answer

> "FAISS is Meta's open-source similarity search library — the reference implementation of most ANN techniques. Flat, IVF, HNSW, product quantization, and combinations, with CPU and GPU support. The key word is library: it gives you indexes and search and nothing around them.
>
> Where I'd actually use it in a production context is measurement. Build an IndexFlatIP over the same vectors, run the same production queries, and compare top-k overlap with what the serving index returns — that's your ANN recall, and it's about a dozen lines. FAISS is the standard way to get that ground-truth baseline, and almost nobody does it.
>
> Beyond that: offline batch work like deduplication or clustering, prototyping before choosing infrastructure, and embedded use where a static index ships with an application.
>
> Where it stops is serving. To serve it you'd have to build a network layer and concurrency model, metadata filtering — FAISS only has crude ID selectors — updates and deletes, which aren't even supported on several index types, persistence beyond dump-and-reload, plus replication, backup, monitoring, and access control. That list is a vector database. Building it isn't impossible, it's just a year of work that Vertex AI Vector Search or pgvector already did.
>
> The specific thing I'd warn about is concurrency. FAISS indexes aren't safe for concurrent writes alongside reads, so a service adding vectors while serving queries needs external locking, and getting it wrong gives crashes or corrupted results under load rather than clean errors.
>
> The reason to know FAISS even when using a managed service is that managed stores hide their index internals. FAISS is where you can actually see what M, efSearch, nlist, and nprobe do and measure the effect directly. That understanding is what lets you tune a managed service you can't inspect."

## 8. Likely Follow-ups

**Q: What is FAISS good for?**
Measuring ANN recall against an exact baseline, offline batch work like deduplication and clustering, prototyping, and embedded use with a static index. It's excellent at the search itself — the limitations are everything around the search.

**Q: Why not serve FAISS directly?**
Because you'd have to build metadata filtering, updates and deletes, persistence, concurrency safety, replication, backup, monitoring, and access control around it. That's a vector database, and it's a year of work that managed options already did. Concurrency in particular is a trap — writes aren't safe alongside reads.

**Q: How would you use FAISS alongside a managed store?**
As the measurement baseline. Build an exact flat index over the same vectors, run sampled production queries against both, and compute top-k overlap to get the ANN recall your managed index is actually delivering. It's cheap, offline, and turns a guess into a number.

**Q: What are FAISS's hard limitations?**
No real metadata filtering, deletes unsupported on several index types, no incremental persistence, no concurrency guarantees, and single-node in-process only. Also the search API returns positions rather than your own IDs, so the mapping is your responsibility and a common source of bugs.

**Q: Why learn it if you use a managed service?**
Because managed services hide their index internals while exposing the same parameters. FAISS is where you can see and measure what M, efSearch, nlist, and nprobe actually do. That understanding is what makes tuning an opaque managed index possible rather than guesswork.

## 9. Common Mistakes

- Treating FAISS as a database rather than a library.
- Serving it with concurrent reads and writes and no locking.
- Assuming deletes work on any index type.
- Forgetting that search returns positions, not application IDs.
- Not using it for the one thing it's uniquely good at — exact recall baselines.

## 10. What to Remember

- **A library, not a service** — search only, nothing operational around it.
- **The reference implementation** of Flat, IVF, HNSW, and PQ.
- **Use it to measure ANN recall** against an exact baseline.
- **Not safe for concurrent reads and writes** — a real hazard if served directly.
- **Knowing it explains every managed store's parameters.**
