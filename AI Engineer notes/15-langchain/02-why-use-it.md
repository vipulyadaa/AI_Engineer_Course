# Why Use LangChain?

> **Phase 15 · LANGCHAIN · Topic 02**

## 1. Definition

The case for LangChain is speed to a working system, provider portability, and not reimplementing well-solved utilities. The case against is loss of control over the details that matter in production.

## 2. Simple Explanation

You could write RAG yourself — it's a retrieval call, a prompt, and a model call. LangChain's value isn't that this is hard; it's that the surrounding pieces are tedious and easy to get subtly wrong.

PDF parsing, structure-aware chunking, retry logic, streaming, async — those are where the time goes, and they're solved.

## 3. How It Works

**What genuinely saves time:**

```
DOCUMENT LOADERS   PDF, DOCX, HTML, GCS, databases — each with
                   its own parsing edge cases
TEXT SPLITTERS     recursive, structure-aware, token-aware
                   splitting with overlap
PROVIDER ADAPTERS  a uniform interface with retry and streaming
LCEL PLUMBING      streaming, batching, async, parallel
                   branches — free across any composition
INTEGRATIONS       dozens of vector stores and model providers
```

**What saves less than it appears:**

```
CHAINS       the composition itself is a few lines of code
AGENTS       the loop is simple; the hard parts (budgets,
             authorization, observability) you write anyway
MEMORY       the abstractions rarely match real requirements
PROMPTS      string templating isn't the hard part
```

## 4. Practical Example

**The strongest concrete argument:**

```
Loading a directory of banking PDFs and chunking them by
structure.

WITHOUT: pypdf, handling of multi-column layouts, tables,
         headers and footers, encoding issues, then a
         recursive splitter respecting headings, then token
         counting for the target model.
         → days of work, and the edge cases surface later

WITH:    a loader and a splitter, configured.
         → an afternoon

That's a genuine saving, and it's in the part of the pipeline
that most determines retrieval quality.
```

**The weakest argument, stated honestly:**

```
"Provider portability."

In practice, switching from Gemini to another model still
requires re-tuning prompts, re-testing outputs, re-validating
groundedness, and re-tuning the retrieval threshold. The API
call changes trivially; everything around it doesn't.

Portability is real at the interface level and overstated as
a business benefit.
```

**So the decision framework I'd use:**

```
USE IT FOR    ingestion — loaders, splitters
              prototyping and exploration
              provider adapters where the API is tedious

WRITE IT FOR  the query path — retrieval, filtering, prompt
              assembly, generation
              anything needing audit, thresholds, or
              permission enforcement
              agent loops with real budgets

Split at the ingestion/query boundary. Ingestion is batch,
inspectable, and rerunnable. The query path is what customers
experience and regulators ask about.
```

## 5. Why It Matters

- **The ingestion utilities are the strongest case** and they're in the highest-leverage part of the pipeline.
- **Provider portability is overstated** — saying so demonstrates judgment.
- **Splitting at the ingestion/query boundary** is a clean, defensible position.

## 6. Trade-offs / Failure Modes

| Using it | Not using it |
|---|---|
| Fast to working | Full control from day one |
| Hidden decisions | Reimplementing solved utilities |
| API churn | No framework upgrade risk |
| Debugging through layers | Direct stack traces |
| Community integrations | Writing each adapter yourself |

**On the sunk-cost trap:** teams adopt LangChain for the prototype, then keep it through production because rewriting feels wasteful — and end up fighting the abstraction on exactly the requirements that matter. Deciding the boundary early, and structuring code so the orchestration is replaceable, avoids that. The prototype should be written expecting the orchestration to be rewritten.

**On dependency weight:** it pulls in a large transitive tree, which in a bank means more to review, patch, and justify in a security assessment. That's a real cost that doesn't appear in technical comparisons.

## 7. Interview Answer

> "The genuine case is speed to a working system and not reimplementing solved utilities. The strongest concrete example is ingestion. Loading a directory of banking PDFs and chunking them by structure means handling multi-column layouts, tables, headers and footers, encoding issues, then a splitter that respects headings and counts tokens for your model. That's days of work with edge cases surfacing later. With LangChain it's a loader and a splitter, configured — an afternoon. And it's in the part of the pipeline that most determines retrieval quality, so the saving is in a high-leverage place.
>
> The weakest argument is provider portability, and I'd say so. Switching from Gemini to another model still means re-tuning prompts, re-testing outputs, re-validating groundedness, and re-tuning the retrieval threshold. The API call changes trivially; everything around it doesn't. Portability is real at the interface level and overstated as a business benefit.
>
> What saves less than it appears is the orchestration — chains, agents, memory. The composition is a few lines of code, the agent loop is simple, and the hard parts of agents are budgets, authorization, and observability, which you write yourself regardless.
>
> So my framework is to split at the ingestion-versus-query boundary. Use it for ingestion, prototyping, and provider adapters. Write the query path explicitly — retrieval, filtering, prompt assembly, generation — because that's what customers experience and what regulators ask about, and it needs thresholds, audit, and permission enforcement to be visible.
>
> The trap I'd warn about is sunk cost. Teams adopt it for the prototype, keep it through production because rewriting feels wasteful, and then fight the abstraction on exactly the requirements that matter. I'd decide the boundary early and write the prototype expecting the orchestration to be replaced.
>
> One cost that doesn't show up in technical comparisons: it pulls in a large transitive dependency tree, and in a bank that means more to review, patch, and justify in a security assessment."

## 8. Likely Follow-ups

**Q: What's the strongest reason to use it?**
Ingestion utilities. Document loaders and text splitters handle real parsing edge cases — multi-column PDFs, tables, headers, encoding — and structure-aware chunking with token counting. That's days of work replaced by configuration, in the stage that most determines retrieval quality.

**Q: Is provider portability a real benefit?**
At the interface level, yes; as a business benefit, it's overstated. Switching models still requires re-tuning prompts, re-testing outputs, re-validating groundedness, and re-tuning thresholds. The API call is the trivial part of a model migration.

**Q: What would you not use it for?**
The query path — retrieval, filtering, prompt assembly, generation — and agent orchestration. Those need explicit thresholds, visible prompts, auditable retrieval, and enforced permissions, all of which the abstraction obscures while saving only a few lines of composition code.

**Q: How do you avoid the sunk-cost trap?**
Decide the boundary before building, and write the prototype expecting the orchestration to be replaced — keeping it behind interfaces so replacement is mechanical. Teams that don't do this keep the framework through production because rewriting feels wasteful, then fight it on the requirements that matter most.

**Q: Any non-technical costs?**
The dependency tree. It's large, and in a bank that means more packages to review, patch, and justify in a security assessment, plus more exposure to supply-chain concerns. That doesn't appear in feature comparisons but it's real work.

## 9. Common Mistakes

- Leading with provider portability as the main benefit.
- Using it for the query path in a regulated system.
- Keeping the orchestration through production out of sunk cost.
- Ignoring the dependency review burden.
- Rejecting it entirely, including the genuinely strong ingestion utilities.

## 10. What to Remember

- **Ingestion utilities are the strongest case** — days of work, high leverage.
- **Provider portability is overstated** — migrations are mostly re-tuning.
- **Chains, agents, and memory save little** — those parts are simple anyway.
- **Split at ingestion vs query path** — a clean, defensible boundary.
- **Plan for replacement from the start**; note the dependency review cost.
