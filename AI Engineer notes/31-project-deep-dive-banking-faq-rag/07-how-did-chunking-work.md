# "How Did Chunking Work?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 07**
>
> ⚠️ **An answer framework.** Describe your actual strategy, including if it
> started as fixed-size. "We started with fixed-size and changed it because X"
> is a stronger answer than claiming structure-awareness from the start.

## 1. Definition

A question about how documents were split, and — more importantly — why. Chunking is the single biggest quality lever in a RAG system, so this is where a considered answer shows most.

## 2. Simple Explanation

Chunking determines whether a retrieved piece of text makes sense on its own.

The failure that matters in banking is splitting a rule from its condition — a chunk saying a fee is waived, without the sentence saying for whom.

## 3. How It Works

```
THE DECISIONS

BOUNDARY    where to split — fixed size, or structure
SIZE        how large, measured in TOKENS not characters
OVERLAP     how much, and why
ENRICHMENT  what's prefixed into the text before embedding
SPECIAL     tables, lists, code — handled differently
```

**The enrichment decision is the one most people skip**, and it's often the largest quality gain available.

## 4. Practical Example

**The failure that motivates structure-aware chunking:**

```
SOURCE (one section)
  "3.2 International Transfers
   The standard fee is $45.00 per transfer. For Premier and
   Private tier customers the fee is $25.00. The first two
   transfers per calendar month are waived for these tiers."

FIXED-SIZE SPLIT at an unlucky boundary:
  chunk A: "...The standard fee is $45.00 per transfer. For
            Premier and Private tier customers the fee is"
  chunk B: "$25.00. The first two transfers per calendar
            month are waived for these tiers."

Chunk B retrieved alone states a waiver with no product,
no tier, and no fee. It reads as complete.

That's the omission failure — introduced by the chunking
strategy, not by the model. And grounding verification
passes, because the answer faithfully reflects the chunk.
```

**The enrichment fix, and why it's not just metadata:**

```
chunk text becomes:

  "Retail Banking Policy > 3. Fees > 3.2 International
   Transfers

   The first two transfers per calendar month are waived
   for these tiers."

Two effects:
  1. RETRIEVAL — the chunk now matches a query about
     international transfer fees
  2. INTERPRETATION — the model knows what "these tiers"
     refers to

And the key point: the breadcrumb has to be in the EMBEDDED
TEXT, not just in metadata. Metadata is filterable but not
searchable — only text that's embedded influences
similarity. Putting the section path in metadata alone does
nothing for retrieval.
```

**That metadata-versus-embedded-text distinction is the strongest single point** in this answer, because it's a real insight most people miss.

**Size, measured correctly:** chunk size must be counted in tokens, not characters. A `chunk_size=1000` using character count is roughly 250 tokens — so if you sized chunks against the embedding model's token limit, you're off by four times and everything downstream is smaller than intended.

## 5. Why It Matters

- **Splitting a rule from its condition** is the failure that matters in banking.
- **Breadcrumbs must be in the embedded text**, not just metadata.
- **Character versus token counting** silently makes chunks a quarter of the intended size.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We used 1000 characters with 200 overlap" | A number without reasoning |
| No mention of enrichment | The largest available gain |
| Breadcrumbs only in metadata | Doesn't affect retrieval |
| Size in characters | Four times off from the intended token count |
| No special handling for tables | The most-queried document breaks |
| Claiming structure-awareness from the start | Often untrue and unnecessary |

**On tables:** a recursive character splitter cuts a table mid-way, separating rows from their header — and for a fee schedule that's fatal, since a chunk of numbers with no column labels means nothing. Keeping small tables whole regardless of chunk size, and repeating the header row across chunks of large ones, is the fix. Mentioning it shows you know where the corpus actually breaks.

**On how the size was chosen:** the honest answer is usually that it started as a default and was adjusted. If you measured — running the golden set at several sizes and comparing recall — say so, because that's the strong version. If you didn't, "we started at 800 tokens and it worked acceptably, and I'd measure it properly now" is credible where an invented measurement isn't.

