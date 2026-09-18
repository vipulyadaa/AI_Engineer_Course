# Self-Query Retrieval

> **Phase 09 · ADVANCED RAG · Topic 12**

## 1. Definition

Using an LLM to parse a natural-language question into two parts — a semantic search string and a structured metadata filter — then running a filtered vector search. It lets users express constraints in plain language that would otherwise require a form.

## 2. Simple Explanation

A user asks: *"What were the fee changes for credit cards after January 2026?"*

That contains a semantic part ("fee changes") and two structured constraints (`product = credit_card`, `effective_date > 2026-01-01`). Embedding the whole sentence wastes the constraints — they become fuzzy semantic signal instead of hard filters.

Self-query splits them: the filter becomes an exact metadata constraint, and only "fee changes" goes to the vector search.

## 3. How It Works

```
"fee changes for credit cards after January 2026"
                    │
                    ▼
        ┌───────────────────────────┐
        │ LLM with a schema of      │
        │ available metadata fields │
        └───────────┬───────────────┘
                    ▼
   {
     "query":  "fee changes",
     "filter": {
        "product": {"eq": "credit_card"},
        "effective_date": {"gt": "2026-01-01"}
     }
   }
                    ▼
   pre-filtered vector search on "fee changes"
```

1. **Define the metadata schema** — field names, types, allowed values, descriptions.
2. **LLM extracts** the semantic query and the filter, with structured output enforcing the schema.
3. **Validate** the filter against the schema — reject unknown fields or invalid values.
4. **Pre-filter and search.**

**Structured output is essential here.** A free-text filter that the LLM invents is unparseable and unsafe; constrain it to a schema with enumerated values.

## 4. Practical Example

**What it buys over plain semantic search:**

```
Query: "show me mortgage documents from 2025"

Without self-query:
  Embeds the whole sentence. "2025" becomes weak semantic signal.
  Retrieves mortgage documents from any year, with 2025 ones
  ranked slightly higher if the text happens to mention the year.
  No guarantee.

With self-query:
  filter: {doc_type: "mortgage", year: 2025}
  query:  ""  (or a generic semantic term)
  → Exactly the eligible set. Deterministic.
```

**The schema the LLM sees:**

```python
metadata_schema = [
    {"name": "product", "type": "string",
     "enum": ["credit_card", "mortgage", "savings", "international_transfers"],
     "description": "The banking product the document covers"},
    {"name": "effective_date", "type": "date",
     "description": "When this version of the policy took effect"},
    {"name": "doc_type", "type": "string",
     "enum": ["policy", "faq", "procedure", "regulatory"]},
]
```

Enumerated values matter — without them the LLM will invent `product = "credit cards"` (plural, spaced) and the filter matches nothing.

## 5. Why It Matters

- **It turns natural language into structured constraints**, which is the only way to enforce things like date ranges reliably.
- **It's a big precision gain on corpora with rich metadata**, because it removes ineligible documents entirely rather than hoping ranking handles it.
- **It's the natural companion to metadata filtering** — filtering is the mechanism, self-query is the interface.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Mitigation |
|---|---|---|
| **Over-filtering** | LLM infers a constraint the user didn't intend; correct answer excluded | Make filters optional; fall back to unfiltered on empty results |
| **Invented field values** | `product = "credit cards"` doesn't match `"credit_card"` | Enumerate allowed values in the schema; validate before querying |
| **Latency** | One LLM call before retrieval | Small model; skip when the query has no obvious constraints |
| **Schema drift** | New metadata fields added but the prompt schema not updated | Generate the schema from the index definition |
| **Silent failure** | A wrong filter returns zero results and the system says "no information" | Detect empty results and retry unfiltered |
| **Injection via query** | Crafted input producing an unintended filter | Validate against the schema; never build raw query strings from LLM output |

**Over-filtering is the dominant risk.** A user asking "what are the fees?" might get `product` inferred from earlier conversation and inadvertently scoped to the wrong product. The safe design is: filters are hints, and an empty or very small filtered result set triggers a retry without them.

## 7. Interview Answer

> "Self-query retrieval uses an LLM to parse a natural-language question into a semantic search string plus a structured metadata filter, then runs a filtered vector search.
>
> The problem it solves is that constraints expressed in natural language get wasted by plain embedding. If someone asks for 'mortgage documents from 2025,' embedding the whole sentence makes '2025' weak semantic signal — you retrieve mortgage documents from any year, with 2025 ones maybe ranked slightly higher if the text mentions the year. There's no guarantee. Extracting it as a hard filter makes it deterministic.
>
> Implementation needs a metadata schema the LLM sees — field names, types, and crucially enumerated allowed values. Without enumeration the model will produce 'credit cards' when the index stores 'credit_card', and the filter matches nothing. I'd use structured output to enforce the schema and validate the result before querying.
>
> The dominant risk is over-filtering. The model infers a constraint the user didn't intend and excludes the correct answer — and it fails silently, because you get zero results and the system says 'I don't have information about that.' So I'd treat filters as hints rather than requirements: if the filtered result set is empty or very small, retry without them.
>
> I'd also route rather than apply it universally. Most queries contain no extractable constraints, so running an LLM call before every retrieval is latency for nothing. A cheap check for dates, product names, or document types decides when it's worth it."

## 8. Likely Follow-ups

**Q: What's the main risk?**
Over-filtering — the model inferring a constraint that excludes the right answer, and doing it silently. Zero results looks identical to "we have no documentation on this." The mitigation is treating filters as soft: detect empty or near-empty filtered results and retry without the filter, logging when that happens so you can measure how often extraction is wrong.

**Q: How do you stop the LLM inventing invalid filter values?**
Enumerate allowed values in the schema you give it, use structured output to constrain the response shape, and validate the parsed filter against the schema before it reaches the database — rejecting unknown fields and out-of-enum values. Never construct a query string from raw LLM output; build it programmatically from validated fields.

**Q: How is this different from plain metadata filtering?**
Metadata filtering is the mechanism — constraining the candidate set. Self-query is the interface that derives those constraints from natural language rather than from a form or explicit API parameters. You can have filtering without self-query, using UI controls. Self-query is what lets a chat interface support the same constraints.

**Q: When would you skip it?**
When queries rarely contain constraints, or when the UI already captures them — if the user picked a product from a dropdown, you have the filter already and don't need to infer it. Also when the metadata schema is thin; self-query is only valuable when there's rich structured metadata worth filtering on.

**Q: How do you keep the schema in sync?**
Generate the schema passed to the LLM from the index's actual metadata definition rather than maintaining it by hand in a prompt. That way adding a field or a new enum value updates both places at once. Hand-maintained prompt schemas drift, and the failure is silent — the model just never uses the new field.

## 9. Common Mistakes

- Not enumerating allowed values, so the LLM invents unmatched ones.
- Treating extracted filters as mandatory rather than as hints.
- Not detecting and retrying on empty filtered results.
- Maintaining the schema by hand in a prompt so it drifts from the index.
- Applying it to every query, including the majority with no constraints.

## 10. What to Remember

- **LLM splits a question into semantic query + structured filter.**
- **Enumerate allowed values** in the schema, or the model invents unmatched ones.
- **Over-filtering is the dominant risk**, and it fails silently as "no information."
- **Treat filters as hints** — retry unfiltered on empty results, and log it.
- **Route rather than applying universally** — most queries have no constraints.
