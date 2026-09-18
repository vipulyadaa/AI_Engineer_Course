# "How Did Embeddings Work?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 08**
>
> ⚠️ **An answer framework.** Describe what you actually used and configured.

## 1. Definition

A question about the embedding stage — which model, how queries versus documents were handled, and whether the version was pinned. It's where a small silent misconfiguration costs recall for months.

## 2. Simple Explanation

Text goes in, a vector comes out, and similar meanings land near each other. That part is simple.

The interesting answers are about the details that fail silently: task types, version pinning, and what text was actually embedded.

## 3. How It Works

```
THE DECISIONS

MODEL          which one, and why
TASK TYPE      query vs document — asymmetric by design
VERSION        pinned, or a floating alias
EMBEDDED TEXT  what exactly went in — body only, or with
               the breadcrumb
DIMENSIONS     full, or reduced
NORMALIZATION  and therefore which distance metric
```

**Task type is the one that fails silently.** Embedding a query with the document task type produces no error, normal-looking scores, and measurably worse retrieval.

## 4. Practical Example

**The silent failure worth naming:**

```
Most modern embedding models are ASYMMETRIC — they place
queries and documents differently, because a short question
and a long passage aren't the same kind of text.

  documents → RETRIEVAL_DOCUMENT
  queries   → RETRIEVAL_QUERY

Getting this wrong:
  · nothing errors
  · similarity scores look normal
  · retrieval is measurably worse
  · the cause is invisible unless you compare

It's the kind of bug that persists for months because
everything appears to work — which is exactly why it's
worth mentioning having got it right.
```

**Version pinning, and why it matters:**

```
An explicit version, never a floating alias.

If the provider updates the model behind the name, indexed
document vectors came from the old model while new query
vectors come from the new one. If the space shifted,
they're no longer properly comparable — silent,
corpus-wide degradation with no deploy on your side.

And storing the model name in every chunk's metadata is
what makes a future migration possible: index the new
vectors alongside the old tagged by model, evaluate both,
and cut over by changing a query filter. Doing it in place
means a partial failure leaves a mixed index where old
vectors score meaninglessly.
```

**What text was embedded:**

```
Not just the chunk body — the breadcrumb prefix too.

That's worth stating explicitly because it connects to
chunking, and because the content hash for incremental
re-embedding has to cover the same text. Hashing the raw
body means an enrichment format change goes undetected.
```

**On model choice:** the honest answer is usually that a well-regarded default was used. "text-embedding-005 because it's the current Vertex AI model and it's what the platform integrates with" is fine. If you compared models on a golden set, that's the strong version — but claiming a comparison that didn't happen is the wrong risk to take.

## 5. Why It Matters

- **Task type fails silently** — no error, normal scores, worse retrieval.
- **Version pinning** prevents corpus-wide degradation from a provider update.
- **The embedded text includes the breadcrumb**, and the hash must match it.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Naming a model with no configuration detail | Misses where failures live |
| No mention of task types | The silent recall bug |
| Floating model alias | Provider updates change behaviour |
| No model name in chunk metadata | No safe migration path |
| Claiming a model comparison that didn't happen | Easy to probe |
| Hash over raw text, not embedded text | Enrichment changes undetected |

**On dimensions:** reducing output dimensionality trades quality for storage and search speed. At a few million vectors the storage saving is irrelevant, so full dimensions are right. Knowing that the lever exists and that it's not worth pulling at small scale is a better answer than either ignoring it or having used it unnecessarily.

**On normalization and metric:** most text embedding models produce normalized vectors, which makes cosine, dot product, and L2 rank identically — so the metric choice is largely moot as long as the index configuration matches what the model expects. Saying that is more accurate than debating cosine versus dot product as though it mattered here.

## 7. Interview Answer

> "[**Your setup.** The details below are where the real answers are.]
>
> "The model was [**yours**] — [**your reason**]. If it was the platform default: text-embedding-005, because it's the current Vertex AI model and it integrates with the rest of the platform. [**If you compared models on a golden set, that's the stronger answer — but only if you did.**]
>
> The configuration details that matter more than the model choice:
>
> Task types. Most modern embedding models are asymmetric — they place queries and documents differently, because a short question and a long passage aren't the same kind of text. So documents were embedded with the document task type and queries with the query task type. That's worth calling out because getting it wrong fails silently: nothing errors, the similarity scores look normal, and retrieval is measurably worse. It's the kind of bug that persists for months because everything appears to work.
>
> Version pinning — an explicit version, never a floating alias. If the provider updates the model behind the name, indexed document vectors came from the old model while new query vectors come from the new one, and if the space shifted they're no longer properly comparable. That's silent corpus-wide degradation with no deploy on my side.
>
> And the model name is stored in every chunk's metadata, which is what makes a future migration possible — index new vectors alongside the old tagged by model, evaluate both, and cut over by changing a query filter. Doing it in place means a partial failure leaves a mixed index where old-model vectors score essentially randomly against new-model queries, and rolling back means redoing the work you already did.
>
> On what was embedded — not just the chunk body, but the breadcrumb prefix too. That connects to chunking, and it also means the content hash for incremental re-embedding has to cover the same text. Hashing the raw body would mean a change to the enrichment format goes undetected and the vectors silently stop representing what I think they do.
>
> On dimensions, I used the full output. Reducing dimensionality trades quality for storage and search speed, and at a few million vectors the storage saving isn't worth the quality cost — it becomes a real lever at tens of millions, where it might remove the need to shard.
>
> And on the distance metric — most text embedding models produce normalized vectors, which makes cosine, dot product, and L2 rank identically. So the metric choice is largely moot as long as the index configuration matches what the model expects."

## 8. Likely Follow-ups

**Q: Did you use different task types for queries and documents?**
Yes — most modern models are asymmetric. Getting it wrong produces no error, normal-looking similarity scores, and measurably worse retrieval, so it's a bug that persists for months because everything appears to work.

**Q: Was the model version pinned?**
Explicitly, never a floating alias. A provider update behind the same name means indexed vectors came from the old model while queries come from the new one — silent corpus-wide degradation with no deploy on your side and nothing in the change log explaining it.

**Q: How would you change the embedding model?**
Side by side. Index the new vectors alongside the old tagged by model version, evaluate both on a golden set, and cut over by changing a query filter. In-place re-embedding means a partial failure leaves a mixed index where old vectors score meaninglessly.

**Q: What text was actually embedded?**
The breadcrumb prefix plus the chunk body — not the body alone. And the content hash for incremental re-embedding has to cover the same text, or a change to the enrichment format goes undetected while the vectors silently diverge.

**Q: Why not reduce dimensionality?**
At a few million vectors the storage saving isn't worth the quality cost. It becomes a real lever at tens of millions, where roughly threefold less memory might remove the need to shard — which is a large infrastructure and latency win.

## 9. Common Mistakes

- Naming a model without any configuration detail.
- Not using distinct query and document task types.
- A floating model alias.
- No model version in chunk metadata.
- Content hash over the raw body rather than the embedded text.

## 10. What to Remember

- **Task types are asymmetric** and getting them wrong fails silently.
- **Pin the version**; store it in chunk metadata for migration.
- **Embed the breadcrumb**, and hash the same text.
- **Full dimensions at small scale** — reduction is a lever at tens of millions.
- **Normalized vectors make the metric choice mostly moot.**
