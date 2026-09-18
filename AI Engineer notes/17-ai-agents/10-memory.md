# Memory

> **Phase 17 · AI AGENTS · Topic 10**

## 1. Definition

What an agent retains beyond the current context window — within a conversation, across conversations, and as accumulated knowledge. Distinct from state, which is the structured data the system tracks deliberately.

## 2. Simple Explanation

An LLM has no memory. Everything it "remembers" is text you put in the context window on each call.

So agent memory is an engineering problem: deciding what to carry forward, what to summarize, what to store externally and retrieve when relevant, and what to discard.

## 3. How It Works

**Three kinds, with different mechanisms:**

| Kind | Scope | Mechanism |
|---|---|---|
| **Working** | The current loop | The conversation in context |
| **Short-term** | One session | Summarized history carried forward |
| **Long-term** | Across sessions | External store, retrieved as needed |

```
WORKING      messages array — grows every step, must be managed
SHORT-TERM   summarize older turns, keep recent ones verbatim
LONG-TERM    write facts to a store; retrieve relevant ones at
             the start of a new session
```

**Long-term memory is retrieval.** It's a RAG problem over facts you wrote, with the same failure modes — irrelevant retrieval, stale content, and missing what mattered.

## 4. Practical Example

**A workable session-memory strategy:**

```
Keep verbatim:  the system prompt
                the original user request
                the last 3-4 exchanges

Summarize:      everything older, into a running summary

Drop:           reasoning from completed steps
                tool results superseded by later ones

The original request stays verbatim deliberately — it's what
prevents goal drift as everything else compresses.
```

**Long-term memory in a banking context is where it gets sensitive:**

```
Storing "this customer complained about fees in March"
is useful for continuity — and it's:

  · personal data, subject to retention rules
  · subject to erasure requests
  · a data-quality risk if the extracted fact is wrong
  · a privacy expectation issue — customers may not expect
    a chatbot to remember previous complaints

A wrong stored fact is worse than no memory. It persists,
it gets retrieved confidently, and nobody reviews it.
```

**My actual recommendation:** store structured, verifiable facts — account tier, language preference, open case IDs — rather than free-text model-generated summaries of what the customer said. Structured facts can be validated, corrected, expired, and deleted. Summaries can't easily be any of those.

**That distinction is the substantive point**, and it generalizes beyond banking.

## 5. Why It Matters

- **Memory is engineering, not a model feature** — you decide what persists.
- **Long-term memory is retrieval** with retrieval's failure modes.
- **Structured facts over generated summaries** is the design that holds up.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Context growth** | Cost and latency rise every step |
| **Lossy summarization** | Critical detail dropped silently |
| **Wrong facts persisting** | Stored confidently, retrieved confidently |
| **Stale memory** | Preferences and circumstances change |
| **Privacy and retention** | Personal data with legal obligations |
| **Cross-user leakage** | The severe failure — memory keyed wrongly |

**On cross-user leakage:** if long-term memory isn't strictly partitioned by authenticated user, one customer's stored facts can surface in another's session. That's a data breach, and it's an easy bug — a caching layer keyed on a conversation ID rather than a user ID is enough to cause it. Memory reads must carry the same authorization as any other data access.

**On erasure:** stored memories are personal data. A deletion request must reach them, which means memory needs the same delete path, audit trail, and retention policy as any other customer data store — not an exemption because it's "just conversation context."

## 7. Interview Answer

> "An LLM has no memory — everything it remembers is text placed in the context window on each call. So agent memory is an engineering problem: what to carry forward, what to summarize, what to store externally, and what to discard.
>
> Three kinds. Working memory is the conversation within the current loop, which grows every step and has to be managed. Short-term is one session, typically a running summary of older turns with recent ones kept verbatim. Long-term is across sessions, which means an external store retrieved when relevant — and that's really a RAG problem over facts you wrote, with the same failure modes: irrelevant retrieval, stale content, missing what mattered.
>
> For session memory I'd keep the system prompt, the original user request, and the last three or four exchanges verbatim; summarize everything older; and drop reasoning from completed steps and tool results that later ones superseded. Keeping the original request verbatim is deliberate — it's what prevents goal drift as everything else compresses.
>
> Long-term memory in banking is where I'd be careful. Storing 'this customer complained about fees in March' is useful for continuity, but it's personal data subject to retention rules and erasure requests, it's a data-quality risk if the extracted fact is wrong, and customers may not expect a chatbot to remember previous complaints. A wrong stored fact is worse than no memory — it persists, gets retrieved confidently, and nobody reviews it.
>
> So my recommendation is storing structured, verifiable facts — account tier, language preference, open case IDs — rather than free-text model-generated summaries of what the customer said. Structured facts can be validated, corrected, expired, and deleted. Summaries can't easily be any of those. That distinction generalizes well beyond banking.
>
> The severe failure I'd guard hardest is cross-user leakage. If long-term memory isn't strictly partitioned by authenticated user, one customer's facts surface in another's session — and that's a data breach. It's an easy bug: a cache keyed on conversation ID rather than user ID is enough. Memory reads need the same authorization as any other data access, and memory needs the same delete path and retention policy as any other customer data store."

## 8. Likely Follow-ups

**Q: What are the types of agent memory?**
Working memory — the current conversation in context. Short-term — one session, usually older turns summarized with recent ones kept verbatim. Long-term — facts persisted externally across sessions and retrieved when relevant, which is fundamentally a retrieval problem.

**Q: How do you manage context growth?**
Keep the system prompt, original request, and last few exchanges verbatim; summarize older turns; drop completed reasoning and superseded tool results. Keeping the original request uncompressed is deliberate — it's the anchor that prevents goal drift as everything else is condensed.

**Q: What would you store in long-term memory?**
Structured, verifiable facts — account tier, language preference, open case IDs — rather than free-text summaries of what the customer said. Structured facts can be validated, corrected, expired, and deleted on request; generated summaries can't easily be any of those, and a wrong one persists indefinitely.

**Q: What's the biggest risk with long-term memory?**
Cross-user leakage. If memory isn't strictly partitioned by authenticated user, one customer's stored facts can appear in another's session, which is a data breach. Something as small as a cache keyed on conversation ID instead of user ID causes it, so memory reads need full authorization.

**Q: How does memory interact with data protection?**
Stored memories are personal data, so they're subject to retention limits and erasure requests. The memory store needs the same delete path, audit trail, and retention policy as any other customer data — it doesn't get an exemption for being conversation context.

## 9. Common Mistakes

- Treating memory as a model feature rather than an engineering decision.
- Storing generated summaries that can't be validated or corrected.
- Summarizing the original user request along with everything else.
- Keying memory on conversation rather than authenticated user.
- Exempting memory from retention and erasure policies.

## 10. What to Remember

- **The model has no memory** — everything persisted is an engineering choice.
- **Working, short-term, long-term** — different scopes, different mechanisms.
- **Long-term memory is retrieval**, with retrieval's failure modes.
- **Store structured facts, not generated summaries** — they can be corrected and deleted.
- **Partition by authenticated user.** Cross-user leakage is a breach.
