# IVF (Inverted File Index)

> **Phase 07 · VECTOR DATABASES · Topic 07**

## 1. Definition

A partitioning ANN index. Vectors are clustered into `nlist` cells by k-means; each cell holds a list of its members. A query scores only the `nprobe` cells whose centroids are nearest, skipping the rest.

## 2. Simple Explanation

Divide the space into regions and put each vector in the region it falls into. To answer a query, find the few regions closest to it and search only those.

The name comes from the analogy to an inverted index in text search: instead of term → documents, it's centroid → vectors.

## 3. How It Works

```
BUILD
  1. Sample the corpus; run k-means to get `nlist` centroids
  2. Assign every vector to its nearest centroid
  3. Store, per centroid, the list of member vectors

QUERY
  1. Compare the query to all `nlist` centroids      (cheap)
  2. Pick the `nprobe` nearest centroids
  3. Exhaustively score vectors in those cells only
  4. Return top-k

Vectors examined ≈ N × (nprobe / nlist)
```

**Two parameters:**

| Parameter | When | Rule of thumb |
|---|---|---|
| **nlist** | Build | ≈ √N (1M vectors → ~1000–4000 cells) |
| **nprobe** | **Query** | 1–5% of nlist; tune against recall |

## 4. Practical Example

**The cost model is unusually transparent, which is IVF's real advantage:**

```
N = 10,000,000   nlist = 4,000   → ~2,500 vectors per cell

nprobe = 1    →  4,000 centroid comparisons +  2,500 vectors
nprobe = 16   →  4,000 centroid comparisons + 40,000 vectors
nprobe = 64   →  4,000 centroid comparisons + 160,000 vectors

vs. exact: 10,000,000 vectors.

You can predict latency from nprobe directly. HNSW's ef_search
has no comparably clean relationship to work done.
```

**The boundary problem — IVF's characteristic failure:**

```
The true nearest neighbour may sit just across a cell boundary,
in a cell whose CENTROID is further from the query than the
centroids you probed.

                cell A          cell B
              ·  ·  ·  ·   |   ·  ·  ·
                    q      |  x        ← x is nearest to q
                           |             but lives in B
         centroid A ●      |      ● centroid B

If nprobe = 1 and centroid A is nearer, x is never scored.

Raising nprobe fixes it probabilistically. This is why IVF
needs a higher nprobe than intuition suggests, and why its
recall curve is less steep than HNSW's.
```

**The training requirement:** IVF must be trained on a representative sample before any vector is added. If the corpus distribution shifts substantially afterwards, clusters become unbalanced — some cells hold a disproportionate share of vectors, so probing them is slow and probing others returns almost nothing. Periodic retraining is part of operating IVF.

## 5. Why It Matters

- **Much lower memory than HNSW** — no graph structure, which is the reason to choose it.
- **A transparent cost model**: work done is directly predictable from nprobe.
- **It composes with quantization** — IVF-PQ is the standard billion-scale index.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Boundary misses** | True neighbours in unprobed cells |
| **Requires training** | On a representative sample, before indexing |
| **Cluster imbalance after drift** | Some cells huge, others near-empty |
| **Lower recall than HNSW at equal latency** | Generally true on most benchmarks |
| **nlist chosen badly** | Too few = big slow cells; too many = weak centroids |

**On HNSW vs IVF, honestly:** at comparable latency, HNSW usually gives better recall. IVF's advantages are memory footprint, faster build, cheaper inserts, and predictable cost. So the choice is rarely "which is more accurate" — it's whether HNSW's RAM requirement fits your budget at your corpus size.

**On filtered search:** IVF handles restrictive filters somewhat better than HNSW, because scoring within a probed cell is exhaustive — applying a filter there just skips rows rather than stranding a traversal. It still suffers when the filter is orthogonal to the clustering, but it degrades more gracefully.

## 7. Interview Answer

