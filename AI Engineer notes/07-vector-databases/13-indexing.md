# Indexing (the Operation)

> **Phase 07 · VECTOR DATABASES · Topic 13**

## 1. Definition

The operational process of getting vectors into a searchable index — batching, building, verifying, and making it live. Distinct from the index *structure*; this is the pipeline and its failure handling.

## 2. Simple Explanation

Embedding a corpus and pushing it to a vector store sounds like a loop. In production it's a job that has to handle rate limits, partial failures, resumability, verification, and a safe cutover.

The hard parts are: what happens when it fails halfway, and how you know the result is correct before serving it.

## 3. How It Works

```
1. BATCH        chunks into groups sized for the embedding API
2. EMBED        with retry, backoff, and concurrency limits
3. UPSERT       into the index in batches, idempotently
4. VERIFY       counts, spot-check retrievals, golden-set recall
5. ACTIVATE     make it live — atomically if possible
```

**Idempotency is what makes the job restartable:** key every chunk by a deterministic `chunk_id` derived from `doc_id` plus position plus content hash. Re-running the job upserts the same IDs rather than creating duplicates, so a failed run can simply be re-run.

## 4. Practical Example

**A resumable indexing job:**

```python
def index_corpus(docs, batch_size=100):
    done = set(state.load("indexed_chunk_ids"))     # resume point

    for batch in batched(all_chunks(docs), batch_size):
        pending = [c for c in batch if c.chunk_id not in done]
        if not pending:
            continue
        vectors = embed_with_retry([c.embedded_text for c in pending])
        index.upsert([
            (c.chunk_id, v, c.metadata)             # idempotent by id
            for c, v in zip(pending, vectors)
        ])
        done.update(c.chunk_id for c in pending)
        state.save("indexed_chunk_ids", done)       # checkpoint
```

**Why checkpointing matters:** embedding ten million chunks takes hours and costs real money. A job that restarts from zero on failure will fail repeatedly and expensively. Checkpointing after each batch makes a restart cheap.

**Verification before activation — the step most often skipped:**

```
1. COUNT      indexed chunks == expected chunks?
2. SAMPLE     fetch 50 random chunks; does the text match source?
3. RETRIEVE   run the golden set; is recall@10 at target?
4. COMPARE    against the currently live index — is it better
              or at least equal?

Only then activate.

Skipping step 3 is how a subtly broken index — wrong task type
on the embeddings, truncated chunks, a misconfigured metric —
reaches production and degrades everything silently.
```

**The atomic cutover pattern:** build into a new index or a new `index_version` namespace, verify, then flip an alias or config pointer. Rollback is flipping it back. Indexing in place means there's no verified state to return to.

## 5. Why It Matters

- **Idempotent chunk IDs make failure recoverable** rather than catastrophic.
- **Verification before activation** is what catches silently broken indexes.
- **Build-then-swap** gives instant rollback; in-place indexing gives none.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No checkpointing** | Expensive restarts from zero |
| **Non-deterministic IDs** | Re-runs create duplicates |
| **No verification** | Broken index activated silently |
| **In-place build** | No rollback path |
| **Rate limits unhandled** | Job dies mid-corpus |
| **Deletes never reconciled** | Removed content stays retrievable |

**On deletes:** an indexing job that only upserts leaves orphans behind when documents are removed or re-chunked into fewer pieces. The job must compute the set of chunk IDs the current source produces, diff it against what's in the index for that document, and delete the difference. Without that, retracted content stays retrievable indefinitely — which in a regulated setting is a compliance problem, not a tidiness one.

**On cost control:** embedding is the main one-time cost, and a mistake that forces a full re-index is expensive. Running the pipeline on a 1% sample first — verifying chunk boundaries, task types, and metadata — costs almost nothing and catches the errors that would otherwise be discovered after paying for the full run.

## 7. Interview Answer

> "Indexing as an operation is batch, embed, upsert, verify, activate. The mechanics are simple; the engineering is in failure handling and verification.
>
> The foundation is idempotency. I'd key every chunk by a deterministic ID derived from document ID, position, and content hash. That means re-running the job upserts the same IDs rather than creating duplicates, so a failed run is just re-run. Combined with checkpointing after each batch, a failure at hour three resumes from hour three instead of from zero — which matters when embedding ten million chunks takes hours and costs real money.
>
> The step most often skipped is verification before activation. Four checks: does the indexed count match the expected count, do fifty sampled chunks match their source text, does the golden set hit the recall target, and is it at least as good as the currently live index. Skipping the golden-set check is how a subtly broken index reaches production — wrong task type on the embeddings, truncated chunks, a misconfigured distance metric. None of those throw an error; they just quietly make retrieval worse.
>
> So I'd build into a new index or a versioned namespace, verify, then flip an alias. Rollback is flipping it back. Indexing in place means there's no verified state to return to, which is the same argument as for embedding-model migrations.
>
> Two things I'd be careful about. Deletes — a job that only upserts leaves orphans when documents are removed or re-chunked into fewer pieces. It has to diff the chunk IDs the current source produces against what's indexed for that document and delete the difference. Otherwise retracted content stays retrievable indefinitely, which in a bank is a compliance problem rather than untidiness.
>
> And cost — I'd run the whole pipeline on a one percent sample first and verify chunk boundaries, task types, and metadata before the full run. It costs almost nothing and catches the errors you'd otherwise discover after paying for the entire corpus."

## 8. Likely Follow-ups

**Q: How do you make an indexing job restartable?**
Deterministic chunk IDs so upserts are idempotent, plus checkpointing the set of completed IDs after each batch. A restart then skips what's done rather than starting over, which turns an expensive multi-hour failure into a cheap resume.

**Q: What do you verify before going live?**
Indexed count against expected count, a sample of chunks checked against source text, golden-set recall against target, and a comparison against the currently live index. The golden-set check is the one that catches silently broken indexes — wrong task types, truncated chunks, a misconfigured metric.

**Q: How do you handle deletes during indexing?**
Diff the chunk IDs the current source produces against what's indexed for that document and delete the difference. Upsert-only jobs leave orphans whenever a document is removed or re-chunked into fewer pieces, and that content stays retrievable indefinitely.

**Q: How do you avoid a bad index reaching users?**
Build into a new index or versioned namespace, verify it, then flip an alias to activate. Rollback is flipping the alias back. Indexing in place gives no verified state to return to and no atomic cutover.

**Q: How do you control indexing cost?**
Run the full pipeline on a one percent sample first and verify chunk boundaries, task types, and metadata before committing to the whole corpus. Embedding is the main one-time cost, and a configuration error found after the full run means paying twice.

## 9. Common Mistakes

- Non-deterministic chunk IDs, producing duplicates on re-run.
- No checkpointing, so failures restart from zero.
- Activating without golden-set verification.
- Upsert-only jobs that never reconcile deletes.
- Skipping a sample run before an expensive full index.

## 10. What to Remember

- **Deterministic chunk IDs + checkpointing** = restartable, idempotent jobs.
- **Verify before activating** — count, sample, golden-set recall, comparison.
- **Build into a new index and flip an alias.** In-place has no rollback.
- **Reconcile deletes**, or retracted content stays retrievable.
- **Sample-run the pipeline first** — embedding the full corpus twice is expensive.
