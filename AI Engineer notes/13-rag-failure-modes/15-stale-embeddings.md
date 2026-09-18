# Failure Mode: Stale Embeddings

> **Phase 13 · RAG FAILURE MODES · Topic 15**

## 1. Definition

Vectors in the index that no longer correspond to the current text — because the document changed and wasn't re-embedded, or because chunks were updated in the store but their vectors weren't. The retrieved text and the vector that found it disagree.

## 2. Simple Explanation

The index has two things per chunk: the vector used for searching and the text returned to the model. If they drift apart, retrieval finds chunks based on content that no longer exists, and returns content that was never searched.

It's a quiet inconsistency that produces confusing, hard-to-diagnose failures.

## 3. How It Works

**The three ways they diverge:**

```
1. TEXT UPDATED, VECTOR NOT
   Chunk text refreshed in the store; re-embedding skipped or failed.
   → searching on old meaning, returning new text

2. PARTIAL RE-INDEX FAILURE
   Batch job re-embedded 80% of changed chunks, then errored.
   → half the document is current, half isn't

3. EMBEDDING MODEL CHANGED
   Some chunks embedded with the old model, some with the new.
   → vectors from different spaces, not comparable
```

**The third is the most damaging** and gets its own topic, but it's a stale-embedding case: the vectors aren't wrong relative to their text, they're wrong relative to *each other*.

**Detection:**

```python
# Store the hash of the text that was embedded, alongside the chunk
chunk.metadata["embedded_text_hash"] = sha256(text_at_embedding_time)

# Audit: does it still match the current text?
stale = [c for c in index.scan()
         if c.metadata["embedded_text_hash"] != sha256(c.text)]
# Nonzero → vectors and text have diverged.
```

That single field turns a silent inconsistency into a countable metric.

## 4. Practical Example

**The partial-failure case, which is the realistic one:**

```
Nightly re-index of 12,000 changed chunks.
At chunk 9,400 the embedding API rate-limits and the job exits.

  9,400 chunks: new text, new vectors    ✅
  2,600 chunks: new text, OLD vectors    ❌ stale
                (or worse: old text, if the text write also failed)

No alert. The job logged "processing 12,000 chunks."
Symptom: some questions about recently-updated policies retrieve
the right document and return text that doesn't match what was searched.
```

**The controls:**

```
1. TRANSACTIONAL WRITES  — text and vector updated together, or neither
2. embedded_text_hash    — makes divergence detectable and countable
3. JOB COMPLETION CHECKS — assert processed == expected; alert on mismatch
4. IDEMPOTENT RE-RUNS    — a failed job can be safely re-run from scratch
5. PERIODIC AUDIT        — scan for hash mismatches on a schedule
6. indexed_at PER CHUNK  — find chunks not touched by a run that
                           should have touched them
```

**On transactional writes:** most vector databases upsert a vector and its payload together, which prevents the simplest version. The gap appears when text lives in a separate docstore — as with parent-child retrieval — and the two stores are updated independently.

## 5. Why It Matters

- **It produces confusing failures** — retrieval finds the right document and returns unexpected text.
- **Partial batch failures are the common cause**, and they're silent without completion checks.
- **Parent-child architectures increase the risk** because text and vectors live in separate stores.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Non-transactional updates** | Text and vector written separately; one can fail |
| **No job completion assertion** | Partial failures logged as success |
| **Non-idempotent re-index** | Can't safely re-run a failed job |
| **No `embedded_text_hash`** | Divergence undetectable |
| **Separate docstore drift** | Parent-child: vectors in one store, parents in another |
| **Mixed embedding model versions** | Vectors from different spaces coexisting |

**The diagnostic signature:** retrieval returns a chunk whose text doesn't obviously relate to the query, but the chunk is from the right document. That pattern — right document, wrong-looking content — points at staleness rather than at ranking or embedding quality.

**Idempotence matters more than it sounds.** If a re-index job can be safely re-run from the start, a partial failure is recovered by running it again. If it isn't idempotent, you need to know exactly where it stopped, which is the information you're least likely to have.

## 7. Interview Answer

> "Stale embeddings are vectors that no longer correspond to their chunk's current text. The index holds two things per chunk — the vector used for searching and the text returned to the model — and if those drift apart, you search on old meaning and return new text.
>
> The realistic cause is partial batch failure. A nightly job re-embeds twelve thousand changed chunks, hits a rate limit at ninety-four hundred, and exits. Now two-thirds of the batch is current and a third isn't, the job logged 'processing twelve thousand chunks,' and there's no alert. The symptom is confusing: retrieval finds the right document and returns text that doesn't match what was searched.
>
> The single most useful control is storing a hash of the text that was embedded, alongside the chunk. Then divergence is detectable — you scan for chunks where that hash doesn't match the current text — and it becomes a countable metric rather than a silent inconsistency.
>
> Beyond that: transactional writes so text and vector update together or neither, job completion assertions comparing processed count to expected, idempotent re-runs so a failed job can simply be run again, and a periodic audit scan.
>
> Idempotence matters more than it sounds. If the job can be safely re-run from the start, a partial failure is recovered by running it again. If it isn't idempotent, you need to know exactly where it stopped — which is the information you're least likely to have after a crash.
>
> And parent-child architectures increase the risk specifically, because the vectors are in the index and the parent text is in a separate docstore. Those two stores can drift independently, and nothing in the vector database enforces consistency across them."

## 8. Likely Follow-ups

**Q: How do you detect stale embeddings?**
Store a hash of the text at embedding time in chunk metadata, then periodically scan for chunks where that hash doesn't match the current text. That converts a silent inconsistency into a countable metric you can alert on. Without it, the divergence is essentially invisible.

**Q: What's the most common cause?**
Partial batch failure during re-indexing — a job processes most of the changed chunks and then errors, leaving a mixed state with no alert. Job completion assertions comparing processed count to expected catch it, and idempotent re-runs make recovery trivial.

**Q: Why do parent-child architectures increase the risk?**
Because vectors live in the vector index and parent text lives in a separate docstore, and nothing enforces consistency between them. A child chunk's vector can be updated while its parent's text isn't, or vice versa. Single-store architectures at least get atomic upsert of vector and payload.

**Q: What does the failure look like in practice?**
Retrieval returns a chunk from the right document whose text doesn't obviously relate to the query. That specific pattern — right document, wrong-looking content — distinguishes staleness from a ranking problem or an embedding-quality problem, both of which return the wrong document entirely.

**Q: How do you recover?**
Re-embed the affected chunks, identified by hash mismatch. This is where idempotence pays off: if the re-index job is idempotent, you just run it again over the affected document set. I'd also add the completion assertions and the hash field at the same time, so the next partial failure is caught rather than discovered weeks later.

## 9. Common Mistakes

- No completion assertion, so partial batch failures log as success.
- Non-idempotent re-index jobs, making recovery from partial failure hard.
- Not storing the embedded-text hash, making divergence undetectable.
- Updating text and vectors in separate non-transactional operations.
- Assuming parent-child docstore and vector index stay consistent automatically.

## 10. What to Remember

- **The vector and the text disagree** — search on old meaning, return new text.
- **Partial batch failure is the common cause**, and it's silent without completion checks.
- **Store `embedded_text_hash`** — it turns a silent inconsistency into a countable metric.
- **Make re-index jobs idempotent** so a partial failure is recovered by re-running.
- **Parent-child architectures drift more** because text and vectors are in separate stores.
