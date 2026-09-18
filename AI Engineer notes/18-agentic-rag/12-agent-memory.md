# Agent Memory (in Agentic RAG)

> **Phase 18 · AGENTIC RAG · Topic 12**

## 1. Definition

What the system carries across turns in a RAG conversation — previously retrieved chunks, established facts, and the resolved meaning of references like "it" and "that fee".

> General agent memory is in [17-ai-agents/10-memory.md](../17-ai-agents/10-memory.md). Here the focus is what memory means for retrieval specifically.

## 2. Simple Explanation

In a conversation, the next question often refers to the last one. "And for Premier customers?" only makes sense given what came before.

So memory in RAG has two jobs: resolving what the user is referring to, and deciding whether previously retrieved content can be reused.

## 3. How It Works

```
TURN 1  "What's the international transfer fee?"
        retrieve → answer: $45 standard, $25 Premier

TURN 2  "And if I use it more than twice a month?"
        "it" = international transfer
        the question is about WAIVERS — new information need

        → rewrite to a standalone query:
          "international transfer fee waiver limit per month"
        → retrieve fresh
```

**Query rewriting for context is the core mechanism.** A follow-up embedded as-is retrieves badly: "and if I use it more than twice a month" has almost no retrievable signal on its own.

## 4. Practical Example

**Rewriting is where most conversational RAG quality comes from:**

```
RAW FOLLOW-UP          "and for Premier?"
                       → embedding is nearly meaningless

REWRITTEN              "international wire transfer fee for
                        Premier tier customers"
                       → retrieves correctly

The rewrite should be:
  · standalone — no pronouns, no implicit referents
  · carrying forward the topic and any qualifiers
  · in the vocabulary the corpus uses

This single step typically matters more for multi-turn
quality than anything else in the pipeline.
```

**Reusing retrieved chunks — the trade-off:**

```
REUSE            cheaper, faster; risks answering a new
                 question from context retrieved for an old one
RETRIEVE FRESH   correct, costs a retrieval

The failure with reuse is subtle: turn 1's chunks are about
the fee, turn 2 asks about waivers, and the model answers
from the fee chunks because something in them mentions
waivers in passing — producing a partial, possibly wrong
answer that looks grounded.

For banking I'd retrieve fresh each turn and keep prior
chunks only as supporting context, never as the primary
basis for a new question.
```

**What to carry as facts rather than chunks:**

```
ESTABLISHED FACTS      tier=Premier, account=****3391
                       → structured state, re-injected each turn
PRIOR CHUNKS           context, decreasing in weight
RESOLVED REFERENTS     "it" = international transfer
                       → used for rewriting, then discarded

Facts are compact and reusable. Chunks are bulky and
question-specific. Keeping facts and re-retrieving chunks
is the right split.
```

## 5. Why It Matters

- **Query rewriting is the highest-value step** in multi-turn RAG quality.
- **Reusing chunks across questions** causes subtle, grounded-looking errors.
- **Carry facts, re-retrieve chunks** — the split that works.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No rewriting** | Follow-ups retrieve almost nothing useful |
| **Over-rewriting** | Adding context the user didn't intend |
| **Reusing chunks for a new question** | Partial answers that look grounded |
| **Unbounded history** | Context and cost grow every turn |
| **Stale established facts** | Tier or status changed mid-conversation |
| **Topic switches treated as follow-ups** | Rewrites carrying irrelevant context |

**On topic switches:** if the user moves from fees to card replacement, carrying the fee context into the rewrite actively harms retrieval. Detecting the switch — a low-similarity turn relative to the conversation so far — and resetting the carried context is a small addition that prevents a confusing class of failure.

**On over-rewriting:** adding qualifiers the user didn't state narrows retrieval wrongly. If turn 1 was about Premier and turn 2 asks a general question, injecting "Premier" retrieves the tier-specific answer to a general question. The rewrite should carry forward what's referred to, not everything mentioned.

## 7. Interview Answer

> "Memory in conversational RAG has two jobs: resolving what the user is referring to, and deciding whether previously retrieved content can be reused.
>
> The core mechanism is query rewriting. A follow-up like 'and for Premier?' embedded as-is is nearly meaningless — there's almost no retrievable signal. Rewritten to 'international wire transfer fee for Premier tier customers' it retrieves correctly. That single step matters more for multi-turn quality than anything else in the pipeline, and the rewrite should be standalone, carry forward the topic and qualifiers, and use the vocabulary the corpus actually uses.
>
> On reusing chunks, I'd retrieve fresh each turn in a banking context. The failure with reuse is subtle: turn one's chunks are about the fee, turn two asks about waivers, and the model answers from the fee chunks because something in them mentions waivers in passing. You get a partial, possibly wrong answer that looks fully grounded. I'd keep prior chunks as supporting context but never as the primary basis for a new question.
>
> The split I'd use is carrying facts rather than chunks. Established facts like the customer's tier and account are compact, reusable, and worth re-injecting every turn as structured state. Chunks are bulky and question-specific, so re-retrieving is both cheaper in context and more correct.
>
> Two failure modes worth guarding. Over-rewriting — if turn one was about Premier and turn two asks a general question, injecting 'Premier' into the rewrite retrieves the tier-specific answer to a general question. The rewrite should carry what's being referred to, not everything that was mentioned.
>
> And topic switches. If the user moves from fees to card replacement, carrying the fee context actively harms retrieval. Detecting a low-similarity turn relative to the conversation so far and resetting the carried context is a small addition that prevents a confusing class of failure — and without it, the system gets progressively worse the longer a conversation runs."

## 8. Likely Follow-ups

**Q: Why is query rewriting necessary?**
Because a follow-up like "and for Premier?" has almost no retrievable signal on its own — its embedding is nearly meaningless. Rewriting it into a standalone query carrying the topic and qualifiers is what makes retrieval work, and it's the largest single lever on multi-turn quality.

**Q: Should you reuse previously retrieved chunks?**
Not as the primary basis for a new question. The failure is subtle — the old chunks mention the new topic in passing, so the model answers from them and produces something partial that looks fully grounded. I'd retrieve fresh and keep prior chunks only as supporting context.

**Q: What should be carried across turns?**
Established facts as structured state — tier, account, verified details — re-injected each turn. Those are compact and reusable. Chunks are bulky and question-specific, so they're better re-retrieved than carried.

**Q: What's the risk of over-rewriting?**
Adding qualifiers the user didn't intend. If an earlier turn was about Premier and the current one is a general question, injecting "Premier" into the rewrite retrieves a tier-specific answer to a general question. The rewrite should resolve references, not accumulate everything mentioned.

**Q: How do you handle topic switches?**
Detect them — a turn with low similarity to the conversation so far — and reset the carried context. Otherwise the rewrite drags fee context into a card replacement question and retrieval degrades, which makes the system progressively worse the longer the conversation runs.

## 9. Common Mistakes

- Embedding follow-up questions without rewriting them.
- Reusing prior chunks as the basis for a new question.
- Carrying all mentioned qualifiers into every rewrite.
- Not detecting topic switches, so context accumulates wrongly.
- Carrying chunks across turns instead of compact established facts.

## 10. What to Remember

- **Query rewriting is the highest-value step** in multi-turn RAG.
- **Rewrite to standalone**, in the corpus's vocabulary.
- **Retrieve fresh per question**; prior chunks are supporting context only.
- **Carry facts as structured state**, not chunks.
- **Detect topic switches and reset** the carried context.
