# "Why That Vector Database?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 12**
>
> ⚠️ **An answer framework.** Name your actual store and the real reason.
> "It was the managed option on the platform we were already using" is a
> legitimate reason and a common one.

## 1. Definition

A question about infrastructure judgement. The strong answer separates the criteria that actually differ between options from the ones that don't.

## 2. Simple Explanation

Most vector stores do the same core thing — approximate nearest neighbour search over embeddings. They differ on operational characteristics, not on whether search works.

So the reasoning should be about operations, scale, and filtering — not about which one is "better."

## 3. How It Works

```
THE CRITERIA THAT ACTUALLY DIFFER

MANAGED VS SELF-HOSTED   who operates it
FILTERING MODEL          pre-filter in the engine, or after
UPDATE SEMANTICS         streaming vs batch index rebuild
SCALE CEILING            where it stops being comfortable
CO-LOCATION              does it live where your data does
COMPLIANCE               VPC-SC, CMEK, audit logs, residency
COST SHAPE               per-query, per-node, or per-GB

WHAT DOESN'T MEANINGFULLY DIFFER at small scale:
  recall quality — every mature engine does ANN well
```

## 4. Practical Example

**The honest scale answer:**

```
"At a few million vectors, almost anything works — including
 pgvector on a Postgres instance we already ran. The choice
 wasn't about recall quality, because every mature engine
 handles ANN well at that size.

 It was about operations: who runs it, how filtering works,
 and whether index updates are streaming or a rebuild."

That's a better answer than a feature comparison, because
it's true.
```

**The criterion that matters most in banking:**

```
PRE-FILTERING IN THE ENGINE

If permission filtering happens after retrieval, you fetch
top-k then drop what the user can't see — which means:
  · a user with narrow permissions can get 2 results
    back from a top-10 search, silently
  · and the fetched-then-dropped documents were still read

Pre-filtering searches only the permitted subset, so top-k
means k permitted results.

For a corpus with tiered access, that's the deciding
criterion — and it's about correctness, not performance.
```

**The Vector Search detail worth knowing:**

```
Vertex AI Vector Search stores VECTORS and RESTRICT TOKENS.
It does not store your documents.

So the architecture is two stores:
  Vector Search  → vector + chunk ID + restricts
  Firestore/GCS  → the chunk text, keyed by chunk ID

Retrieval is a search then a fetch. People who've only used
an all-in-one store are often surprised by this, and knowing
it signals real usage rather than reading.
```

**On what would change the choice:**

```
SCALE          past tens of millions, managed ANN
               infrastructure stops being optional
FILTERING      complex boolean permission logic that the
               engine can't express
CO-LOCATION    if the rest of the system moves platform
COST           per-node pricing is poor for spiky traffic;
               per-query is poor for constant high volume
```

## 5. Why It Matters

- **Recall quality isn't the differentiator** at small scale — operations are.
- **Pre-filtering in the engine** is the correctness criterion for tiered access.
- **Vector Search stores vectors, not documents** — a two-store architecture.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "It's the fastest" | Not meaningfully true at small scale |
| A feature-matrix recital | Sounds like a blog post, not a decision |
| No mention of filtering | The criterion that matters in banking |
| Claiming a scale you didn't reach | Probed with "how many vectors?" |
| Ignoring operational cost | Self-hosting is a real ongoing commitment |

**On pgvector, which is often the right answer:** if the corpus is a few million vectors and Postgres is already operated, pgvector means no new infrastructure, transactional consistency between chunk text and vectors, and SQL filtering that's expressive and applied properly. Saying "it was the boring choice and it was correct" is a strong answer — the failure mode is choosing dedicated vector infrastructure for a corpus that doesn't need it.

**On the migration question:** "what would make you move?" is the real follow-up. Scale past the point where a single instance is comfortable, filtering logic the engine can't express, or a platform move. Naming the trigger is what shows the choice was bounded rather than arbitrary.

## 7. Interview Answer

> "[**Your store and the honest reason.**]
>
> "It was [**yours**]. And the framing I'd use is that at a few million vectors, the choice isn't about recall quality — every mature engine does approximate nearest neighbour search well at that scale. It's about operations.
>
> The criteria that actually differ: who operates it, how filtering works, whether index updates are streaming or a rebuild, where the scale ceiling is, and whether it co-locates with the rest of the data.
>
> [**If it was pgvector**] Postgres was already running, so pgvector meant no new infrastructure, transactional consistency between chunk text and vectors in the same database, and SQL filtering that's expressive and applied properly as a pre-filter. That's the boring choice and at that scale it's usually the correct one — the failure mode I'd avoid is standing up dedicated vector infrastructure for a corpus that doesn't need it.
>
> [**If it was Vector Search**] It's the managed option on the platform, so it inherits VPC Service Controls, CMEK, and audit logging rather than needing them rebuilt. One detail worth knowing: Vector Search stores vectors and restrict tokens, not documents. So the architecture is two stores — vectors and chunk IDs in Vector Search, chunk text in Firestore keyed by chunk ID — and retrieval is a search then a fetch. People who've only used an all-in-one store are usually surprised by that.
>
> The criterion I'd single out for banking is pre-filtering in the engine. If permission filtering happens after retrieval, you fetch the top k and then drop what the user can't see — so a user with narrow permissions can get two results back from a top-ten search, silently, and the documents they weren't allowed to see were still read on their behalf. Pre-filtering searches only the permitted subset, so top-k actually means k permitted results. That's a correctness criterion, not a performance one, and for a corpus with tiered access it decides the choice.
>
> What would make me move: scale past tens of millions of vectors where managed ANN infrastructure stops being optional, permission logic too complex for the engine's filter expressions, or the rest of the system moving platform — co-location matters more than it sounds like it should, because a vector store in another network means every retrieval crosses a boundary with latency and egress cost attached."

## 8. Likely Follow-ups

**Q: Why not a dedicated vector database?**
At a few million vectors it's infrastructure without a corresponding benefit. Every mature engine does ANN well at that scale, so the differentiator is operations — and adding a system to operate, monitor, and secure has real ongoing cost.

**Q: What's the most important criterion?**
Pre-filtering in the engine, for a corpus with tiered access. Post-filtering fetches then drops, which silently under-returns for restricted users and means documents they couldn't see were still read on their behalf.

**Q: What would make you switch?**
Scale past tens of millions of vectors, permission logic the engine can't express in its filter language, or the rest of the system moving platform. Co-location matters because a store in another network puts latency and egress on every retrieval.

**Q: Does Vector Search store your documents?**
No — vectors and restrict tokens only. Chunk text lives separately, typically in Firestore keyed by chunk ID, and retrieval is a search followed by a fetch. That two-store shape surprises people used to all-in-one stores.

**Q: How many vectors did you have?**
[**Honest number.**] Getting this right matters, because the scale determines whether the choice was reasonable. A few million justifies the boring option; claiming a scale you didn't reach invites exactly this question.

## 9. Common Mistakes

- Reciting a feature matrix instead of a decision.
- Claiming speed differences that don't exist at small scale.
- No mention of the filtering model.
- Overstating the corpus size.
- Treating self-hosting as free.

## 10. What to Remember

- **At small scale it's an operations choice**, not a recall-quality one.
- **Pre-filtering in the engine** is the banking criterion — post-filter silently under-returns.
- **pgvector is often correct** — say so if it was.
- **Vector Search stores vectors, not documents** — search then fetch.
- **Name the trigger that would make you move.**
