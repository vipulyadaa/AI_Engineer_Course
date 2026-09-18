# Tokenization

> **Phase 04 · LLM FUNDAMENTALS · Topic 06**

## 1. Definition

Converting text into the discrete units a model processes. Modern LLMs use **subword tokenization** — typically Byte-Pair Encoding — which splits text into pieces between characters and whole words.

## 2. Simple Explanation

Models don't see text; they see integers. Tokenization is the mapping.

Subword tokenization is the compromise between two bad extremes: character-level gives tiny vocabularies but very long sequences, and word-level gives short sequences but can't handle any word it hasn't seen. Subwords handle unknown words by decomposing them.

## 3. How It Works

**Byte-Pair Encoding, the dominant approach:**

```
1. Start with individual bytes/characters as the vocabulary
2. Count all adjacent pairs in the training corpus
3. Merge the most frequent pair into a new token
4. Repeat until the vocabulary reaches the target size (~50k-200k)

Result: common words become single tokens; rare words
decompose into subword pieces.
```

```
"international"  → ["international"]        1 token  (common)
"unhelpfulness"  → ["un", "help", "ful", "ness"]  4 tokens (rare)
"AC-4471-B"      → ["AC", "-", "44", "71", "-", "B"]  6 tokens
```

**The rough English rule:** ~4 characters per token, or ~0.75 tokens per word. Useful for estimating cost and context usage quickly.

## 4. Practical Example

**Tokenization efficiency varies enormously by language:**

```
Same meaning, different token counts:

English:   "The account balance is insufficient"     ~6 tokens
Spanish:   "El saldo de la cuenta es insuficiente"   ~9 tokens
Hindi (Devanagari)                                   ~15-20 tokens
Thai                                                 ~20+ tokens

Tokenizers are trained predominantly on English text, so
non-English text fragments into more tokens.

Consequence: the same request costs 2-3× more in some
languages, and consumes context faster. That's a real
fairness and cost issue in a multilingual product.
```

**Why LLMs are bad at character-level tasks:**

```
"How many r's in 'strawberry'?"

The model sees:  ["str", "aw", "berry"]
It does NOT see individual characters.

Asking it to count letters is asking it to reason about
something below its input granularity. This is a tokenization
artifact, not a reasoning failure — and the same reason
models struggle with reversing strings or exact character edits.
```

**Practical implications you'll hit:**

| Issue | Detail |
|---|---|
| **Cost is per token, not per word** | Estimate with the tokenizer, not word count |
| **Chunk size in tokens** | Embedding input limits are token-denominated |
| **Numbers tokenize inconsistently** | "4471" may be one token or several; affects arithmetic |
| **Leading spaces matter** | `" the"` and `"the"` are different tokens |
| **Different models, different tokenizers** | Token counts aren't portable across providers |

## 5. Why It Matters

- **Cost, context limits, and chunk sizing are all token-denominated** — you can't reason about any of them in words.
- **It explains a whole class of "why is the model bad at this"** questions mechanically.
- **The multilingual cost disparity** is a real product concern and a good thing to raise unprompted.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Estimating cost in words** | Off by ~33% in English, much more in other languages |
| **Chunk size in characters** | Embedding limits are in tokens; character-to-token ratio varies |
| **Character-level tasks** | Below the model's input granularity |
| **Inconsistent number tokenization** | Contributes to arithmetic unreliability |
| **Cross-provider token counts** | Different tokenizers give different counts for the same text |
| **Glitch tokens** | Rare tokens seen almost never in training can produce erratic behavior |

**On glitch tokens:** some tokens exist in the vocabulary but appear almost never in the training corpus — often artifacts of the tokenizer's training data. Models can behave erratically when they appear. It's a curiosity rather than a common production issue, but it illustrates that the vocabulary and the training distribution aren't perfectly aligned.

**On numbers:** inconsistent tokenization of digits is part of why LLM arithmetic is unreliable — "1234" might be one token or four, and the model has no consistent positional representation of digits. Some newer tokenizers split numbers digit-by-digit specifically to help.

## 7. Interview Answer

> "Tokenization converts text into the discrete units a model processes. Modern LLMs use subword tokenization, typically Byte-Pair Encoding, which sits between character-level and word-level.
>
> BPE starts with characters and repeatedly merges the most frequent adjacent pair until it reaches the target vocabulary size. So common words become single tokens and rare words decompose into pieces — which means there's no out-of-vocabulary problem, since anything can be built from smaller units.
>
> The practical consequences matter a lot. Cost is per token, not per word — roughly four characters per token in English, so estimating in words is off by about a third. Chunk sizes and embedding input limits are token-denominated, so measuring chunks in characters gives you a ratio that varies by content type. And token counts aren't portable across providers, since each has its own tokenizer.
>
> The disparity I'd raise unprompted is multilingual. Tokenizers are trained predominantly on English, so the same meaning in Hindi or Thai can take two to three times as many tokens. That means the same request costs more and consumes context faster in those languages — a real fairness and cost issue in a multilingual product.
>
> Tokenization also explains a class of apparent reasoning failures. Asking how many r's are in 'strawberry' — the model sees three subword tokens, not individual characters. It's being asked to reason below its input granularity. Same for reversing strings or exact character edits. That's an artifact, not a reasoning failure, and knowing the difference matters when deciding whether a task is suitable for an LLM at all.
>
> And inconsistent number tokenization is part of why arithmetic is unreliable — a number might be one token or several, so there's no consistent positional representation of digits."

## 8. Likely Follow-ups

**Q: What is Byte-Pair Encoding?**
Start with characters as the vocabulary, count adjacent pairs across the corpus, merge the most frequent pair into a new token, and repeat until reaching the target vocabulary size. Common sequences become single tokens; rare ones decompose. It eliminates out-of-vocabulary problems because anything can be built from smaller pieces.

**Q: How many tokens is a word?**
Roughly 0.75 tokens per word in English, or about four characters per token. But it varies substantially by content — code, rare words, and non-Latin scripts tokenize much less efficiently. For anything that matters, run the actual tokenizer rather than estimating.

**Q: Why do LLMs struggle to count letters in a word?**
Because they don't see letters. "Strawberry" is a few subword tokens, and counting characters means reasoning below the model's input granularity. It's a tokenization artifact rather than a reasoning failure, and the same explanation covers string reversal and exact character editing.

**Q: Why does tokenization cost more for some languages?**
Tokenizers are trained predominantly on English text, so English words are efficiently merged into single tokens while other scripts fragment into many. The same meaning can cost two to three times as many tokens in Hindi or Thai — which means higher cost and faster context consumption for those users.

**Q: Does tokenization affect chunking in RAG?**
Directly. Embedding model input limits are in tokens, so if you chunk by character count you get a token count that varies with content type — and exceeding the limit causes silent truncation. I'd measure chunk size with the actual tokenizer, and verify chunks stay under the embedding model's limit.

## 9. Common Mistakes

- Estimating cost or context usage in words rather than tokens.
- Measuring chunk size in characters when limits are in tokens.
- Treating character-level failures as reasoning failures.
- Assuming token counts transfer across providers.
- Not accounting for multilingual token inflation in cost projections.

## 10. What to Remember

- **Subword tokenization (BPE)** — common words whole, rare words decomposed, no OOV problem.
- **~4 chars / ~0.75 tokens per word in English.** Use the real tokenizer for anything that matters.
- **Non-English costs 2–3× more tokens** — a real cost and fairness issue.
- **Character-level tasks are below input granularity** — a tokenization artifact, not a reasoning failure.
- **Chunk sizes and embedding limits are in tokens**, not characters.
