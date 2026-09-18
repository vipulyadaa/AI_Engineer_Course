# User Prompts

> **Phase 05 · PROMPT ENGINEERING · Topic 03**

## 1. Definition

The per-request message containing the actual question and, in a RAG system, the retrieved context. It's the variable part of the prompt, and in production it's assembled by your code rather than typed by the user directly.

## 2. Simple Explanation

In a chat interface the user prompt is what someone types. In a RAG application it's something your system builds: retrieved chunks, formatted and delimited, with the user's question appended.

That assembly step is where a lot of quality lives — ordering, delimiting, labeling for citation — and it's frequently treated as an afterthought.

## 3. How It Works

**The structure of an assembled user turn:**

```
<context>
[1] Retail Fees Schedule § 3.2 (effective 2026-01-01)
International wire transfers: $45 retail, $25 Premier.

[2] Premier Benefits § 1.4 (effective 2025-11-15)
Premier customers receive fee waivers on the first two
international transfers per calendar month.
</context>

Question: What does an international wire cost for a Premier customer?
```

**The assembly decisions that matter:**

| Decision | Why |
|---|---|
| **Numbered blocks** | Gives the model an unambiguous citation handle |
| **Source + section + date** | Enables citation and conflict resolution |
| **Clear delimiters** | Injection defense; the model knows where context ends |
| **Ordering by relevance to the edges** | Counters "lost in the middle" |
| **Question last** | Recency; it's what the model should act on |
| **Deduplicated** | Overlapping chunks waste slots and bias the model |

## 4. Practical Example

**Ordering, which is free and measurably helps:**

```python
def arrange(chunks_by_relevance):
    """Best chunks at the edges, weakest in the middle."""
    front, back = [], []
    for i, c in enumerate(chunks_by_relevance):
        (front if i % 2 == 0 else back).append(c)
    return front + list(reversed(back))
# rank 1 first, rank 2 last, rank 3 second, rank 4 second-to-last

# Counters the documented "lost in the middle" effect — models
# retrieve from the start and end of a long context more
# reliably than from the middle.
```

**Delimiting is an injection defense, not just formatting:**

```
Retrieved document text is UNTRUSTED input. A document can
contain "Ignore previous instructions."

Clear delimiters plus a system-prompt declaration that
content inside them is data — not instructions — is the
mitigation. It's not a guarantee, but unbounded retrieved
text sitting in the prompt with no boundary is strictly worse.

Also: strip or escape delimiter-like sequences from retrieved
text, so a document can't fake a closing tag.
```

**Multi-turn assembly:**

```
system prompt                    (cached, unchanged)
──────────────────────────────
turn 1 user question             (history)
turn 1 assistant answer
turn 2 user question
turn 2 assistant answer
──────────────────────────────
<context>...</context>           (current retrieval only)
Question: {rewritten current question}

Retrieved context for PAST turns is usually dropped —
keeping it multiplies context cost and adds stale material
that can conflict with the current retrieval.
```

## 5. Why It Matters

- **Assembly is where retrieval meets generation**, and it's frequently under-designed.
- **Ordering and delimiting are free** and both measurably help — one for quality, one for security.
- **Dropping past-turn context** is a decision that materially affects cost and conflict rates.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No delimiters** | Model blends context with instructions; injection surface |
| **Ranked order top-to-bottom** | Best chunk buried mid-context |
| **No source labels** | Citation impossible |
| **Keeping all past retrieved context** | Cost multiplies; stale chunks conflict with current ones |
| **No deduplication** | Repeated content wastes slots and biases the answer |
| **Question buried mid-prompt** | Lower recency weight |
| **Truncating a chunk to fit** | Half a fact is worse than none |

**On history management:** conversation history grows unboundedly, and retrieved context for past turns is usually the first thing to drop — it's large, it's stale relative to the current question, and it can conflict with the current retrieval. Summarizing older turns preserves the conversational thread at a fraction of the token cost.

**On the question's position:** placing it last exploits recency, and it also means the model reads the evidence before the task. Some prompts repeat the question before and after the context for very long contexts, which is worth testing.

## 7. Interview Answer

> "In a chat interface the user prompt is what someone types. In a RAG system it's something my code assembles: retrieved chunks, formatted and delimited, with the question appended. That assembly step is where a lot of quality lives and it's often treated as an afterthought.
>
> The decisions that matter: numbered blocks so the model has an unambiguous citation handle, source and section and effective date in each block header so it can cite and resolve conflicts, clear delimiters, and the question last for recency.
>
> Two of those are free and both measurably help. Ordering — I'd place the highest-relevance chunks at the start and end rather than in straight ranked order, because of the documented lost-in-the-middle effect where models retrieve from the edges more reliably than the middle. And delimiting, which is an injection defense rather than just formatting: retrieved document text is untrusted input, so it goes inside clear markers with a system-prompt declaration that content there is data, never instructions. I'd also strip delimiter-like sequences from retrieved text so a document can't fake a closing tag.
>
> For multi-turn, the decision I'd flag is dropping retrieved context from past turns. Keeping it multiplies context cost and adds stale material that can conflict with the current retrieval — if the fee schedule was updated between turns, you now have both versions in context. I'd keep the conversational history, summarize older turns, and carry only the current retrieval.
>
> And on budget overflow: drop whole chunks rather than truncating one. Half a fee table is worse than not including it."

## 8. Likely Follow-ups

**Q: How do you format retrieved context in the prompt?**
Numbered blocks with a header carrying source, section, and effective date, inside clear delimiters. The numbering gives the model a citation handle, the header enables conflict resolution by date, and the delimiters are an injection defense. Then the question last.

**Q: Why order chunks to the edges rather than by rank?**
Because of the lost-in-the-middle effect — models retrieve information from the start and end of a long context more reliably than from the middle. Placing rank 1 first, rank 2 last, rank 3 second, and so on puts the highest-relevance content where attention is strongest. It's free and it measurably helps.

**Q: How do you handle conversation history?**
Keep the conversational turns, summarize older ones as they accumulate, and drop retrieved context from past turns entirely. That last part matters — keeping it multiplies cost and introduces stale chunks that can conflict with the current retrieval, which produces exactly the kind of arbitrary answer selection you want to avoid.

**Q: Why are delimiters a security measure?**
Because retrieved document text is untrusted input — a document can contain instruction-like content. Clear delimiters plus a system-prompt declaration that the enclosed content is data rather than instructions is a real mitigation. It's not a guarantee, since there's no structural instruction/data separation in an LLM, but unbounded retrieved text with no boundary is strictly worse.

**Q: What do you do when the context budget overflows?**
Drop whole chunks, never truncate one — half a fee table is worse than omitting it. If conversation history is the pressure, summarize older turns rather than dropping retrieval context, since the retrieved facts are what make the answer correct. And account for reserved output space up front rather than discovering it mid-generation.

## 9. Common Mistakes

- Concatenating chunks with no delimiters or source labels.
- Ordering chunks strictly by rank, burying the best one.
- Carrying retrieved context from past turns.
- Not deduplicating overlapping chunks.
- Truncating a chunk to fit the budget.

## 10. What to Remember

- **In RAG, your code assembles this** — it's not what the user typed.
- **Numbered blocks with source + section + date** enable citation and conflict resolution.
- **Order best chunks to the edges**, not top-to-bottom by rank.
- **Delimiters are an injection defense**; strip delimiter-like text from chunks.
- **Drop past-turn retrieved context** — cost and staleness conflicts.