## 7. Interview Answer

> "[**Your strategy.** The reasoning below is what makes the answer land.]
>
> "Chunking followed document structure rather than a fixed size, because the documents had numbered sections and fixed-size splitting broke rules away from their conditions.
>
> Concretely: a section might say the standard fee is forty-five dollars, that Premier and Private customers pay twenty-five, and that the first two transfers per month are waived for those tiers. A fixed-size split at an unlucky boundary produces a chunk saying 'the first two transfers per calendar month are waived for these tiers' — with no product, no tier, and no fee. Retrieved alone it reads as complete, and an answer built on it would state an unconditional waiver.
>
> That's the omission failure, and it's introduced by the chunking strategy rather than by the model — grounding verification passes, because the answer faithfully reflects the chunk it was given.
>
> The change that mattered most was enrichment: prefixing the section path into the chunk text before embedding. So the chunk becomes 'Retail Banking Policy, section 3.2, International Transfers' followed by the content. That does two things — it makes the chunk retrievable for a query about international transfer fees, and it tells the model what 'these tiers' refers to.
>
> And the detail I'd emphasize: the breadcrumb has to be in the embedded text, not just in metadata. Metadata is filterable but not searchable — only text that's actually embedded influences similarity. Putting the section path in metadata alone does nothing for retrieval at all, and that's a mistake I'd expect to see.
>
> On size — [**yours**], and measured in tokens rather than characters. That's worth stating because the common library default counts characters, so a chunk_size of a thousand is roughly two hundred and fifty tokens. If you sized chunks against the embedding model's token limit you'd be off by four times and everything downstream would be smaller than intended.
>
> Tables needed separate handling. A recursive splitter cuts a table mid-way, separating rows from their header — and a chunk of numbers with no column labels means nothing. Since the fee schedule is essentially a table and it's the most-queried document, that would have been the highest-leverage failure in the system.
>
> [**On honesty:** if chunking started fixed-size and changed, say so. 'We started with fixed-size chunks and moved to structure-aware after seeing conditions split from their rules' is a stronger answer than claiming it was right from the start — it shows you diagnosed something real.]"

## 8. Likely Follow-ups

**Q: Why structure-aware rather than fixed size?**
Because fixed-size splitting breaks rules from their conditions. A chunk stating a fee is waived without the sentence saying for which tier reads as complete and produces an unconditional answer — and grounding verification passes, because the answer faithfully reflects the chunk.

**Q: What does the breadcrumb do?**
Two things: it makes the chunk retrievable for queries about its topic, and it tells the model what pronouns and references in the chunk refer to. Critically it must be in the embedded text — metadata is filterable but not searchable, so it doesn't affect retrieval.

**Q: How did you choose the chunk size?**
[**Honest answer.**] If you measured recall at several sizes on a golden set, describe that. If it started as a default and worked acceptably, say so and note you'd measure it properly — that's more credible than an invented experiment.

**Q: How did you handle tables?**
Separately from prose. A recursive splitter cuts a table mid-way and separates rows from headers, which makes the numbers meaningless — and the fee schedule is usually the most-queried document, so getting that wrong is the highest-leverage failure available.

**Q: Was the size measured in tokens or characters?**
Tokens. The common library default counts characters, so a size of a thousand is roughly two hundred and fifty tokens — meaning anyone sizing against the embedding model's token limit is off by four times without any error being raised.

## 9. Common Mistakes

- Quoting chunk size and overlap without reasoning.
- Not mentioning breadcrumb enrichment.
- Putting the section path in metadata only.
- Measuring size in characters.
- No special handling for tables.

## 10. What to Remember

- **Structure-aware, because fixed size splits rules from conditions.**
- **Breadcrumbs in the embedded text**, not metadata — the strongest point.
- **Count tokens, not characters** — the default is off by ~4×.
- **Tables need special handling** — usually the most-queried content.
- **"We changed it because X"** beats claiming it was right from the start.
