# Failure Mode: Missing Context

> **Phase 13 · RAG FAILURE MODES · Topic 06**

## 1. Definition

The retrieved chunks contain part of what's needed but not all of it — a condition without its consequence, a figure without its qualifier, a clause without its exception. The answer is incomplete or, worse, confidently wrong by omission.

## 2. Simple Explanation

This isn't "retrieval failed." Retrieval succeeded partially, which is more dangerous.

If nothing relevant is retrieved, a well-built system abstains. If *half* the relevant material is retrieved, the model produces a confident answer that's missing a qualifier — and nothing flags it.

## 3. How It Works

**The four ways context goes missing:**

| Cause | Example |
|---|---|
| **Fact split across chunks** | Fee in chunk A, waiver condition in chunk B; only A retrieved |
| **Exception in a different section** | "$45 fee" retrieved; "waived for Premier" is in another section |
| **Multi-hop needed** | The question requires chaining two facts |
| **k too low for a multi-part question** | Two topics, five chunks, one topic covered |

**Why it's more dangerous than total retrieval failure:**

```
Total failure  → nothing relevant → good systems abstain → visible
Partial        → something relevant → model answers → LOOKS FINE

Groundedness scores high — every claim IS supported.
Answer relevance scores high — it IS about the question.
Only COMPLETENESS catches it, and most systems don't measure that.
```

## 4. Practical Example

**The dangerous version — wrong by omission:**

```
Chunk A (retrieved): "International wire transfers: $45 for retail
                      accounts, $25 for Premier."
Chunk B (NOT retrieved): "Premier customers receive fee waivers on
                          the first two international transfers per
                          calendar month."

Q: "What do I pay for an international wire? I'm a Premier customer."

Answer: "International wire transfers cost $25 for Premier accounts."

groundedness    = 1.0  ✅ the claim IS supported by chunk A
answer relevance = 0.9 ✅ it DID address the question
completeness     = low ❌ but the first two are free, and the
                          customer was about to be told otherwise
```

**The fixes, by cause:**

| Cause | Fix |
|---|---|
| Fact split across chunks | Overlap; parent-child retrieval; larger chunks |
| Exception elsewhere in the document | Parent-child; cross-reference following |
| Multi-hop needed | Multi-query decomposition or agentic retrieval |
| k too low for multi-part | Raise k; route multi-part queries to decomposition |

**Cross-reference following is the specific, underused fix:**

```
Retrieved chunk says: "...subject to the waiver provisions in § 4.2."

If § 4.2 isn't in the context, the answer is incomplete.
Detect the cross-reference at ingestion, store it in metadata,
and fetch the referenced section as an additional hop.

Cheap, targeted, and most systems don't do it.
```

## 5. Why It Matters

- **It's more dangerous than total retrieval failure**, because the system answers confidently.
- **It passes groundedness and answer relevance** — only completeness catches it.
- **In banking, an omitted waiver or exception is a real customer-harm event**, not a quality nit.

## 6. Trade-offs / Failure Modes

| Detection method | Catches |
|---|---|
| **Completeness vs. expected answer** | Requires expected answers in the golden dataset |
| **Cross-reference detection** | Retrieved chunk references a section not in context |
| **Multi-part query detection** | Question has two topics, context covers one |
| **Prompt instruction to flag gaps** | "State what the context doesn't cover" |

**The prompt-level mitigation is cheap and worth having:**

```
If the context answers part of the question but not all of it,
answer the part you can and explicitly state what you don't
have information about.
```

That converts a silent incomplete answer into a visible partial one — which the user can act on.

**The structural fix is parent-child retrieval:** returning the whole section rather than the matched chunk means exceptions and conditions elsewhere in that section come along automatically.

## 7. Interview Answer

> "Missing context is when retrieval brings back part of what's needed but not all of it — a fee without its waiver condition, a clause without its exception.
>
> It's more dangerous than total retrieval failure, and that's the key point. If nothing relevant is retrieved, a well-built system abstains and the failure is visible. If half is retrieved, the model produces a confident answer that's missing a qualifier — and it passes both groundedness and answer relevance, because every claim genuinely is supported and the answer genuinely is about the question. Only a completeness check catches it, and most systems don't measure completeness.
>
> The concrete case: chunk A says international wires are twenty-five dollars for Premier. Chunk B, not retrieved, says Premier customers get their first two waived each month. The answer 'twenty-five dollars for Premier' is grounded, relevant, and about to charge a customer for something that's free. In banking that's a real harm event, not a quality nit.
>
> Structurally, the best fix is parent-child retrieval — return the whole section rather than the matched chunk, so conditions and exceptions elsewhere in that section come along automatically.
>
> The targeted fix most systems skip is cross-reference following. If a retrieved chunk says 'subject to the waiver provisions in section 4.2' and 4.2 isn't in the context, the answer is incomplete by construction. Detecting those references at ingestion and fetching the referenced section as an extra hop is cheap and specific.
>
> And at the prompt level, instructing the model to answer the part it can and explicitly state what it doesn't have information about converts a silent incomplete answer into a visible partial one."

## 8. Likely Follow-ups

**Q: Why is this worse than retrieving nothing?**
Because retrieving nothing triggers abstention, which is visible and safe. Retrieving half produces a confident answer that passes every standard metric — groundedness is high because the claims are supported, answer relevance is high because it's on topic. The failure is invisible unless you specifically measure completeness.

**Q: How do you detect it?**
Completeness checks against expected answers in the golden dataset, which is why the dataset needs expected answers and not just correct chunk IDs. Plus cross-reference detection — if a retrieved chunk references a section that isn't in the context, flag it. And multi-part query detection, where the question has two topics and the context covers one.

**Q: What's the best structural fix?**
Parent-child retrieval. Returning the full section rather than the matched chunk means the waiver condition, the exception, and the qualifier that live elsewhere in that section come along automatically. It directly addresses the most common cause, which is a fact split across chunks within one section.

**Q: What is cross-reference following?**
Detecting at ingestion that a chunk references another section — "see § 4.2," "subject to the provisions in Article 7" — storing that in metadata, and fetching the referenced section when the chunk is retrieved. It's cheap, targeted, and most systems don't do it despite policy documents being full of such references.

**Q: Can prompting help?**
Partially. Instructing the model to answer what the context supports and explicitly state what it doesn't cover turns a silent incomplete answer into a visible partial one. It doesn't fix the retrieval gap, but it makes the gap apparent to the user, which is a meaningful improvement over confident omission.

## 9. Common Mistakes

- Measuring only groundedness and relevance, which both pass.
- No expected answers in the golden dataset, so completeness is unmeasurable.
- Not following cross-references from retrieved chunks.
- Treating partial retrieval as a success because something relevant came back.
- No prompt instruction to flag what the context doesn't cover.

## 10. What to Remember

- **Partial retrieval is more dangerous than none** — the system answers confidently.
- **It passes groundedness AND answer relevance.** Only completeness catches it.
- **Parent-child retrieval is the structural fix** — exceptions in the same section come along.
- **Cross-reference following is cheap and underused.**
- **Prompt the model to state what the context doesn't cover.**
