# "Why That Chunk Size?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 13**
>
> ⚠️ **An answer framework.** "It started as a default and I'd measure it
> properly now" is a credible answer. An invented experiment is not.

## 1. Definition

A question that looks like it's about a number and is actually about whether you know what the number trades off — and how you'd find the right one.

## 2. Simple Explanation

Small chunks are precise but lose context. Large chunks carry context but dilute the embedding and waste tokens.

The right size depends on the documents, which is why there's no universal answer — and why the method matters more than the value.

## 3. How It Works

```
THE TRADE-OFF

SMALLER CHUNKS
  + precise embeddings, less irrelevant text retrieved
  + more chunks fit in the context window
  − conditions get separated from their rules
  − more chunks needed to answer one question

LARGER CHUNKS
  + a rule and its exceptions stay together
  + fewer retrievals needed
  − the embedding averages multiple topics, so it
    matches everything weakly and nothing strongly
  − more tokens per query, most of them irrelevant
```

**The embedding dilution point is the one worth making:** an embedding is a single vector for the whole chunk. Put three topics in it and the vector represents none of them well.

## 4. Practical Example

**Why the answer is document-dependent, not universal:**

```
A POLICY DOCUMENT with numbered sections where each
subsection is a self-contained rule
  → chunk on the subsection, whatever size that is
  → the natural unit already exists; imposing a fixed
    size fights the document

A LONG NARRATIVE with no structure
  → a size genuinely has to be chosen, and that's where
    measurement applies

Saying "I chunked on the document's own structure" is
better than any number, when the structure exists.
```

**The measurement, for when a number is needed:**

```
1. Build a golden set — real queries with the correct
   chunk labelled
2. Index the corpus at several sizes
3. Measure recall@k at each
4. Take the smallest size where recall stops improving

Smallest, not largest — because every extra token is
context-window pressure and per-query cost.

That's the answer to "how would you choose?" whether or
not you ran it.
```

**The token-counting trap, restated because it matters:**

```
chunk_size=1000 in a character-based splitter is roughly
250 TOKENS.

So anyone who picked 1000 "because the embedding model
handles 2048 tokens" built chunks a quarter of the intended
size — and never saw an error.

If your answer includes a number, be clear which unit it's
in.
```

## 5. Why It Matters

- **Large chunks dilute the embedding** — one vector can't represent three topics.
- **The method beats the number** — a golden set and recall@k.
- **Take the smallest size where recall plateaus**, not the largest.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "512 tokens, it's standard" | No reasoning, and there's no standard |
| An invented A/B test | The follow-up asks what you measured |
| Not knowing the unit | Characters vs tokens is a 4× error |
| "Bigger is better now, context is cheap" | Ignores dilution and cost |
| A single size for all document types | Tables and prose differ |

**On the "context windows are huge now" argument:** it's a real point and it's incomplete. A larger window removes the hard limit on how much you can include, but it doesn't remove embedding dilution — retrieval still has to find the chunk, and a chunk covering three topics matches queries about all three weakly. Retrieval precision, not context capacity, is what chunk size controls.

**On overlap:** the reason for overlap is that a boundary can cut a sentence or separate a definition from its use. 10–15% is a reasonable default. The cost is storage and duplicate retrievals of near-identical chunks — and if structure-aware chunking is doing its job, overlap matters less, because boundaries fall where the document already breaks.

## 7. Interview Answer

> "[**Your value, honestly.** The reasoning and method are what's being assessed.]
>
> "[**If you chunked on structure**] I didn't really pick a size — I chunked on the document's own structure, because the policy documents had numbered subsections and each one was a self-contained rule. So chunk boundaries fell where the document already broke, and sizes varied. When the natural unit exists, imposing a fixed size fights the document.
>
> [**If you did pick a size**] It was [**your value**] tokens, and honestly it started as a default rather than a measured choice.
>
> What the number trades off: smaller chunks give more precise embeddings and retrieve less irrelevant text, but they separate conditions from the rules they apply to. Larger chunks keep a rule and its exceptions together, but they dilute the embedding — an embedding is a single vector for the whole chunk, so three topics in one chunk means a vector that matches queries about all three weakly and none of them strongly.
>
> That dilution point is why 'context windows are large now, so use big chunks' is incomplete. A bigger window removes the limit on how much you can include, but retrieval still has to find the right chunk first. Chunk size controls retrieval precision, not context capacity.
>
> How I'd choose it properly: build a golden set of real queries with the correct chunk labelled, index the corpus at several sizes, measure recall at k for each, and take the smallest size where recall stops improving. Smallest rather than largest, because every extra token is context-window pressure and per-query cost.
>
> And one thing worth being precise about — the unit. The common library default counts characters, so a chunk_size of a thousand is about two hundred and fifty tokens. Anyone who chose a thousand because the embedding model handles two thousand tokens is off by four times, with no error raised anywhere.
>
> On overlap — [**your value**], around ten to fifteen percent. It exists because a boundary can cut a sentence or separate a definition from its use. Though if structure-aware chunking is doing its job, overlap matters less, since boundaries fall where the document already breaks."

## 8. Likely Follow-ups

**Q: Did you test other sizes?**
[**Honest answer.**] If not, describing the method — golden set, index at several sizes, recall@k, take the smallest size where it plateaus — is stronger than implying an experiment you'd then be asked to detail.

**Q: Why not use much larger chunks now that context windows are big?**
Because the window isn't the constraint — retrieval precision is. A chunk covering three topics produces one vector that matches queries about all three weakly, so the right chunk becomes harder to find regardless of how much context you could carry.

**Q: Why not much smaller chunks?**
Conditions get separated from their rules. A chunk saying a fee is waived, without the sentence saying for which tier, reads as complete and produces a wrong answer that passes grounding verification.

**Q: What overlap and why?**
Around 10–15%, because a boundary can cut a sentence or split a definition from its use. The cost is storage and near-duplicate retrievals. Structure-aware chunking reduces the need, since boundaries land where the document already breaks.

**Q: Tokens or characters?**
Tokens. The common default counts characters, which is roughly a 4× difference — so sizing against an embedding model's token limit using a character-based splitter gives chunks a quarter of the intended size, silently.

## 9. Common Mistakes

- Quoting a number as if it were a standard.
- Inventing an A/B test.
- Not knowing whether the value was characters or tokens.
- Arguing large context windows make chunk size irrelevant.
- Optimizing size while ignoring breadcrumb enrichment, which matters more.

## 10. What to Remember

- **Chunk on structure when it exists** — better than any number.
- **Large chunks dilute the embedding** — one vector, three topics.
- **Measure with a golden set**, take the smallest size where recall plateaus.
- **Big context windows don't fix retrieval precision.**
- **Know your unit** — characters vs tokens is a 4× error.
