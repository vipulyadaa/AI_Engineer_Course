# Context Reduction

> **Phase 25 · LLM COST OPTIMIZATION · Topic 04**

## 1. Definition

Sending less to the model without losing the information needed to answer — primarily by retrieving fewer, better chunks, and secondarily by managing conversation history and the fixed prefix.

## 2. Simple Explanation

Context reduction is usually framed as a cost compromise: send less, get slightly worse answers.

In RAG that framing is wrong. Fewer well-chosen chunks usually produce *better* answers, because relevance stops being diluted and material stops landing in the middle of a long context where it's used less reliably.

## 3. How It Works

```
WHERE CONTEXT COMES FROM

  retrieved chunks     the overwhelming majority
  conversation history grows every turn
  system instruction   fixed, repeated every request
  few-shot examples    fixed, often large

REDUCTION, in order of impact
  1. fewer chunks, chosen by a reranker
  2. history summarization
  3. cache the fixed prefix instead of reducing it
  4. drop few-shot examples if structured output replaces them
```

**Caching the fixed prefix beats shortening it** — you keep the quality and remove most of the cost.

## 4. Practical Example

**Why fewer chunks is not a compromise:**

```
20 chunks → 8 reranked chunks

COST      ~60% less input
LATENCY   lower TTFT, since prefill scales with input
QUALITY   usually BETTER:
            · relevant chunks aren't diluted by 12 marginal ones
            · less material sits mid-context, where models
              attend less reliably
            · the model has less opportunity to draw on a
              tangentially related passage

The condition: a reranker must choose the 8. Taking the
top 8 by embedding similarity loses recall — the reranker
is what makes them the RIGHT 8.
```

**Measuring it rather than assuming:**

```
Run the golden set at k = 20, 12, 8, 5 with reranking held
constant. Measure groundedness, answer correctness, cost,
and p95 latency at each.

Typically quality is flat from 20 down to about 8 and then
falls. That inflection is your operating point, and it's
specific to your chunk size and corpus — a number from a
blog post is a guess.
```

**History, which grows silently:**

```
Turn 1:  600 tokens of history
Turn 10: 6,000 tokens, re-sent every turn

Policy: keep the last 3-4 exchanges verbatim, summarize
older ones, and always keep the original question
unchanged — it's the anchor that prevents drift.
```

**What not to reduce:** the breadcrumb prefix on chunks, qualifying conditions in the retrieved text, and the citation metadata. Those are small and load-bearing — removing them saves almost nothing and breaks retrieval interpretation or citation.

## 5. Why It Matters

- **Fewer chunks improves quality and cost together** — not a compromise.
- **Cache the fixed prefix** rather than shortening it.
- **The k inflection point is corpus-specific** and must be measured.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Cutting k without reranking** | Recall loss for the saving |
| **Shortening the prefix instead of caching it** | Losing quality for a small gain |
| **Unbounded history** | Grows every turn, re-sent every turn |
| **Summarizing recent turns** | Loses detail the conversation depends on |
| **Removing breadcrumbs** | Chunks become uninterpretable |
| **Assuming a k value from elsewhere** | Corpus-specific inflection |

**On compression techniques:** prompt compression methods that remove low-information tokens from the context exist, and in a RAG system they're usually the wrong tool — the correct fix is retrieving less rather than compressing what was retrieved badly. Compression also risks removing a qualifying condition, which is the omission failure.

**On few-shot examples:** these can be a large fixed cost, and where structured output with a response schema achieves the same result, the examples become unnecessary. That's a clean saving — the schema constrains the output more reliably than examples do, and it costs nothing per request.

## 7. Interview Answer

> "Context reduction is usually framed as a cost compromise — send less, get slightly worse answers. In RAG that framing is wrong.
>
> Going from twenty chunks to eight reranked chunks is about sixty percent less input, lower time to first token since prefill scales with input size, and usually a *better* answer. Because relevant chunks aren't diluted by twelve marginal ones, less material sits mid-context where models attend less reliably, and the model has less opportunity to draw on a tangentially related passage.
>
> The condition is that a reranker chooses the eight. Taking the top eight by embedding similarity loses recall — the reranker is what makes them the right eight rather than just the first eight.
>
> I'd measure the inflection rather than assume it: run the golden set at k of twenty, twelve, eight, and five with reranking held constant, measuring groundedness, answer correctness, cost, and p95 latency. Typically quality is flat from twenty down to about eight and then falls. That inflection is the operating point, and it's specific to your chunk size and corpus — a number from a blog post is a guess.
>
> For the fixed prefix — system instruction and few-shot examples — I'd cache rather than shorten. Caching keeps the quality and removes most of the cost, whereas shortening trades quality for a small gain. And where structured output with a response schema achieves what few-shot examples were doing, the examples become unnecessary entirely, which is a clean saving.
>
> History grows silently: six hundred tokens at turn one, six thousand by turn ten, re-sent every turn. The policy is keep the last three or four exchanges verbatim, summarize older ones, and always keep the original question unchanged — it's the anchor that prevents drift across a long conversation.
>
> Two things I would not reduce. Breadcrumb prefixes on chunks, qualifying conditions in retrieved text, and citation metadata — those are small and load-bearing. Removing them saves almost nothing and breaks either retrieval interpretation or citation.
>
> And I'd avoid prompt compression techniques that strip low-information tokens from the context. In RAG the correct fix is retrieving less rather than compressing what was retrieved badly — and compression risks removing a qualifying condition, which is the omission failure and the most consequential one in banking answers."

## 8. Likely Follow-ups

**Q: Isn't reducing context a quality compromise?**
Usually not in RAG. Fewer well-chosen chunks produce better answers, because relevance stops being diluted and less material sits mid-context where attention is less reliable. It's one of the few optimizations that improves cost and quality together.

**Q: What's the condition for it to work?**
A reranker choosing the smaller set. Taking the top eight by embedding similarity alone loses recall — the reranker is what makes them the right eight. Without it, cutting k trades quality for cost, which is a different and worse deal.

**Q: How do you pick k?**
By measuring. Run the golden set at several k values with reranking constant, and look for the inflection where quality starts falling — typically flat from twenty down to around eight. That point is specific to your chunk size and corpus, so a borrowed number is a guess.

**Q: Should you shorten the system prompt?**
Cache it instead. Caching the fixed prefix keeps the quality and removes most of the cost, whereas shortening trades quality for a small gain. And if structured output replaces few-shot examples, those can go entirely.

**Q: What shouldn't be reduced?**
Breadcrumb prefixes, qualifying conditions in retrieved text, and citation metadata — small and load-bearing. And I'd avoid prompt compression generally, since the right fix is retrieving less rather than compressing what was retrieved badly, and compression can strip a condition.

## 9. Common Mistakes

- Reducing k without a reranker.
- Shortening the system prompt rather than caching it.
- Unbounded conversation history.
- Summarizing recent turns the conversation depends on.
- Using prompt compression instead of retrieving better.

## 10. What to Remember

- **Fewer chunks improves cost, latency, and quality together** — with reranking.
- **Measure the k inflection** on your own corpus.
- **Cache the fixed prefix**; don't shorten it.
- **Keep the last 3–4 turns verbatim** and the original question unchanged.
- **Don't compress context** — retrieve less instead.
