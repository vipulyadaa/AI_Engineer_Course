# Tool Selection (in Agentic RAG)

> **Phase 18 · AGENTIC RAG · Topic 06**

## 1. Definition

Choosing which retrieval source or data tool to query for a given information need — the policy corpus, a structured account API, a transaction database, or a live service.

> General tool-selection mechanics are in [17-ai-agents/09-tool-selection.md](../17-ai-agents/09-tool-selection.md). This topic is the RAG-specific question: retrieval versus structured lookup.

## 2. Simple Explanation

Not every question should be answered by searching documents. "What's my balance?" is a database query, not a semantic search.

The most common design error in agentic RAG is routing everything through the vector store, including questions with exact, authoritative structured answers.

## 3. How It Works

**The core distinction:**

| Question type | Right source |
|---|---|
| "What is the policy on X?" | Document retrieval |
| "What is *my* balance?" | Structured API |
| "What did I get charged?" | Transaction database |
| "Why was I charged that?" | **Both** — API for facts, docs for policy |

```
DOCUMENTS        prose, policy, explanations, conditions
                 semantic search is right
STRUCTURED       numbers, dates, statuses, identifiers
                 exact lookup is right, and is AUTHORITATIVE

Semantic search over data that has an exact answer is
strictly worse: it can retrieve a document ABOUT balances
instead of the balance.
```

## 4. Practical Example

**The combined case is the interesting one:**

```
"Why was I charged $45 on my international transfer?"

  structured: get_transaction(...)      → charged $45.00
  structured: get_customer_tier(...)    → Premier
  structured: count_waivers_mtd(...)    → 2 of 2 used
  documents:  retrieve fee policy       → Premier = $25,
                                          first 2/month waived

  reconcile → the tier was misapplied; $25 was correct

Neither source alone answers it. The structured data gives
the facts, the documents give the rule, and the answer is
the comparison.

That's the strongest argument for agentic RAG over a
document-only pipeline — it can combine sources, which a
retrieve-and-generate pipeline structurally cannot.
```

**Source selection failures:**

```
· Semantic search for an exact value → a document about the
  topic instead of the value
· Structured lookup for a policy question → no such field
· Using only one when the question needs both → a partial
  answer that looks complete
· Wrong source for authority — the document says $25, the
  system charged $45; which is "correct" depends on what's
  being asked

That last one is subtle and worth stating: for "what should
I have been charged", the document is authoritative. For
"what was I charged", the transaction record is.
```

**Making selection reliable** comes down to tool descriptions that state what each source is authoritative *for*, not just what it contains.

## 5. Why It Matters

- **Combining structured and document sources** is agentic RAG's strongest capability.
- **Semantic search for exact values** is a common and avoidable error.
- **Authority differs by question**, which the tool descriptions should encode.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Everything through the vector store** | Exact values retrieved as prose |
| **Using one source when two are needed** | Partial answer, looks complete |
| **Unclear authority** | Conflicting values with no resolution rule |
| **Too many sources** | Selection accuracy degrades |
| **Permissions differing by source** | Documents public, accounts private |

**On permissions by source:** a policy document may be readable by anyone while account data is strictly per-customer. The tool layer must enforce each source's own rules — it's a mistake to apply one authorization model across sources of very different sensitivity, and an easy one to make when they sit behind a uniform tool interface.

**On conflicts:** when the document says the fee should be $25 and the transaction says $45, the agent must not silently pick one. Surfacing the discrepancy is the correct answer — in this case it *is* the answer the customer wanted.

## 7. Interview Answer

> "In agentic RAG the source selection question is really document retrieval versus structured lookup. Documents are right for prose — policy, explanations, conditions — where semantic search fits. Structured APIs are right for numbers, dates, statuses, identifiers, where there's an exact authoritative answer.
>
> The most common design error is routing everything through the vector store. Semantic search over data with an exact answer is strictly worse: asking for a balance retrieves a document *about* balances rather than the balance.
>
> The interesting case is when a question needs both. 'Why was I charged forty-five dollars on my international transfer' needs the transaction from a structured lookup, the customer's tier from another, the waivers used this month from a third, and the fee policy from document retrieval. The answer is the comparison — the tier was misapplied, twenty-five was correct. Neither source alone answers it.
>
> That's actually the strongest argument for agentic RAG over a document-only pipeline. It can combine structured and unstructured sources, which a retrieve-and-generate pipeline structurally cannot.
>
> A subtlety worth stating: authority differs by question. For 'what should I have been charged', the policy document is authoritative. For 'what was I charged', the transaction record is. So tool descriptions should say what each source is authoritative *for*, not just what it contains — that's what makes selection reliable.
>
> And when they conflict — the document says twenty-five and the transaction says forty-five — the agent must not silently pick one. Surfacing the discrepancy is the correct behaviour, and in this case it's exactly what the customer wanted to know.
>
> One thing I'd be careful about: permissions differ by source. A policy document may be readable by anyone while account data is strictly per-customer. Each tool has to enforce its own source's rules — applying a single authorization model across sources of very different sensitivity is an easy mistake when they sit behind a uniform tool interface."

## 8. Likely Follow-ups

**Q: When should the agent use structured lookup instead of retrieval?**
Whenever the question has an exact authoritative answer — balances, transaction amounts, dates, statuses, tiers. Semantic search over that data retrieves documents about the topic instead of the value, which is strictly worse than just querying the system of record.

**Q: What if a question needs both?**
That's the common case for anything investigative. Structured lookups supply the facts, document retrieval supplies the rule, and the answer is the comparison. Being able to combine them is agentic RAG's strongest capability over a document-only pipeline.

**Q: How do you handle conflicting sources?**
Surface the conflict rather than silently choosing. If the policy says the fee should be twenty-five and the transaction says forty-five, the discrepancy is the answer the customer wanted. Silently preferring one source hides exactly the information that made the question worth asking.

**Q: How do you make source selection reliable?**
Tool descriptions that state what each source is authoritative for, not just what it contains. Authority is question-dependent — the document is authoritative for what the fee should be, the transaction record for what was charged — and encoding that is what makes the choice unambiguous.

**Q: What about permissions across sources?**
They differ, and each tool must enforce its own source's rules. Policy documents may be broadly readable while account data is strictly per-customer, so applying one authorization model across all sources is a real risk when they sit behind a uniform interface.

## 9. Common Mistakes

- Routing exact-value questions through semantic search.
- Answering from one source when the question needs two.
- Silently resolving conflicts between sources.
- Describing what a source contains rather than what it's authoritative for.
- Applying a single authorization model across sources of differing sensitivity.

## 10. What to Remember

- **Documents for prose and policy; structured lookups for exact values.**
- **Combining both is agentic RAG's strongest capability.**
- **Authority is question-dependent** — encode it in tool descriptions.
- **Surface conflicts** rather than silently picking a source.
- **Permissions differ by source** — enforce each source's own rules.