> "IVF is a partitioning index. You run k-means over a sample to get nlist centroids, assign every vector to its nearest one, and store a list per cell. A query compares against the centroids, picks the nprobe nearest cells, and exhaustively scores only the vectors in those. The name is by analogy to an inverted index — centroid to vectors instead of term to documents.
>
> Two parameters. nlist at build time, roughly the square root of N — so a million vectors gives a thousand to four thousand cells. And nprobe at query time, typically one to five percent of nlist, which is the recall-latency knob.
>
> What I like about IVF is the transparent cost model. With ten million vectors and four thousand cells, each cell holds about twenty-five hundred vectors — so nprobe of sixteen means forty thousand vectors scored plus four thousand centroid comparisons, versus ten million for exact. You can predict latency directly from nprobe, which HNSW's ef_search doesn't give you.
>
> Its characteristic failure is boundary misses. The true nearest neighbour can sit just across a cell boundary, in a cell whose centroid is further from the query than the ones you probed — so it's never scored. Raising nprobe fixes it probabilistically, which is why IVF needs a higher nprobe than intuition suggests and why its recall curve is less steep than HNSW's.
>
> Being honest about the comparison: at equal latency, HNSW usually gives better recall. IVF's real advantages are memory footprint, faster build, cheaper inserts, and predictability. So the choice isn't about accuracy — it's whether HNSW's RAM cost fits at your corpus size. And IVF composes with product quantization, which is why IVF-PQ is the standard billion-scale index.
>
> One operational point: IVF has to be trained on a representative sample before indexing, and if the corpus distribution shifts afterwards the clusters go unbalanced — some cells hold a disproportionate share, so probing them is slow and probing others returns nothing. Periodic retraining is part of running it, and that's a real difference from HNSW, which needs no training step at all."

## 8. Likely Follow-ups

**Q: How does IVF work?**
K-means clusters the vectors into nlist cells at build time, each vector assigned to its nearest centroid. A query compares against the centroids, selects the nprobe nearest cells, and exhaustively scores only the vectors in those. Work done is roughly N times nprobe over nlist.

**Q: How do you choose nlist and nprobe?**
nlist around the square root of N as a starting point — a million vectors gives a few thousand cells. nprobe is tuned empirically at query time against a recall target, usually landing at one to five percent of nlist. Only nprobe can be changed without rebuilding.

**Q: What's IVF's main failure mode?**
Boundary misses. The true nearest neighbour can live in a cell whose centroid is further from the query than the probed ones, so it's never scored at all. Higher nprobe reduces the probability but doesn't eliminate it, which is why IVF's recall curve rises less steeply than HNSW's.

**Q: IVF or HNSW?**
HNSW usually wins on recall at equal latency, so I'd default to it. IVF when memory is the binding constraint, since it stores no graph, or when build time and insert cost matter, or when the predictable cost model is worth having. At billion scale IVF-PQ is effectively the only option.

**Q: What's the training requirement?**
IVF needs k-means run on a representative sample before any vector is indexed. If the corpus distribution shifts afterwards, clusters become unbalanced — some cells oversized and slow, others nearly empty — so periodic retraining and reassignment is part of operating it. HNSW has no equivalent step.

## 9. Common Mistakes

- Setting nprobe too low and assuming the recall matches HNSW's.
- Training on an unrepresentative sample.
- Never retraining after substantial corpus growth or drift.
- Choosing nlist without reference to corpus size.
- Claiming IVF is more accurate than HNSW — generally it isn't.

## 10. What to Remember

- **Cluster into nlist cells; probe the nprobe nearest.** Work ≈ N × nprobe/nlist.
- **nlist ≈ √N at build; nprobe tuned at query time.**
- **Boundary misses are the characteristic failure** — neighbours in unprobed cells.
- **Lower memory and predictable cost**, but generally lower recall than HNSW.
- **Requires training and periodic retraining** as the corpus drifts.
