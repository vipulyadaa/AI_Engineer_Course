# Tokens

> **Phase 04 · LLM FUNDAMENTALS · Topic 07**

## 1. Definition

The atomic units a model processes — typically subword pieces. They're the denomination of cost, context limits, and latency, which makes them the unit you actually budget in.

## 2. Simple Explanation

A token is usually a common word, a word fragment, a punctuation mark, or a space-plus-word.

Everything about an LLM system's economics is measured in tokens: you're billed per token, the context window is a token count, and generation latency scales with output tokens. Reasoning about any of it in words introduces a systematic error.

## 3. How It Works

**The rough English conversions:**

```
1 token   ≈ 4 characters
1 token   ≈ 0.75 words
1,000 tokens ≈ 750 words ≈ 1.5 pages
```

**Input vs. output tokens are priced and cost differently:**

| | Processed | Typical relative price | Bottleneck |
|---|---|---|---|
| **Input (prompt)** | In parallel during prefill | Lower | Compute |
| **Output (generated)** | One at a time during decode | Higher (often 3–5×) | Memory bandwidth |

**That asymmetry matters for optimization:** a long prompt is comparatively cheap; a long answer is comparatively expensive and slow. Capping `max_output_tokens` is often a bigger latency win than trimming the prompt.

## 4. Practical Example

**A RAG request's token budget:**

```
system prompt         400   input
conversation history 2,000  input
4 retrieved chunks    3,200  input
question                50   input
                     ──────
INPUT                 5,650

answer                 300   output

At $0.15/M input and $0.60/M output:
  input:  5,650 × $0.15/1M = $0.00085
  output:   300 × $0.60/1M = $0.00018
  total ≈ $0.001 per request

At 100,000 requests/day:  ~$100/day, ~$36,000/year
```

**Where the leverage is:**

```
Retrieved chunks are 3,200 of 5,650 input tokens — 57%.

Halving chunk count (4 → 2) via better reranking:
  saves ~1,600 input tokens/request
  ≈ 29% of input cost

Prompt caching on the 400-token system prompt:
  saves prefill on it every request after the first
  → both cost and TTFT

Those two are usually the highest-leverage cost levers in RAG.
```

**Counting tokens properly:**

```python
# Never estimate for anything that matters
import tiktoken
enc = tiktoken.get_encoding("cl100k_base")
n = len(enc.encode(text))

# Vertex AI exposes a count_tokens endpoint
# Always use the tokenizer for the model you're actually calling —
# counts are not portable across providers.
```

## 5. Why It Matters

- **Tokens are the unit of cost, context, and latency** — you can't budget in words.
- **The input/output price asymmetry** determines which optimization to reach for.
- **In RAG, retrieved chunks dominate input tokens**, which is where the cost lever is.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Estimating in words** | ~33% error in English, far more in other languages |
| **Ignoring the input/output asymmetry** | Output is typically 3–5× the price and the latency bottleneck |
| **Not capping `max_output_tokens`** | Unbounded latency and cost |
| **Assuming counts port across providers** | Different tokenizers, different counts |
| **Forgetting output in the context budget** | Prompt + output must both fit the window |
| **No cost monitoring per request** | Cost regressions go unnoticed until the bill |

**On monitoring:** log input and output token counts per request alongside the config version. That makes cost regressions attributable — a prompt change that adds 200 tokens is invisible until it's multiplied by daily volume, and you want to catch it at deploy time rather than at month end.

**On the multilingual dimension:** the same request in Hindi or Thai can cost 2–3× more tokens than in English. In a multilingual product that's both a cost projection issue and a fairness one worth surfacing.

## 7. Interview Answer

> "Tokens are the atomic units a model processes — subword pieces, roughly four characters or three-quarters of a word in English. They matter because everything about an LLM system's economics is denominated in them: billing, context limits, and latency. Reasoning in words introduces about a third of error in English and much more in other languages.
>
> The asymmetry I'd emphasize is input versus output. Input tokens are processed in parallel during prefill, so they're comparatively cheap — typically a third to a fifth the price. Output tokens are generated one at a time during decode, which is memory-bandwidth-bound, so they're both more expensive and the latency bottleneck. That means capping max output tokens is often a bigger latency win than trimming the prompt, which is the opposite of most people's instinct.
>
> For a RAG request, the budget typically looks like four hundred tokens of system prompt, a couple thousand of history, three thousand of retrieved chunks, and a short question — so retrieved chunks are often more than half the input. That's where the cost lever is. Halving chunk count through better reranking saves roughly thirty percent of input cost per request, and prompt caching on the fixed system prompt saves both cost and time-to-first-token on every request after the first.
>
> At a hundred thousand requests a day that's the difference between a thirty-six-thousand-dollar annual bill and something meaningfully smaller.
>
> Two practical points. Always count with the actual tokenizer for the model you're calling — counts aren't portable across providers. And log input and output token counts per request with the config version, so a prompt change that quietly adds two hundred tokens is caught at deploy rather than at month end."

## 8. Likely Follow-ups

**Q: How do you estimate token count?**
Roughly four characters or 0.75 words per token in English, but for anything that matters I'd run the actual tokenizer — tiktoken for OpenAI-family models, or the provider's count-tokens endpoint. Counts vary by content type and don't transfer between providers.

**Q: Why are output tokens more expensive than input?**
Because they're generated sequentially during decode, which is memory-bandwidth-bound — each token requires reading all model weights to do little arithmetic. Input tokens are processed in parallel during prefill, which is compute-bound and much better utilized. The pricing reflects the underlying cost structure.

**Q: Where's the biggest cost lever in a RAG system?**
Retrieved context, which is usually more than half the input tokens. Fewer and better chunks via reranking cuts it directly. After that, prompt caching on the fixed system prompt, which eliminates re-prefilling it on every request. Both also improve latency, so they're not pure cost trades.

**Q: How do you avoid runaway costs?**
Cap `max_output_tokens`, since output is the expensive and slow half. Log token counts per request with a config version so regressions are attributable. Set per-user or per-tenant budgets. And monitor cost per request as a tracked metric rather than discovering changes in the monthly bill.

**Q: Do token counts transfer between providers?**
No — each has its own tokenizer, so the same text yields different counts. That matters when comparing prices, because a lower per-token price with a less efficient tokenizer may not actually be cheaper. I'd compare on cost-per-request with real text rather than on headline per-token pricing.

## 9. Common Mistakes

- Estimating cost in words rather than tokens.
- Ignoring that output tokens cost several times more than input.
- Not capping `max_output_tokens`.
- Comparing providers on per-token price without accounting for tokenizer efficiency.
- Not logging token counts per request, so cost regressions surface in the bill.

## 10. What to Remember

- **~4 characters / ~0.75 words per token in English.** Use the real tokenizer for anything that matters.
- **Output tokens cost 3–5× input and are the latency bottleneck.** Cap `max_output_tokens`.
- **In RAG, retrieved chunks are usually >50% of input** — the main cost lever.
- **Prompt caching on a fixed system prompt** saves cost and TTFT on every request after the first.
- **Log token counts per request with a config version** so cost regressions are attributable.
