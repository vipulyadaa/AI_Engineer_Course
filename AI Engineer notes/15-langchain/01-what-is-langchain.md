# What Is LangChain?

> **Phase 15 · LANGCHAIN · Topic 01**

## 1. Definition

A framework providing standard interfaces and composable components for LLM applications — loaders, splitters, embeddings, vector stores, retrievers, prompts, chains, and tools — so the same code works across providers.

## 2. Simple Explanation

LangChain gives you a common API over the pieces of a RAG or agent system. Swapping OpenAI for Gemini, or Chroma for Vertex AI Vector Search, becomes a configuration change rather than a rewrite.

That abstraction is genuinely useful early and becomes a constraint later — which is the honest summary.

## 3. How It Works

```
Document Loaders   →  read PDFs, HTML, databases, GCS
Text Splitters     →  chunk with overlap and structure awareness
Embeddings         →  one interface over many providers
Vector Stores      →  one interface over many databases
Retrievers         →  the query-side abstraction
Prompts            →  templates with variables
Chains / LCEL      →  compose steps with the | operator
Output Parsers     →  structured output from text
Tools & Agents     →  tool calling and loops
Callbacks          →  hooks for logging and tracing
```

**LCEL** — the expression language — is the current composition model:

```python
chain = prompt | llm | StrOutputParser()
chain.invoke({"question": q})
```

It gives streaming, batching, and async for free across any composition, which is a real benefit over writing the plumbing yourself.

## 4. Practical Example

**A complete RAG chain, which shows both the appeal and the risk:**

```python
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

chain = (
    {"context": retriever | format_docs,
     "question": RunnablePassthrough()}
    | prompt
    | ChatVertexAI(model="gemini-2.0-flash")
    | StrOutputParser()
)
answer = chain.invoke("What is the international transfer fee?")
```

**Eight lines for working RAG.** That's the appeal, and it's real — the time from nothing to a demonstrable system is genuinely short.

**The risk in the same eight lines:**

```
· What exactly is in the prompt sent to the model?
· How were documents formatted into context?
· What happens if retrieval returns nothing?
· Where would I add a relevance threshold?
· Where does the permission filter go?

None of those are visible. They're all decisions the
framework made, and in a banking system every one of them
is a decision I need to own.
```

**So my actual position:** LangChain's loaders, splitters, and provider adapters are genuinely useful and worth keeping. The orchestration layer is worth replacing with explicit code once requirements become specific — which in a regulated context happens quickly.

## 5. Why It Matters

- **It's the default framework**, so it comes up in essentially every LLM interview.
- **The abstraction hides decisions** that a production system needs to own.
- **Component-by-component adoption** is the position that holds up.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Hidden prompts** | Hard to know what the model actually received |
| **Rapid API churn** | Examples and code go stale quickly |
| **Debugging through layers** | Stack traces span framework internals |
| **Abstraction leaks** | Provider differences surface anyway |
| **Dependency weight** | Large transitive dependency tree |
| **Version pinning essential** | Minor upgrades have broken behaviour |

**On the honest assessment:** LangChain accelerates the first 80% and can obstruct the last 20%. For a prototype it's clearly right. For a production banking system where prompts must be reviewable, retrieval must be auditable, and behaviour must be deterministic, the orchestration abstraction works against you.

**On what to keep:** the document loaders and text splitters are solid, well-tested utilities that would otherwise be reimplemented badly. Using those while writing the orchestration explicitly is a defensible and common position.

## 7. Interview Answer

> "LangChain is a framework of standard interfaces and composable components for LLM applications — loaders, splitters, embeddings, vector stores, retrievers, prompts, chains, tools. The value is that swapping providers becomes configuration rather than a rewrite, and LCEL gives you streaming, batching, and async for free across any composition.
>
> The appeal is genuine. You can have working RAG in about eight lines: a retriever, a prompt, a model, an output parser, composed with pipe operators. Time from nothing to a demonstrable system is very short.
>
> The risk is in those same eight lines. What exactly was in the prompt sent to the model? How were documents formatted into context? What happens if retrieval returns nothing? Where would I add a relevance threshold, or the permission filter? None of that is visible — they're all decisions the framework made, and in a banking system every one is a decision I need to own.
>
> So my position is component-by-component rather than all-or-nothing. The document loaders and text splitters are solid, well-tested utilities I'd otherwise reimplement badly, and I'd keep those. The orchestration layer I'd replace with explicit code once requirements get specific — which in a regulated context happens quickly, because prompts need to be reviewable, retrieval needs to be auditable, and behaviour needs to be deterministic.
>
> The way I'd summarize it: LangChain accelerates the first eighty percent and can obstruct the last twenty. For a prototype it's clearly the right call. For production it depends on how much of that last twenty percent you actually need, and in banking you need most of it.
>
> The practical annoyances are real too — rapid API churn means examples go stale fast, stack traces span framework internals, and I'd pin versions tightly because minor upgrades have changed behaviour."

## 8. Likely Follow-ups

**Q: What does LangChain actually give you?**
Standard interfaces over providers, so swapping models or vector stores is configuration rather than a rewrite. Plus tested implementations of loaders and splitters, and LCEL composition that provides streaming, batching, and async across any chain without writing that plumbing.

**Q: What's the main drawback?**
The abstraction hides decisions you need to own — the exact prompt sent, how documents were formatted, what happens when retrieval fails, where thresholds and permission filters belong. In a regulated system those all need to be explicit and reviewable.

**Q: Would you use it in production?**
Selectively. The loaders and text splitters, yes — they're solid utilities. The orchestration layer I'd replace with explicit code, because the requirements that matter in banking are precisely the ones the abstraction obscures.

**Q: When is it clearly the right choice?**
Prototyping and early development, where time to a working system matters more than control over every detail, and where the provider choices aren't yet settled. The speed advantage is real and worth having before requirements are specific.

**Q: What practical issues would you plan for?**
Tight version pinning, because minor releases have changed behaviour. Expect stack traces that span framework internals, and expect published examples to go stale quickly given the pace of API change. Those are manageable but they need budgeting for.

## 9. Common Mistakes

- Treating it as all-or-nothing rather than component-by-component.
- Not knowing what prompt the framework actually sent.
- Using framework defaults for thresholds and formatting in production.
- Failing to pin versions.
- Dismissing it entirely, including the genuinely useful utilities.

## 10. What to Remember

- **Standard interfaces plus composable components**; LCEL for composition.
- **Eight lines to working RAG** — real speed, real hidden decisions.
- **Keep loaders and splitters; own the orchestration** in production.
- **Accelerates the first 80%, obstructs the last 20%.**
- **Pin versions** — API churn is significant.
