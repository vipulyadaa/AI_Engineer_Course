# Why Do We Need a Vector Database?

> **Phase 07 · VECTOR DATABASES · Topic 02**

## 1. Definition

Because semantic retrieval requires finding nearest neighbours in a high-dimensional space, and no traditional index structure can do that efficiently. B-trees, hash indexes, and inverted indexes all rely on properties that high-dimensional vectors don't have.

## 2. Simple Explanation

A B-tree works because numbers have an order — you can bisect. A hash index works because you're looking for an exact match.

A vector query is neither. You have 768 coordinates and want the closest points by cosine similarity. There's nothing to bisect on and nothing to match exactly. The brute-force answer is to compare against every vector in the corpus.

## 3. How It Works

**Why the obvious approaches fail:**

| Index | Why it doesn't apply |
|---|---|
| **B-tree** | Needs a total order; 768-dim vectors have none |
| **Hash** | Exact-match only; you need *nearest*, not equal |
| **Inverted index** | Matches terms; vectors have no terms |
| **Per-dimension index** | Similarity depends on all dimensions jointly |

**The brute-force cost:**

```
10,000,000 chunks × 768 dims × 4 bytes  = ~30 GB
One query = 10M dot products of length 768
          = ~7.7 billion multiply-adds

Feasible on a GPU, far too slow single-threaded at
interactive latency — and that's per query.
```

**What an ANN index does:** trade a small amount of recall for orders-of-magnitude speedup, by only examining a fraction of the vectors.

## 4. Practical Example

**Why "just use Postgres with a distance function" breaks:**

```sql
SELECT chunk_id, embedding <=> :query AS dist
FROM chunks
ORDER BY dist
LIMIT 10;
```

```
Without a vector index this is a SEQUENTIAL SCAN.
Every row, every query.

  100,000 rows    → tens of milliseconds. Fine.
  10,000,000 rows → seconds. Not fine.

pgvector fixes this by ADDING an ANN index (HNSW or IVFFlat)
to Postgres — which is the point: the requirement is the
index, not a separate product.
```

**The curse of dimensionality, briefly:**

```
In high dimensions, distances CONCENTRATE — the nearest and
farthest points in a random set become similarly distant.

Consequence: space-partitioning structures that work in 2D or
3D (k-d trees, R-trees) degrade to near-brute-force by a few
dozen dimensions.

This is why ANN methods are APPROXIMATE. Exact nearest-neighbour
search in high dimensions has no known method that beats brute
force in the general case.
```

**That last sentence is the real answer to the question.** The approximation isn't laziness — it's the only way to get interactive latency at scale.

## 5. Why It Matters

- **It explains why ANN is approximate** rather than exact, which is the substantive version of this answer.
- **The pgvector framing** — the requirement is a vector index, not necessarily a new product — is the practical takeaway.
- **Embedding-space semantics are learned**, so no structural property of the data can be indexed instead.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Brute force at scale** | Linear in corpus size, per query |
| **Sequential scan in SQL** | Works until it doesn't, with no warning |
| **Tree structures in high dimensions** | Degrade to brute force |
| **Recall loss from ANN** | The price of speed; must be measured |
| **Memory footprint** | Graph indexes hold vectors in RAM |

**On when you don't need one:** below roughly 100,000 vectors, brute force in NumPy is genuinely fine — a few tens of milliseconds, exact results, no index to tune or maintain. Saying that out loud is a stronger answer than reflexively reaching for infrastructure, and it's often true for an internal tool or a first version.

**On memory:** HNSW-style graph indexes typically keep vectors and graph structure in memory, so 10M × 768 dims is tens of gigabytes of RAM before overhead. That, not query speed, is often the real scaling constraint — and it's what quantization exists to address.

## 7. Interview Answer

> "Because nearest-neighbour search in high dimensions can't use any traditional index structure. A B-tree needs a total order and 768-dimensional vectors don't have one. A hash index does exact matching and I need nearest, not equal. An inverted index matches terms and there are no terms. Indexing each dimension separately doesn't help because similarity depends on all of them jointly.
>
> So the naive approach is brute force — compare the query against every vector. For ten million chunks at 768 dimensions that's about seven point seven billion multiply-adds per query. Feasible on a GPU, far too slow single-threaded at interactive latency.
>
> The deeper reason it's *approximate* is the curse of dimensionality. In high dimensions distances concentrate — nearest and farthest points become similarly distant — so space-partitioning structures like k-d trees degrade to near-brute-force by a few dozen dimensions. Exact nearest-neighbour search in high dimensions has no known method that beats brute force in the general case. That's why ANN indexes are approximate: it isn't laziness, it's the only route to interactive latency at scale.
>
> One framing I'd add: 'why not just use Postgres' is answered by noting that a plain distance-ordered query is a sequential scan — fine at a hundred thousand rows, seconds at ten million. pgvector fixes it by adding an HNSW or IVFFlat index to Postgres. So the requirement is a vector index, not necessarily a separate product.
>
> And I'd say plainly that below about a hundred thousand vectors, brute force in NumPy is genuinely fine — tens of milliseconds, exact results, nothing to tune. Quite a lot of internal tools never need more than that.
>
> The constraint that usually bites first at scale isn't query speed anyway — it's memory. Graph indexes keep vectors and graph structure in RAM, so ten million vectors at 768 dimensions is tens of gigabytes before overhead. That's what quantization exists to solve."

## 8. Likely Follow-ups

**Q: Why can't a B-tree index vectors?**
A B-tree requires a total order to bisect on, and 768-dimensional vectors have none. You could index each dimension separately, but similarity depends on all dimensions jointly, so no single-dimension range narrows the candidate set meaningfully. The structure has nothing to exploit.

**Q: What's the curse of dimensionality here?**
In high dimensions, distances concentrate — the nearest and farthest points in a random set become similarly distant. That destroys the pruning that makes k-d trees fast in two or three dimensions, so they degrade to near-brute-force by a few dozen dimensions. It's why exact high-dimensional search has no good general algorithm.

**Q: Why not just use SQL with a distance function?**
Without a vector index that's a sequential scan over every row, every query — fine at a hundred thousand rows, seconds at ten million. pgvector solves it by adding an HNSW or IVFFlat index inside Postgres, which shows the real requirement is the index rather than a different product.

**Q: When do you not need a vector database?**
Below roughly a hundred thousand vectors, brute force in NumPy gives exact results in tens of milliseconds with nothing to tune or maintain. For an internal tool or a first version that's often the right answer, and saying so is better than reaching for infrastructure by reflex.

**Q: What actually limits scale?**
Usually memory, not query time. Graph indexes keep vectors and the graph structure in RAM, so ten million 768-dimensional vectors is tens of gigabytes before overhead. Quantization — product or scalar — exists primarily to address that, trading a little recall for a large memory reduction.

## 9. Common Mistakes

- Saying "vector databases are faster" without explaining why ordinary indexes don't apply.
- Not knowing that ANN is approximate for a principled reason.
- Assuming a SQL distance query is indexed when it's a sequential scan.
- Reaching for a dedicated store at small corpus sizes.
- Treating query latency as the scaling limit when memory usually is.

## 10. What to Remember

- **No traditional index applies** — no order, no exact match, no terms.
- **Brute force is linear per query** — ~7.7B multiply-adds at 10M × 768.
- **The curse of dimensionality is why ANN is approximate**, not a shortcut.
- **pgvector shows the requirement is the index**, not a separate product.
- **Under ~100k vectors, brute force is genuinely fine.** Memory, not speed, limits scale.
