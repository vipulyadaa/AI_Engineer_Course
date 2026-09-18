# Query Rewriting (Retrieval View)

> **Phase 11 · RAG RETRIEVAL · Topic 12**

## 1. Definition

Transforming the user's raw question into a better retrieval query before searching — resolving references from conversation history, removing conversational noise, and translating colloquial phrasing into document vocabulary.

## 2. Simple Explanation

Users don't ask questions in the form documents are written in, and in conversation they don't ask complete questions at all.

"And for premier?" has no subject. "Why did it fail?" has a pronoun pointing three turns back. "Is it free?" uses vocabulary the policy document never uses.

Rewriting turns these into something the retriever can work with.

## 3. How It Works

An LLM call before retrieval, with conversation history as context:

```
System: Rewrite the user's question into a standalone search query.
Resolve pronouns and references using the conversation history.
Use terminology likely to appear in policy documents.
PRESERVE identifiers, codes, and numbers verbatim.
Output only the rewritten query.

History:
  User: What's the fee for an international wire?
  Assistant: $45 for retail accounts.
  User: And for premier?

Output: "international wire transfer fee for Premier accounts"
```

**What it fixes:**

| Problem | Raw | Rewritten |
|---|---|---|
| Pronoun | "why did it fail?" | "reasons an international wire transfer fails" |
| Ellipsis | "and for premier?" | "international wire fee for Premier accounts" |
| Noise | "hey so I was wondering about fees maybe" | "account fees" |
| Vocabulary | "is it free" | "fee waiver eligibility" |
| Typos | "internatinal wire fee" | "international wire transfer fee" |

## 4. Practical Example

**Conversational RAG breaks without it:**

```
Turn 1: "What's the international wire fee?"
        → retrieves correctly as-is

Turn 2: "What about premier?"
        Raw: embedding of "what about premier" matches Premier
             account marketing pages, not the fee schedule.
        Rewritten: "international wire transfer fee for Premier
             accounts" → retrieves the fee table row. ✅

Turn 3: "And if it's expedited?"
        Raw: essentially meaningless as a query.
        Rewritten: "expedited international wire transfer fee
             Premier accounts" ✅
```

**Multi-turn RAG breaks by roughly the second follow-up without rewriting.** That's the clearest justification for its cost.

**The safest pattern — retrieve with both:**

```python
queries = [original]
if needs_rewriting(original, history):
    queries.append(rewrite(original, history))

results = fuse([search(q) for q in queries])   # RRF
```

You get the rewrite's benefit without its risk of discarding the original intent, and the second retrieval is cheap relative to the LLM call you already paid for.

## 5. Why It Matters

- **It's effectively required for conversational RAG.**
- **It bridges the vocabulary gap** between how users speak and how documents are written.
- **The failure it fixes is very visible to users** — follow-up questions returning nothing relevant.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Mitigation |
|---|---|---|
| **Rewrites away the intent** | Over-eager rewriting changes what was asked | Retrieve with both original and rewritten |
| **Latency on every query** | An LLM call before retrieval can begin | Small model; skip when already standalone |
| **Hallucinated context** | The rewriter invents specifics not in the history | Constrain the prompt; keep rewrites short |
| **Loses identifiers** | "AC-4471-B" paraphrased into a description | Explicit instruction to preserve codes verbatim |
| **Silent error compounding** | A bad rewrite guarantees bad retrieval, with no error | Log both queries; evaluate the rewriter separately |
| **Unnecessary on clear queries** | Cost with no benefit | Classify first; rewrite only when needed |

**The identifier instruction is not optional.** A rewriter will happily turn "policy AC-4471-B" into "the referenced policy document," which destroys exactly the query type BM25 was there to catch.

## 7. Interview Answer

> "Query rewriting transforms the user's raw question into a better retrieval query before searching — resolving pronouns from conversation history, stripping conversational noise, and matching the vocabulary documents actually use.
>
> The case where it's non-optional is conversational RAG. If a user asks about international wire fees and then says 'and for premier?', that as a query matches Premier account marketing pages, not the fee schedule. Rewritten to 'international wire transfer fee for Premier accounts,' it retrieves correctly. Without rewriting, multi-turn RAG breaks by about the second follow-up.
>
> The cost is one LLM call before retrieval can start, so two to four hundred milliseconds. I'd use a small fast model, since it's a constrained transformation rather than reasoning, and skip it entirely when the query is already standalone — a first-turn complete question doesn't need it.
>
> The risk I'd manage is that a bad rewrite guarantees bad retrieval, silently. So I'd retrieve with both the original and the rewritten query and fuse the results. That gets the benefit without the risk of discarding the original intent, and the second retrieval is cheap next to the LLM call I already paid for. I'd also log both queries so failures are diagnosable.
>
> One instruction I'd always include: preserve identifiers and codes verbatim. A rewriter will cheerfully turn 'policy AC-4471-B' into 'the referenced policy document,' which destroys exactly the query type BM25 was there to catch."

## 8. Likely Follow-ups

**Q: When do you skip rewriting?**
When the query is already standalone and specific — typically a first turn, or any query with no pronouns, no ellipsis, and sufficient context. A cheap heuristic works: is there conversation history, does the query contain a pronoun or a referring expression, is it under N words. Skipping saves latency on the majority of queries in many applications.

**Q: What model should do it?**
A small fast one. It's a constrained transformation task, not reasoning, and a lightweight model performs close to a large one. Since rewriting sits in front of retrieval, its latency is fully additive to every request it runs on, so speed dominates the choice.

**Q: How is this different from query expansion?**
Rewriting produces one better query, replacing the original — it fixes malformed or context-dependent queries. Expansion adds terms or additional queries to a well-formed one, improving recall on vocabulary mismatch. They compose: rewrite to make the query standalone, then expand to cover phrasing variants.

**Q: How do you evaluate the rewriter?**
As its own component. Build a set of conversational turns with known correct standalone forms and measure whether rewrites preserve intent. Then measure downstream: retrieval recall with rewriting versus without, on the same eval set. If recall doesn't improve, the rewriter is pure latency.

**Q: What's the biggest risk?**
Silent failure. A rewrite that loses or changes the intent produces bad retrieval with no error — you just get worse answers. Logging both queries makes it diagnosable, and retrieving with both makes it survivable. Without either, you have a component that can degrade the system invisibly.

## 9. Common Mistakes

- Rewriting every query regardless of need.
- Not instructing verbatim preservation of identifiers.
- Using a large model for a simple transformation.
- Replacing the original query instead of retrieving with both.
- Not logging both queries, making failures undiagnosable.

## 10. What to Remember

- **Turn the user's question into a good retrieval query** — resolve references, match document vocabulary.
- **Required for conversational RAG** — multi-turn breaks by the second follow-up without it.
- **Small fast model**; the latency is additive to every request it runs on.
- **Retrieve with both original and rewritten**, then fuse. Safest pattern.
- **Instruct verbatim preservation of identifiers** — rewriters paraphrase them away.
