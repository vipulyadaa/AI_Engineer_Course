# Cost (Gemini)

> **Phase 19 · GOOGLE GEMINI · Topic 18**

## 1. Definition

What a Gemini workload costs — driven by input tokens, output tokens, model tier, and modality — and the levers that reduce it without degrading the answers.

## 2. Simple Explanation

You pay per token, with output typically priced several times higher than input, and higher tiers costing substantially more than lower ones.

So the levers are: send fewer tokens, generate fewer tokens, use a cheaper tier where it doesn't hurt, and don't pay twice for the same input.

## 3. How It Works

```
cost = (input_tokens × input_rate)
     + (output_tokens × output_rate)

  · output is priced higher than input per token
  · tier multiplies both rates substantially
  · images and video consume many tokens each
  · context caching reduces the rate on a cached prefix
```

**A useful mental model:** in RAG, input dominates volume (retrieved context is large) while output is smaller but priced higher. Both matter, and they respond to different levers.

## 4. Practical Example

**The levers, by size of effect:**

```
1. MODEL TIER
   Flash-class versus Pro-class is a large multiple. If the
   golden set shows no quality difference for RAG generation,
   this is the single biggest saving available.

2. ROUTE AWAY FROM THE AGENT
   An agentic path costs several times a single RAG call.
   Classifying and sending most traffic to the deterministic
   path is typically ~70% off total spend.

3. CONTEXT CACHING
   For a large fixed prefix queried repeatedly — a long
   policy document, a large system instruction with
   examples — caching cuts the rate on that portion.

4. FEWER, BETTER CHUNKS
   Eight reranked chunks instead of twenty reduces input
   tokens AND usually improves the answer.

5. SHORTER OUTPUT
   Output is priced higher per token. Concise grounded
   answers are cheaper and generally better.

6. TIER WITHIN THE PIPELINE
   Smallest model for classification and query rewriting —
   those are a meaningful share of calls at trivial cost
   when tiered correctly.
```

**Measuring, which is what makes optimization targeted:**

```
Track tokens and cost per request, tagged by query type,
model, and path (deterministic vs agentic).

Almost always a small number of query types account for
most of the spend. Those are addressable specifically —
usually by routing them differently — and you can't find
them without the tagging.
```

**The multimodal surprise:** images and video consume far more tokens than people expect. A multi-page scanned document is a large input, so a document-heavy workload can cost far more than a text-only estimate suggests.

## 5. Why It Matters

- **Tier choice and routing** are the two largest levers by a wide margin.
- **Context caching** changes the economics for repeated large inputs.
- **Per-query-type cost tracking** is what turns optimization from guesswork into targeting.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Flagship tier for every task** | Paying a large multiple unnecessarily |
| **Agentic path for all traffic** | Several times the cost of a RAG call |
| **No caching on repeated prefixes** | Re-paying for identical input |
| **Stuffing context** | More tokens, often worse answers |
| **Untracked cost by query type** | No way to target optimization |
| **Underestimating multimodal cost** | Images and video are token-heavy |

**On the honest framing of cost work:** the biggest savings are architectural — tier and routing — not prompt micro-optimization. Teams often spend time shortening system prompts by a few hundred tokens while running the flagship model on every request. The order of operations matters.

**On budgets:** a per-request token budget checked before sending, and a per-user daily budget, prevent both runaway single requests and abuse. Without them, cost is observed retrospectively rather than controlled, and the first you know is the invoice.

## 7. Interview Answer

> "Cost is input tokens plus output tokens, with output priced higher per token and tier multiplying both rates substantially. In RAG, input dominates volume because retrieved context is large, while output is smaller but more expensive per token — so both matter and they respond to different levers.
>
> The two biggest levers are architectural. First, model tier: Flash-class versus Pro-class is a large multiple, so if the golden set shows no quality difference for RAG generation, that's the single biggest saving available. Second, routing: an agentic path costs several times a single RAG call, so classifying requests and sending most traffic down the deterministic path is typically around seventy percent off total spend.
>
> After that: context caching, for a large fixed prefix queried repeatedly — a long policy document, or a big system instruction with examples. Fewer, better-reranked chunks, which reduces input tokens and usually improves the answer. Shorter output, since it's priced higher per token and a concise grounded answer is generally better anyway. And tiering within the pipeline, so classification and query rewriting run on the smallest model — those are a meaningful share of calls at trivial cost when tiered correctly.
>
> The framing I'd stress is that the biggest savings are architectural, not prompt micro-optimization. Teams often spend time shortening a system prompt by a few hundred tokens while running the flagship model on every request. The order of operations matters.
>
> To make optimization targeted rather than guesswork, I'd track tokens and cost per request tagged by query type, model, and path. Almost always a small number of query types account for most of the spend, and those are addressable specifically — usually by routing them differently. You can't find them without the tagging.
>
> Two things that catch people out. Multimodal cost — images and video consume far more tokens than expected, so a document-heavy workload can cost several times a text-only estimate.
>
> And budgets. A per-request token budget checked before sending, and a per-user daily budget, prevent both runaway single requests and abuse. Without them cost is observed retrospectively and the first you know about it is the invoice."

## 8. Likely Follow-ups

**Q: What's the biggest cost lever?**
Model tier, then routing. Flash-class versus Pro-class is a large multiple, and routing most traffic to a deterministic path rather than an agent is typically around seventy percent off total spend. Both are architectural decisions, not tuning.

**Q: When does context caching help?**
When a large fixed prefix is queried repeatedly — a long policy document, or a substantial system instruction with few-shot examples. It cuts the rate on that cached portion. It doesn't help when the input differs every request, which is the usual RAG case.

**Q: How do you find what to optimize?**
Track tokens and cost per request, tagged by query type, model, and path. A small number of query types almost always dominate spend, and those are addressable specifically — usually by routing them differently. Without the tagging it's guesswork.

**Q: What surprises people about cost?**
Multimodal inputs. Images and video consume far more tokens than expected, so a document-heavy workload can cost several times what a text-only estimate suggested. Also that output is priced higher per token than input, which makes answer length a real lever.

**Q: How do you control cost rather than observe it?**
A per-request token budget checked before sending, using token counting, and a per-user daily budget. That prevents runaway single requests and abuse. Without them, cost is retrospective and the first signal is the invoice — which is too late to act on.

## 9. Common Mistakes

- Micro-optimizing prompts while running the flagship on every request.
- No routing, so all traffic pays agentic cost.
- Not caching a large repeated prefix.
- Stuffing context on the assumption more is better.
- No per-request or per-user budgets.

## 10. What to Remember

- **Output is priced higher than input**; tier multiplies both.
- **Tier and routing are the two biggest levers** — architectural, not tuning.
- **Context caching** for large repeated prefixes.
- **Track cost per query type** — a few types dominate.
- **Budget per request and per user**, or cost is only observed afterwards.
