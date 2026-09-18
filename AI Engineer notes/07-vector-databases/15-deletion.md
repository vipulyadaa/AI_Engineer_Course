# Deletion

> **Phase 07 · VECTOR DATABASES · Topic 15**

## 1. Definition

Removing vectors from an index so their content is no longer retrievable. Harder than it sounds, because ANN indexes have no clean removal operation and because "no longer retrievable" and "actually erased" are different guarantees.

## 2. Simple Explanation

Most vector indexes can't really delete. They mark the vector as deleted and filter it out of results, but it stays in the structure — in a graph index, still routing other searches.

That's usually fine for correctness of results. It's not fine when a regulation requires the data to be gone.

## 3. How It Works

```
SOFT DELETE (what most engines do)
  · mark the vector as deleted
  · filter it from results
  · it remains in the graph / cell as a waypoint
  · space is not reclaimed

HARD DELETE
  · rebuild the index without it
  · expensive; usually scheduled, not on demand
```

**Three distinct requirements that get conflated:**

| Requirement | Satisfied by |
|---|---|
| Not returned in results | Soft delete |
| Space reclaimed, index healthy | Periodic rebuild |
| Data provably erased | Rebuild + purge of payload store and backups |

## 4. Practical Example

**What a document deletion actually has to touch:**

```
Delete document "policy-wire-2022":

  1. vector index      — all its chunk vectors
  2. payload store     — chunk text and metadata
  3. lexical index     — if hybrid search is in use   ← missed often
  4. object storage    — the source file
  5. caches            — retrieval and response caches
  6. backups           — subject to retention policy
  7. logs / traces     — if chunk text was logged     ← missed often

Deleting from the vector index alone means the content is still
in the payload store, still matched by BM25, and possibly still
being served from cache.
```

**Rows 3 and 7 are the ones that get missed.** Hybrid search means two indexes, and a retrieval log that records retrieved chunk text is a second copy of the corpus that nobody thinks of as a copy.

**The chunk-ID diff, which is what makes deletion reliable:**

```python
current_ids  = {c.chunk_id for c in chunk(load(doc))}   # empty if deleted
indexed_ids  = index.ids_for(doc_id=doc.id)

index.delete(ids=indexed_ids - current_ids)
```

**Running this for every document on every ingestion** makes deletion a property of the pipeline rather than a separate operation that can be forgotten — and it handles the re-chunking case where a document shrinks from twelve chunks to nine.

**Soft delete accumulating:**

```
A graph index where 30% of nodes are tombstoned:
  · the walk traverses dead nodes that return nothing
  · effective ef_search is lower than configured
  · recall drops, latency rises — silently

Monitor the tombstone ratio and rebuild on a threshold.
```

## 5. Why It Matters

- **Right-to-erasure and document retraction** are legal requirements, not preferences.
- **Deletion touches more systems than the index**, and the missed ones are consistent across teams.
- **Soft deletes degrade the index**, which is a real operational cost.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Only the vector index cleared** | Content survives elsewhere |
| **Lexical index not updated** | Hybrid search still returns it |
| **Caches not invalidated** | Deleted content served from cache |
| **Logs retaining chunk text** | An unmanaged copy of the corpus |
| **Tombstone accumulation** | Graph degrades; recall falls silently |
| **No deletion audit trail** | Can't prove erasure happened |

**On proving erasure:** a compliance request needs evidence that deletion occurred across every store, with a timestamp. That means the delete path should emit an audit record per system touched, not just execute. Building that in from the start is trivially cheaper than reconstructing it during an audit.

**On backups:** backups made before deletion still contain the data. Handling this honestly means having a retention policy that bounds the window, and documenting that the data ages out of backups within it, rather than claiming immediate erasure everywhere.

## 7. Interview Answer

> "Deletion is harder than it looks for two reasons. ANN indexes have no clean removal operation, and 'no longer retrievable' and 'actually erased' are different guarantees.
>
> On the first: most engines soft-delete. They mark the vector deleted and filter it from results, but it stays in the structure — in a graph index it's still a routing waypoint for other searches. That satisfies correctness of results, and the accumulating tombstones are an operational cost. At thirty percent tombstoned, the walk traverses dead nodes that return nothing, so effective search width is lower than configured and recall drops silently. I'd monitor the tombstone ratio and rebuild on a threshold.
>
> On the second: deleting a document has to touch the vector index, the payload store, the lexical index if hybrid search is in use, object storage, caches, backups subject to retention, and logs if chunk text was ever logged. The two consistently missed are the lexical index — because hybrid means two indexes and people think of one — and retrieval logs, which are effectively a second copy of the corpus that nobody thinks of as a copy.
>
> The mechanism I'd use to make deletion reliable is a chunk-ID diff on every ingestion: compute the chunk IDs the current source produces, diff against what's indexed for that document, delete the difference. For a deleted document the current set is empty so everything goes. That makes deletion a property of the pipeline rather than a separate operation someone can forget, and it also handles re-chunking where a document shrinks from twelve chunks to nine.
>
> For compliance I'd emit an audit record per system touched with a timestamp, so erasure can be proven rather than asserted — that's trivially cheaper to build in than to reconstruct during an audit.
>
> And I'd be honest about backups. A backup taken before deletion still contains the data. The defensible position is a bounded retention policy with documentation that the data ages out within it, not a claim of immediate erasure everywhere."

## 8. Likely Follow-ups

**Q: Why can't vector indexes delete cleanly?**
Because the structure encodes relationships. In a graph index, removing a node would break the paths that route through it, so implementations tombstone instead — the node stays as a waypoint but returns nothing. Genuine removal requires rebuilding the index without it.

**Q: What does soft deletion cost?**
Index degradation. Tombstoned nodes still get traversed, so effective search width falls below what's configured and recall drops while latency rises — silently, with no error. Monitoring the tombstone ratio and rebuilding on a threshold is the standard mitigation.

**Q: What else has to be deleted besides the index?**
The payload store, the lexical index if hybrid search is used, object storage, caches, backups within the retention policy, and logs if chunk text was recorded. The lexical index and retrieval logs are the ones most often missed — both leave the content retrievable or stored after the vector is gone.

**Q: How do you make deletion reliable?**
Diff chunk IDs on every ingestion: what the current source produces versus what's indexed for that document, and delete the difference. For a deleted document the current set is empty, so it all goes. That makes deletion a pipeline property rather than a separate step someone can skip.

**Q: How do you handle right-to-erasure?**
Delete across every store, emit an audit record per system with a timestamp so erasure is provable, and schedule an index rebuild so the vector is genuinely gone rather than tombstoned. For backups, the defensible answer is a bounded retention policy and documentation that the data ages out within it.

## 9. Common Mistakes

- Deleting from the vector index only.
- Forgetting the lexical index in a hybrid system.
- Leaving chunk text in retrieval logs.
- Not invalidating caches on delete.
- Claiming immediate erasure while backups still hold the data.

## 10. What to Remember

- **Most engines soft-delete** — filtered from results, still in the structure.
- **Tombstones degrade the index silently.** Monitor the ratio; rebuild on threshold.
- **Deletion touches many systems** — lexical index and logs are the missed ones.
- **Chunk-ID diff on every ingestion** makes deletion a pipeline property.
- **Audit the delete path** so erasure can be proven, and be honest about backups.
