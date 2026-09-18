# Query Rewriting

> **Phase 09 · ADVANCED RAG · Topic 05**

## 1. Definition

Transforming the user's raw question into a better retrieval query before searching — resolving pronouns, adding implied context, removing conversational noise, and translating colloquial phrasing into corpus vocabulary.

## 2. Simple Explanation

Users don't ask questions in the form documents are written in.

They say "and what about for premier?" — which retrieves nothing, because it has no subject. They say "why did it bounce?" — where "it" refers to a transfer mentioned three turns ago. They say "is it free" when the document says "no fee applies."

Rewriting turns the user's question into something the retriever can actually work with.

## 3. How It Works

An LLM call before retrieval, with conversation history:

```
System: Rewrite the user's question into a standalone search query.
Resolve pronouns and references using the conversation history.
Use terminology likely to appear in policy documents.
Output only the rewritten query.

History:
  User: What's the fee for an international wire?
  Assistant: $45 for retail accounts.
  User: And for premier?

Rewritten: "international wire transfer fee for Premier accounts"
```

**What rewriting fixes:**

| Input problem | Example | Rewritten |
|---|---|---|
| Pronoun reference | "why did it fail?" | "reasons an international wire transfer fails" |
| Ellipsis | "and for premier?" | "international wire fee for Premier accounts" |
| Conversational noise | "hey so I was wondering if maybe you could tell me about fees" | "account fees" |
| Vocabulary mismatch | "is it free" | "fee waiver eligibility" |
| Typos | "internatinal wire fee" | "international wire transfer fee" |

## 4. Practical Example

**Conversational RAG is where this is non-optional:**

```
Turn 1: "What's the international wire fee?"
        → retrieves fine as-is

Turn 2: "What about premier?"
        Raw query embedding → matches nothing useful.
        The words "premier" alone retrieve Premier account marketing pages,
        not the fee schedule.

        Rewritten: "international wire transfer fee for Premier accounts"
        → retrieves the correct fee table row.
```

**Without rewriting, multi-turn RAG breaks on roughly the second follow-up.** That's the clearest justification for its cost.

**The cost and the mitigation:**

```
Rewriting adds one LLM call: ~200–400ms and a small per-query cost.

Mitigation: use a small fast model for rewriting. It's a simple
transformation task — a lightweight model does it nearly as well
as a large one, at a fraction of the latency.

Better mitigation: skip it when unnecessary. First turn of a
conversation with a complete, specific question doesn't need rewriting.
```

## 5. Why It Matters

- **It's effectively required for conversational RAG.** Multi-turn breaks without it.
- **It bridges the vocabulary gap** between how users speak and how documents are written.
- **It's cheap to implement** and the failure it fixes is very visible to users.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Mitigation |
|---|---|---|
| **Rewrites away the real intent** | Over-eager rewriting changes what was asked | Retrieve with both original and rewritten query |
| **Adds latency to every query** | One LLM call before retrieval can begin | Small model; skip when the query is already standalone |
| **Hallucinated context** | Rewriter invents specifics not in the history | Constrain the prompt; keep the rewrite short |
| **Loses exact identifiers** | "AC-4471-B" paraphrased away | Instruct preservation of codes and numbers verbatim |
| **Compounds errors** | A bad rewrite guarantees bad retrieval, silently | Log both queries; evaluate rewriter quality separately |
| **Unnecessary on clear queries** | Cost with no benefit | Classify first; rewrite only when needed |

**The safest pattern:** retrieve with *both* the original and the rewritten query, then fuse. You get the rewrite's benefit without its risk of losing the original intent, at the cost of a second retrieval — which is cheap relative to the LLM call you already made.

## 7. Interview Answer

> "Query rewriting transforms the user's raw question into a better retrieval query before searching — resolving pronouns, adding implied context, stripping conversational noise, and matching the vocabulary documents actually use.
>
> The case where it's non-optional is conversational RAG. If a user asks about international wire fees and then says 'and for premier?', that second query as written retrieves nothing useful — 'premier' alone matches marketing pages, not the fee table. Rewriting it to 'international wire transfer fee for Premier accounts' fixes it. Without rewriting, multi-turn RAG breaks by about the second follow-up.
>
> It also bridges the vocabulary gap. Users say 'is it free' where the document says 'no fee applies,' and dense retrieval handles some of that but not all.
>
> The cost is one LLM call before retrieval can start, so two to four hundred milliseconds. I'd use a small fast model, since it's a simple transformation task and a lightweight model does it nearly as well. And I'd skip it entirely when the query is already standalone and specific — a first-turn complete question doesn't need it.
>
> The risk I'd manage is that a bad rewrite guarantees bad retrieval, silently. The safest pattern is retrieving with both the original and the rewritten query and fusing the results — you get the benefit without the risk of rewriting away the real intent, and the second retrieval is cheap next to the LLM call you already paid for.
>
> One specific instruction I'd include: preserve identifiers and codes verbatim, because a rewriter will happily paraphrase a policy number into a description."

## 8. Likely Follow-ups

**Q: What's the risk of rewriting?**
The rewrite can lose or change the intent, and when it does, retrieval fails silently — there's no error, just worse results. I'd log both the original and the rewritten query so failures are diagnosable, evaluate the rewriter as its own component against a labeled set, and retrieve with both queries so the original is always represented.

**Q: When do you skip rewriting?**
When the query is already standalone and specific — typically the first turn of a conversation, or any query with no pronouns and no ellipsis. A cheap classifier or even a heuristic (does it contain a pronoun, is it under N words, is there conversation history) can decide. Skipping saves latency on the majority of queries in many applications.

**Q: How is this different from query expansion?**
Rewriting produces one better query, replacing the original. Expansion produces additional terms or additional queries, augmenting it. Rewriting fixes malformed or context-dependent queries; expansion improves recall on well-formed ones by covering synonyms and related phrasings. They compose — rewrite first to make the query standalone, then expand.

**Q: What model should do the rewriting?**
A small, fast one. It's a constrained transformation task, not reasoning, so a lightweight model performs close to a large one at much lower latency and cost. Since rewriting sits in front of retrieval, its latency is fully additive to every request, which makes speed the dominant consideration.

**Q: How do you evaluate the rewriter?**
As its own component, not just end-to-end. Build a set of conversational turns with known correct standalone forms and measure whether rewrites preserve intent. Then measure the downstream effect: retrieval recall with rewriting versus without, on the same eval set. If recall doesn't improve, the rewriter is pure latency.

## 9. Common Mistakes

- Rewriting every query regardless of whether it needs it.
- Not preserving identifiers and codes verbatim.
- Using a large model for a simple transformation, adding unnecessary latency.
- Not logging both queries, making failures undiagnosable.
- Replacing the original query entirely instead of retrieving with both.

## 10. What to Remember

- **Turn the user's question into a good retrieval query** — resolve pronouns, add context, match document vocabulary.
- **Effectively required for conversational RAG** — multi-turn breaks without it.
- **Use a small fast model**; the latency is additive to every request.
- **Retrieve with both original and rewritten**, then fuse. Safest pattern.
- **Instruct verbatim preservation of identifiers** — rewriters paraphrase them away.
