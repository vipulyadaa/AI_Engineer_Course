# Generation

> **Phase 08 · RAG FUNDAMENTALS · Topic 18**

## 1. Definition

The final stage: the LLM produces an answer from the assembled context. It's the stage you control least — the model is hosted and its weights are fixed — which is exactly why quality work concentrates upstream in retrieval.

## 2. Simple Explanation

Everything before this point was about putting the right information in front of the model. Generation is the model reading it and writing an answer.

The realistic framing: the model will mostly do what the context and instructions support. When generation fails, the cause is usually that the context didn't contain the answer, or the instructions didn't constrain the model enough — not that the model is bad.

## 3. How It Works

1. **Send the prompt** — instructions, context, question.
2. **The model generates** token by token, conditioned on all of it.
3. **Decoding parameters shape the output:**

| Parameter | For RAG |
|---|---|
| `temperature` | **0 to 0.2.** Factual retrieval answers should be deterministic |
| `max_output_tokens` | Cap it — decode time and cost scale directly with output length |
| `top_p` / `top_k` | Leave at defaults when temperature is near 0 |
| `stop sequences` | Useful for structured output formats |

4. **Stream** the response — it doesn't reduce total time but makes time-to-first-token the perceived latency.
5. **Post-process** — resolve citation numbers to source URIs, validate format, run groundedness checks.

**Temperature 0 is the right default for RAG** and it's a surprisingly common mistake to leave it at 0.7. You want the same question to produce the same answer, and you want the model conservative rather than creative with facts.

## 4. Practical Example

**Generation failure modes, and which are actually generation problems:**

```
Symptom                              Real cause              Fix where
────────────────────────────────────────────────────────────────────────
Answer is wrong, context had         generation              prompt / model
the right fact

Answer is wrong, context lacked      RETRIEVAL               upstream
the fact

Answer paraphrases $45 as            generation              prompt: "quote
"about forty dollars"                                        exact figures"

Model answers an out-of-scope        generation              prompt: abstention
question confidently                                         clause

Answer cites source [2] but [2]      generation              groundedness check
doesn't support the claim                                    + citation validation

Answer contradicts itself across     context construction    dedupe + conflict
paragraphs                                                   handling
```

**Only two of those six are fixed at the generation stage.** That distribution is the point.

**Streaming and perceived latency:**

```
Non-streaming:  user waits 4.2s, sees the whole answer
Streaming:      user sees first token at 0.8s, reads as it generates

Same total time. Very different experience.
```

## 5. Why It Matters

- **It's the stage you control least**, which is why over-investing here and under-investing in retrieval is the classic mistake.
- **Decoding parameters are a quick, real lever** — temperature 0 for factual answers.
- **Post-generation validation is where groundedness is actually enforced**, not in the prompt alone.

## 6. Trade-offs / Failure Modes

| Failure | Detail | Fix |
|---|---|---|
| **Hallucination despite context** | Model fills gaps or blends parametric knowledge | Abstention instruction; groundedness check; lower temperature |
| **Ignoring provided context** | Especially when the model has strong priors on the topic | Explicit grounding instruction; check citations |
| **Wrong citations** | Cites a source that doesn't support the claim | Validate citations post-hoc against chunk text |
| **Temperature too high** | Non-deterministic factual answers | Set to 0 for RAG |
| **Unbounded output** | Latency and cost scale with length | Cap `max_output_tokens` |
| **Model version changed** | Quality shifts with no code change | Pin versions; run a golden eval set on every provider update |
| **Over-long answers** | Users don't read them; cost rises | Instruct concision; cap tokens |

**On model choice:** a bigger model is not always better for RAG. When the context contains the answer clearly, a smaller, faster, cheaper model often performs comparably — the hard work was done by retrieval. Measure on your own eval set before paying for the largest model.

## 7. Interview Answer

> "Generation is the LLM producing an answer from the assembled context. It's the stage I control least — hosted model, fixed weights — which is exactly why the engineering effort belongs upstream in retrieval.
>
> The parameters that matter: temperature at zero or near zero, because factual retrieval answers should be deterministic and I don't want the model being creative with figures. Cap max output tokens, since decode time and cost scale directly with output length. And stream, which doesn't reduce total time but makes time-to-first-token the perceived latency, and that's what users judge.
>
> The framing I'd emphasize is diagnostic. When a RAG answer is wrong, most of the time it's not a generation problem. If the context didn't contain the fact, that's retrieval. If the answer contradicts itself, that's usually duplicate or conflicting chunks from context construction. Only a few failure modes are genuinely generation — the model ignoring context it was given, paraphrasing exact figures, or answering an out-of-scope question confidently. Those are fixed with prompt instructions.
>
> The thing I'd add is post-generation validation. The grounding instruction in the prompt is a request, not a guarantee. I'd verify by checking that every cited source actually supports the claim it's attached to, and measure groundedness as an ongoing metric rather than assuming the instruction worked.
>
> And I'd push back on the assumption that a bigger model is better here. When retrieval put a clear answer in the context, a smaller and faster model often performs comparably — the hard work was already done."

## 8. Likely Follow-ups

**Q: What temperature for RAG?**
Zero, or very close to it. The task is extracting and synthesizing facts from provided context, not creative writing. Determinism also makes the system testable — the same question and context should give the same answer, which you need for regression testing. I'd only raise it for tasks where varied phrasing is genuinely desirable.

**Q: The model hallucinated even with correct context. What do you do?**
First confirm it — check whether the context actually contained a clear answer or only a partial one, because partial context invites gap-filling. Then strengthen the prompt: explicit grounding, abstention clause, and a citation requirement, since requiring a source per claim makes unsupported claims visible. Then measure groundedness on the output as a running metric. If it persists, it may be a model choice issue, or a case where the retrieved context is ambiguous enough that the model is resolving it badly.

**Q: Do you need the biggest model?**
Usually not. When retrieval has put a clear answer in the context, the generation task is comprehension and synthesis rather than recall, and smaller models do that well. I'd benchmark a couple of tiers on my own eval set — the cost and latency difference is large and the quality difference is often small. A cascade also works: small model by default, escalate to a larger one when the small one abstains or the question is flagged complex.

**Q: How do you validate citations?**
After generation, map each cited number back to its chunk and check the claim is actually supported by that text. That can be a string-overlap heuristic for quoted figures, or an LLM judge for semantic support. Citations that don't check out are a groundedness failure and worth logging and alerting on, because a plausible answer with a wrong citation is more dangerous than an obvious error.

**Q: How do you handle latency?**
Stream, so time-to-first-token is what users experience. Reduce input tokens by retrieving fewer, better chunks — prefill time scales with prompt length. Cap output length. Use prompt caching for a long stable system prefix. And consider a smaller model, since generation is usually the largest component of total latency in a RAG request.

## 9. Common Mistakes

- Leaving temperature at 0.7 for factual answers.
- Debugging generation when the context never contained the answer.
- Assuming the grounding instruction worked without measuring groundedness.
- Not validating that citations actually support their claims.
- Defaulting to the largest model without benchmarking a smaller one.

## 10. What to Remember

- **The stage you control least** — invest upstream in retrieval instead.
- **Temperature 0** for RAG. Cap output tokens. Stream.
- **Most "generation" failures are retrieval failures.** Diagnose which before fixing.
- **Validate citations post-hoc** — the prompt instruction is a request, not a guarantee.
- **Bigger isn't automatically better** when the context already contains the answer.
