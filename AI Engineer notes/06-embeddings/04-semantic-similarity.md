# Semantic Similarity

> **Phase 06 · EMBEDDINGS · Topic 04**

## 1. Definition

How closely two pieces of text mean the same thing, measured as geometric closeness between their embeddings. It's what retrieval ranks on, and it's a learned approximation rather than an objective quantity.

## 2. Simple Explanation

Two texts are semantically similar if they mean roughly the same thing, regardless of the words used.

The important caveat: "similar" is defined by whatever the embedding model was trained to consider similar. It's a learned notion, not a universal one — and different models draw the boundary differently.

## 3. How It Works

```
similarity(a, b) = cosine(embed(a), embed(b))
                 = how aligned their vectors are
```

**What models typically treat as similar:**

| Relationship | Usually similar? |
|---|---|
| Paraphrase — "wire fee" / "cost to send money abroad" | ✅ Strongly |
| Topical — "wire fees" / "wire processing times" | ✅ Moderately |
| Hypernym/hyponym — "transfer" / "international wire" | ✅ |
| **Antonym — "fee applies" / "fee waived"** | ⚠️ **Often similar!** |
| Contradiction — "$45" / "$25" | ⚠️ Often similar |
| Exact identifier match | ❌ Poorly distinguished |

**The antonym problem is the one worth knowing:** "the fee applies" and "the fee is waived" are topically nearly identical and semantically opposite. Embeddings measure topical relatedness more than they measure agreement, so both score highly against a query about fees.

## 4. Practical Example

**Why the antonym behavior is actually fine for retrieval:**

```
Query: "is the international transfer fee waived for Premier?"

Retrieved:
  [1] "Premier customers receive fee waivers on the first two
       international transfers per month."     ← the answer
  [2] "The international transfer fee applies to all retail
       accounts."                              ← relevant context

Both are retrieved because both are topically relevant.
That's CORRECT behavior — the model reads both and
determines which applies.

Retrieval's job is topical relevance. Determining which
statement holds is the generator's job.
```

**Where it becomes a problem:**

```
Semantic deduplication with a similarity threshold:
  "The fee applies."  vs.  "The fee is waived."
  cosine ≈ 0.91 → collapsed as duplicates
  → you just deleted the exception

So: don't use raw similarity for dedup on short contradictory
statements. Use document ID and span overlap, or a very high
threshold, or an NLI check for actual equivalence.
```

**Similarity scores are not calibrated:**

```
Not comparable across models — 0.72 means different things
Not comparable across corpora — depends on space density
Not probabilities — 0.8 ≠ 80% relevant
Compressed in practice — real similarities cluster ~0.3-0.9,
                         not spread over [-1, 1]

So any threshold must be tuned on your own data, and
re-tuned when the embedding model changes.
```

## 5. Why It Matters

- **It's what retrieval ranks on**, so understanding what it does and doesn't capture is foundational.
- **The antonym behavior** is a genuinely surprising property with real consequences for deduplication.
- **Non-calibration** is why thresholds can't be copied between systems.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Antonyms score similarly** | Topical relatedness ≠ agreement |
| **Not calibrated** | Thresholds don't transfer across models or corpora |
| **Not a probability** | 0.8 isn't 80% confidence |
| **Compressed range** | Real scores cluster narrowly; small gaps are meaningful |
| **Exact identifiers undifferentiated** | All policy numbers cluster |
| **Length effects** | Long documents drift toward a corpus average |
| **Asymmetry ignored** | Query-vs-document encoding mismatch distorts scores |

**On length effects:** very long text tends to produce embeddings closer to the corpus centroid, because averaging more content pulls toward the mean. That's part of why oversized chunks match everything weakly — it's a real mechanism behind the "blurred embedding" problem.

**On what to do with the antonym property:** accept it at retrieval, where topical relevance is what you want, and handle the distinction at generation with a prompt instruction to state which condition applies. Don't try to fix it in the embedding.

## 7. Interview Answer

> "Semantic similarity is how closely two texts mean the same thing, measured as cosine between their embeddings. The caveat I'd lead with is that 'similar' is defined by whatever the model was trained to consider similar — it's a learned notion, not an objective one, and different models draw the boundary differently.
>
> The property that surprises people is antonyms. 'The fee applies' and 'the fee is waived' are topically nearly identical and semantically opposite, and they score highly similar. Embeddings measure topical relatedness more than agreement.
>
> For retrieval that's actually correct behavior. If someone asks whether the Premier transfer fee is waived, I *want* both the waiver clause and the general fee clause retrieved — they're both relevant, and determining which applies is the generator's job, not retrieval's. Retrieval's job is topical relevance.
>
> Where it becomes a genuine problem is semantic deduplication. If I collapse chunks above a similarity threshold, 'the fee applies' and 'the fee is waived' score around 0.91 and get merged — and I've just deleted the exception. So for dedup I'd use document ID and span overlap rather than raw similarity, or a very high threshold, or an entailment check for actual equivalence.
>
> The other thing I'd emphasize is that similarity scores aren't calibrated. Not across models — 0.72 means different things. Not across corpora, because it depends on how densely the space is populated. Not probabilities. And in practice they cluster in a narrow band around 0.3 to 0.9 rather than spreading over the full range, so small gaps carry more meaning than the raw numbers suggest. Any threshold has to be tuned on your own data and re-tuned when the embedding model changes.
>
> One mechanism worth knowing: very long text drifts toward the corpus centroid because averaging more content pulls toward the mean. That's part of why oversized chunks match everything weakly."

## 8. Likely Follow-ups

**Q: Do embeddings distinguish antonyms?**
Poorly. "The fee applies" and "the fee is waived" are topically nearly identical and score highly similar, because embeddings capture topical relatedness more than agreement. For retrieval that's fine and arguably correct — both are relevant. For deduplication it's dangerous, since collapsing them deletes the exception.

**Q: Are similarity scores comparable across systems?**
No. They're not calibrated across models, because each defines its own space, or across corpora, because the score distribution depends on how densely the space is populated. And they're not probabilities. So a threshold from one system is meaningless in another and has to be tuned on your own data.

**Q: Why do real similarity scores cluster narrowly?**
Because corpus documents share vocabulary, structure, and domain, so they aren't spread uniformly through the space — and high dimensionality concentrates distances further. The practical consequence is that a gap between 0.55 and 0.70 can be far more meaningful than the raw numbers suggest.

**Q: How do you deduplicate without deleting exceptions?**
Use document ID and character-span overlap rather than raw similarity, which catches the actual overlap-induced duplicates. If you must use similarity, set a very high threshold and add an entailment check that the two statements genuinely say the same thing rather than being topically adjacent.

**Q: Why do long chunks match everything weakly?**
Because averaging more content pulls the embedding toward the corpus centroid — a vector representing five topics sits between all of them rather than at any one. That's the mechanism behind blurred embeddings, and it's why the correct chunk can lose to a smaller, better-focused one.

## 9. Common Mistakes

- Assuming embeddings distinguish contradictory statements.
- Copying a similarity threshold between models or systems.
- Treating a cosine score as a probability or confidence.
- Deduplicating on raw similarity and deleting exceptions.
- Not accounting for length effects on long chunks.

## 10. What to Remember

- **Similarity is a learned notion**, defined by the model's training, not objective.
- **Antonyms score similarly** — topical relatedness, not agreement. Fine for retrieval, dangerous for dedup.
- **Not calibrated**: not across models, corpora, or as probabilities.
- **Real scores cluster narrowly** — small gaps are meaningful.
- **Long text drifts toward the corpus centroid** — the blurred-embedding mechanism.
