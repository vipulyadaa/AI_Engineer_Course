# Context Construction

> **Phase 08 · RAG FUNDAMENTALS · Topic 16**

## 1. Definition

Assembling retrieved chunks into the prompt — deciding what to include, in what order, with what formatting and metadata, within the token budget. It's the bridge between retrieval and generation, and it's more consequential than it looks.

## 2. Simple Explanation

You've retrieved good chunks. Now you have to hand them to the model in a form it uses well.

Order matters — models attend less reliably to content in the middle of a long context. Formatting matters — the model needs to know where one source ends and another begins. Metadata matters — it can't cite a section it was never told about.

## 3. How It Works

1. **Deduplicate** — overlapping chunks and near-duplicates from the same section collapse.
2. **Order deliberately** — most relevant at the start and end, not buried in the middle.
3. **Delimit clearly** — each chunk in its own labeled block so boundaries are unambiguous.
4. **Attach metadata** — source, section, date, so the model can cite and can reason about freshness.
5. **Budget tokens** — reserve room for the system prompt, the question, and the answer.
6. **Handle conflicts** — if two chunks disagree, surface that rather than letting the model silently pick one.

**A format that works:**

```
<context>
[1] Retail Fees Schedule § 3.2 — International Transfers (effective 2026-01-01)
International wire transfers: $45 retail, $25 Premier.

[2] Premier Account Benefits § 1.4 — Fee Waivers (effective 2025-11-15)
Premier customers receive fee waivers on the first two international
transfers per calendar month.
</context>

Answer using only the context above. Cite sources as [1], [2].
If the context does not contain the answer, say so.
```

The numbered blocks give the model an unambiguous citation handle, and the section plus date lets it reason about which source governs.

## 4. Practical Example

**The "lost in the middle" effect** — documented in Liu et al., *"Lost in the Middle: How Language Models Use Long Contexts"* (TACL 2024):

```
Accuracy at retrieving a fact by its position in the context:

  position:  1st    2nd    middle    2nd-last   last
  accuracy:  high    ↓      LOWEST      ↑        high

→ A U-shaped curve. Content in the middle is used least reliably.
```

**The practical response:**

```python
# Interleave by relevance so the strongest chunks sit at the edges
def arrange(chunks_by_relevance):
    front, back = [], []
    for i, c in enumerate(chunks_by_relevance):
        (front if i % 2 == 0 else back).append(c)
    return front + list(reversed(back))
# rank 1 first, rank 2 last, rank 3 second, rank 4 second-to-last, ...
```

**Token budgeting, with real numbers:**

```
Context window            128,000 tokens
System prompt                 400
Conversation history        2,000
Question                       50
Reserved for answer         1,000
──────────────────────────────────
Available for chunks      124,550

But: more context ≠ better. Past a point, irrelevant chunks
distract the model and cost money. 4–8 good chunks usually
beats 30 mediocre ones.
```

## 5. Why It Matters

- **Position measurably affects whether the model uses a fact**, and it's free to fix.
- **Without source labels the model can't cite**, and citation is often a hard requirement.
- **More context isn't better** — irrelevant chunks actively degrade answers, a result that surprises people.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Key fact buried mid-context** | Model doesn't use it | Order by relevance to the edges |
| **No delimiters** | Model blends chunks; can't attribute | Numbered blocks with clear boundaries |
| **No metadata** | Can't cite; can't reason about which version is current | Include section and effective date |
| **Stuffing max context** | Distraction, cost, latency | Fewer, better chunks |
| **Duplicate content** | Repetition can bias the model toward the repeated claim | Deduplicate before assembly |
| **Conflicting sources silently merged** | Model picks one arbitrarily | Surface the conflict explicitly in the prompt |
| **Budget overflow truncating mid-chunk** | Half a fact in context | Drop whole chunks, never truncate one |

**On conflicts:** if two retrieved chunks disagree — an old and a new fee schedule, say — the right behavior is usually to include both with their effective dates and instruct the model to prefer the current one and note the discrepancy. Silently including both and hoping is how you get confidently wrong answers.

## 7. Interview Answer

> "Context construction is assembling retrieved chunks into the prompt — what to include, in what order, with what formatting and metadata, inside the token budget.
>
> The effect I'd design around is position. There's a documented U-shaped curve — models use information at the start and end of a long context reliably, and information in the middle much less so. So I'd order by relevance to the edges: rank one first, rank two last, rank three second, and so on. It's free and it measurably improves whether the model actually uses the best chunk.
>
> Formatting matters more than people expect. Each chunk goes in its own numbered block with its source, section, and effective date. The numbering gives the model an unambiguous citation handle, and the date lets it reason about which version governs when sources conflict.
>
> On budget, the instinct is to fill the context window and that's wrong. Past a point, irrelevant chunks distract the model and cost money on every request. Four to eight good chunks usually beats thirty mediocre ones. And if I have to cut for budget, I drop whole chunks rather than truncating one — half a fact in context is worse than none.
>
> The case I'd handle explicitly is conflicting sources. If an old and a new fee schedule both retrieve, I include both with their dates and instruct the model to prefer the current one and flag the discrepancy. Silently including both and hoping it picks right is how you get confidently wrong answers."

## 8. Likely Follow-ups

**Q: What is "lost in the middle"?**
A documented finding that language models retrieve information from the beginning and end of a long context far more reliably than from the middle, producing a U-shaped accuracy curve by position. The practical response is to place the highest-relevance chunks at the edges rather than in ranked order top to bottom, and to keep contexts shorter so there's less middle.

**Q: Should you use all available context?**
No. Retrieval precision matters more than volume — irrelevant chunks measurably degrade answer quality, not just cost. Four to eight well-chosen chunks typically outperforms thirty marginal ones, and it's cheaper and faster. I'd tune the number against an eval set rather than defaulting to "fill the window."

**Q: How do you handle conflicting documents?**
Include both with their effective dates and source labels, and instruct the model to prefer the more recent and explicitly note the conflict. Alternatively, filter by effective date at retrieval so superseded versions don't surface at all — that's cleaner when your metadata supports it. What you shouldn't do is include both silently and let the model choose arbitrarily.

**Q: How do you make citations work?**
Give each chunk a stable numbered label in the context and a source identifier in its header, then instruct the model to cite by that number. Post-process the answer to map the numbers back to source URIs. The important validation step is checking that cited numbers correspond to chunks that actually support the claim — a model can cite a source that doesn't say what it claims, and that's a groundedness failure worth measuring.

**Q: How do you handle the token budget?**
Account for everything up front — system prompt, conversation history, question, and reserved space for the answer — then fill the remainder with chunks. Drop whole chunks when over budget, never truncate one mid-sentence. If history is the pressure, summarize older turns rather than dropping retrieval context, since the retrieved facts are what makes the answer correct.

## 9. Common Mistakes

- Ordering chunks by rank top-to-bottom, burying the best one in the middle.
- No delimiters, so the model blends sources and can't attribute.
- Omitting section and date metadata, making citation and conflict resolution impossible.
- Filling the context window because it's available.
- Truncating a chunk mid-content to fit the budget.

## 10. What to Remember

- **Position matters** — U-shaped attention. Put the best chunks at the start and end.
- **Numbered, delimited blocks with source + section + date** enable citation and conflict handling.
- **More context is not better.** 4–8 good chunks beats 30 mediocre ones.
- **Surface conflicts explicitly**; don't let the model pick silently.
- **Drop whole chunks to fit budget**, never truncate one.
