# Query Planning

> **Phase 18 · AGENTIC RAG · Topic 04**

## 1. Definition

Decomposing a user question into the specific retrieval queries needed to answer it, before retrieving. It turns one vague search into several targeted ones — and exposes which can run in parallel.

## 2. Simple Explanation

A user asks one question that actually contains three. Embedding the whole thing produces a vector that's a blurry average of all three and matches none of them well.

Query planning splits it: one focused query per information need, each retrieving what it actually needs.

## 3. How It Works

```
"What's the international wire fee, how does it differ for
 Premier customers, and are there monthly waivers?"

PLANNED QUERIES
  1. "international wire transfer fee standard rate"
  2. "Premier tier international wire transfer fee"
  3. "fee waiver policy international transfers monthly limit"

All three are INDEPENDENT → retrieve in parallel
Results merged, deduplicated, then generation
```

**Why the single-query version fails:** the embedding of a three-part question sits somewhere between three regions of the space. It may be closest to nothing in particular, and top-k is likely to over-represent whichever part had the strongest lexical signal.

## 4. Practical Example

**Independent vs dependent decomposition — the distinction that matters:**

```
INDEPENDENT (parallel)
  "Compare Premier and Standard wire fees"
    → both queries known up front; retrieve concurrently

DEPENDENT (sequential — this is multi-hop)
  "Does my tier qualify for the pre-2020 account waiver?"
    → query 1: what is my tier?      → "Premier"
    → query 2: does Premier qualify for the pre-2020 waiver?
      ↑ this query CANNOT be written until query 1 returns

Planning handles the first case well. The second requires
iterative retrieval, because the plan can't be complete
in advance.

Recognizing which you have is the actual skill.
```

**A practical implementation detail:**

```
Ask the planner for structured output:

  {"queries": [
     {"q": "...", "purpose": "standard rate",  "depends_on": []},
     {"q": "...", "purpose": "Premier rate",   "depends_on": []},
     {"q": "...", "purpose": "waiver policy",  "depends_on": []}
  ]}

The "purpose" field is useful beyond documentation — it lets
the system check afterwards whether each information need
was actually satisfied, and report which weren't rather than
generating around the gap.
```

**When not to plan:** single-intent questions — which are most of them — don't need it. Planning a one-part question costs an extra LLM call and produces one query. The classifier should route only multi-part questions to planning.

## 5. Why It Matters

- **A multi-part question embeds poorly** as one vector — this is a structural fix.
- **Independent vs dependent decomposition** determines parallel or iterative, and confusing them wastes effort.
- **Per-query purpose** enables checking whether each need was met.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Extra LLM call** | Wasteful for single-intent questions |
| **Over-decomposition** | Five queries where two would do |
| **Losing shared context** | Sub-queries dropping "for a Premier customer" |
| **Treating dependent as independent** | Query 2 written before query 1's answer exists |
| **Merged results unchecked** | Gaps hidden by an apparently full context |

**On losing shared context:** if the question is "as a Premier customer, what are the wire fee and the waiver rules?", both sub-queries must carry "Premier". A decomposition that drops it retrieves the general policy for both and produces a subtly wrong answer. Instructing the planner to make each query self-contained is the fix, and it's a common defect.

**On checking coverage:** after retrieval, verify that each planned purpose was actually satisfied — did anything retrieved address the waiver policy? If not, say so rather than generating an answer that silently omits a third of what was asked. That's what makes the purpose field worth having.

## 7. Interview Answer

> "Query planning decomposes a user question into the specific retrieval queries needed to answer it. The reason it's necessary is structural: a three-part question embedded as one vector sits between three regions of the space, so it may be closest to nothing in particular, and top-k over-represents whichever part had the strongest lexical signal. Splitting it gives each information need a focused query.
>
> The distinction that actually matters is independent versus dependent decomposition. 'Compare Premier and Standard wire fees' is independent — both queries are known up front and can retrieve in parallel. 'Does my tier qualify for the pre-2020 account waiver' is dependent — you can't write the second query until you know the tier. Planning handles the first case well; the second needs iterative retrieval because the plan can't be complete in advance. Recognizing which you have is the real skill.
>
> Implementation-wise, I'd ask the planner for structured output: each query with a purpose and its dependencies. The dependencies give parallelism, and the purpose field does more than document — it lets me check afterwards whether each information need was actually satisfied. If nothing retrieved addresses the waiver policy, I'd rather say so than generate an answer that silently omits a third of what was asked.
>
> The defect I'd watch for is losing shared context. If the question is 'as a Premier customer, what are the wire fee and the waiver rules', both sub-queries need to carry 'Premier'. A decomposition that drops it retrieves the general policy for both and produces a subtly wrong answer that looks fine. So I'd instruct the planner to make each query self-contained.
>
> And I wouldn't plan single-intent questions, which are most of them. Planning a one-part question costs an extra LLM call and produces one query. The classifier should route only multi-part questions to the planner."

## 8. Likely Follow-ups

**Q: Why does a multi-part question need decomposition?**
Because its embedding is effectively a blur of several distinct meanings, sitting between the regions where each part's answer lives. It may match nothing well, and top-k tends to over-represent whichever part had the strongest signal, leaving the others unanswered.

**Q: What's the difference between independent and dependent decomposition?**
Independent sub-queries are all knowable up front and can retrieve in parallel. Dependent ones can't be written until an earlier result arrives — that's multi-hop, and it needs iterative retrieval rather than planning, because the plan can't be complete in advance.

**Q: What should the planner output?**
Structured queries with a purpose and dependencies for each. Dependencies enable parallel execution; the purpose lets you verify afterwards that each information need was actually satisfied, so gaps get reported rather than silently generated around.

**Q: What's a common decomposition defect?**
Dropping shared context. If the question specifies "as a Premier customer," every sub-query needs to carry that, or they retrieve the general policy and produce a subtly wrong answer. Instructing the planner to make each query self-contained is the fix.

**Q: Should every question be planned?**
No. Most are single-intent, where planning costs an extra call to produce one query. A classifier should route only multi-part questions to the planner, keeping the cost where it buys something.

## 9. Common Mistakes

- Planning single-intent questions.
- Dropping shared qualifiers from sub-queries.
- Treating dependent sub-questions as independent.
- Over-decomposing into more queries than the question contains.
- Not checking whether each planned purpose was actually satisfied.

## 10. What to Remember

- **A multi-part question embeds poorly as one vector** — decomposition is structural.
- **Independent → parallel; dependent → iterative.** Tell them apart.
- **Ask for purpose and dependencies**, not just a list of queries.
- **Keep shared qualifiers in every sub-query.**
- **Verify each purpose was satisfied**; report gaps rather than generating around them.
