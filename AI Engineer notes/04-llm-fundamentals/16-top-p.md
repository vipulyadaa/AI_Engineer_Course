# Top-p (Nucleus) Sampling

> **Phase 04 · LLM FUNDAMENTALS · Topic 16**

## 1. Definition

Keeping the smallest set of top-probability tokens whose cumulative probability reaches a threshold `p`, then sampling from that set. Because the set size adapts to the distribution's shape, it's the standard sampling method.

## 2. Simple Explanation

Instead of "keep the best 50 tokens," top-p says "keep as many tokens as it takes to cover 90% of the probability."

When the model is confident, that's one token. When it's uncertain, it might be forty. The candidate set adapts to the model's own confidence, which is exactly what a fixed count can't do.

## 3. How It Works

```
1. Sort tokens by probability, descending
2. Accumulate until the running sum ≥ p
3. Discard everything after that
4. Renormalize and sample
```

**The adaptivity, which is the entire argument:**

```
p = 0.9

CONFIDENT: "The capital of France is"
   Paris 0.98  →  cumulative 0.98 ≥ 0.9 after ONE token
   → nucleus = {Paris}

UNCERTAIN: "My favourite colour is"
   blue 0.08, red 0.07, green 0.06, ... 
   → needs ~40 tokens to reach 0.9
   → nucleus = 40 tokens

Same p. Candidate set of 1 vs. 40. The threshold adapts.
```

**Compared to top-k:**

| | Top-k | Top-p |
|---|---|---|
| Criterion | Fixed count | Cumulative mass |
| Adapts to confidence | No | **Yes** |
| On a peaked distribution | Admits junk | Keeps ~1 |
| On a flat distribution | May cut good options | Keeps many |

## 4. Practical Example

**Typical values:**

```
p = 1.0    no filtering; pure sampling from the full distribution
p = 0.95   common default; slight tail trimming
p = 0.9    moderate; a reasonable general setting
p = 0.7    conservative; noticeably more focused
p → 0      approaches greedy
```

**For a RAG system:**

```
Temperature 0 → top-p is irrelevant.
Greedy decoding takes the argmax and ignores distribution shape.

So the configuration is simply:
  temperature = 0

If the provider requires nonzero temperature:
  temperature = 0.1, top_p = 0.9, top_k = 50 (as a bound)
```

**The default trap:**

```
Many APIs default to temperature 0.7 and top_p 0.95.

For a factual banking assistant that's wrong on both counts —
it produces non-deterministic answers about money. It should
be explicitly overridden rather than inherited, and "we left
the defaults" is not a defensible answer in a launch review.
```

**Where top-p genuinely helps:**

```
Self-consistency prompting: generate N reasoning paths at a
moderate temperature and top-p, then take the majority answer.

Here you WANT diversity across samples — the whole method
depends on the paths differing. Temperature ~0.7 with
top_p 0.9 is a sensible configuration for that.
```

## 5. Why It Matters

- **It's the standard sampling method**, so knowing why it beat top-k is expected.
- **The adaptivity argument** is the substantive point, not the formula.
- **Knowing it's irrelevant at temperature 0** shows you understand the pipeline order.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Inheriting API defaults** | 0.7 temperature / 0.95 top-p is wrong for factual tasks |
| **Tuning top-p and temperature together** | They interact; change one at a time |
| **Setting top-p at temperature 0** | No effect |
| **p too low** | Output becomes repetitive and bland |
| **p = 1.0 without a top-k bound** | Rare junk tokens can be sampled |
| **Expecting it to fix grounding** | That's a retrieval or prompt problem |

**Order of operations:** temperature scales the logits first, then top-k filters by count, then top-p filters by cumulative mass over what survives, then sampling. So top-p operates on the *post-temperature* distribution — raising temperature flattens it, which means top-p admits more tokens. That interaction is why tuning both simultaneously makes results hard to attribute.

**On min-p, a newer alternative:** keep tokens whose probability is at least some fraction of the top token's probability. It adapts like top-p but is arguably more principled on very peaked distributions. Worth knowing it exists; top-p remains the standard.

## 7. Interview Answer

> "Top-p, or nucleus sampling, keeps the smallest set of top-probability tokens whose cumulative probability reaches a threshold, then samples from that set.
>
> The reason it became standard is adaptivity. Top-k uses a fixed count, which can't match how confident the model is. After 'the capital of France is,' one token holds nearly all the probability, so a k of fifty admits forty-nine junk candidates. After 'my favourite colour is,' fifty is about right. Top-p with a threshold of 0.9 keeps one token in the first case and about forty in the second — same setting, and the candidate set adapts to the model's own confidence.
>
> For a RAG system though, the answer is that temperature zero makes it irrelevant. Greedy decoding takes the argmax and ignores distribution shape entirely, so top-p and top-k have no effect. The configuration is just temperature zero.
>
> The trap worth naming is defaults. Many APIs ship with temperature 0.7 and top-p 0.95, which for a factual banking assistant is wrong on both counts — it produces non-deterministic answers about money. That should be explicitly overridden, and 'we left the defaults' isn't a defensible answer in a launch review.
>
> Where top-p genuinely earns its place is when you *want* diversity. Self-consistency prompting generates several reasoning paths and takes the majority answer, and the whole method depends on the paths differing — so moderate temperature with top-p around 0.9 is right there.
>
> On ordering: temperature scales logits first, then top-k, then top-p over what survives. So top-p operates on the post-temperature distribution — raising temperature flattens it, which makes top-p admit more tokens. That interaction is why I'd tune one at a time."

## 8. Likely Follow-ups

**Q: Why is top-p better than top-k?**
Adaptivity. Top-k's fixed count can't match the distribution's shape — it admits junk when the model is confident and cuts good options when it isn't. Top-p keeps as many tokens as it takes to reach a probability threshold, so the candidate set size adapts to the model's own confidence.

**Q: What's a good top-p value?**
0.9 to 0.95 for general generation. Lower is more focused and can become repetitive; 1.0 disables filtering entirely and occasionally samples genuine junk from the tail. But for factual tasks the question is moot, because temperature 0 makes top-p irrelevant.

**Q: How do temperature and top-p interact?**
Temperature is applied to logits first, so top-p operates on the post-temperature distribution. Raising temperature flattens the distribution, which means top-p admits more tokens — so they compound. That's why tuning both simultaneously makes results hard to attribute, and I'd change one at a time.

**Q: When do you actually want sampling diversity?**
When the method depends on it. Self-consistency prompting generates multiple reasoning paths and takes the majority answer — if all paths were identical the method would do nothing. Also brainstorming and creative generation. For factual retrieval answering, diversity is purely a liability.

**Q: What is min-p?**
A newer alternative that keeps tokens whose probability is at least some fraction of the top token's probability. It adapts like top-p and is arguably better-behaved on very peaked distributions, where top-p can still admit a long thin tail. Worth knowing it exists; top-p remains the standard and the one providers expose.

## 9. Common Mistakes

- Inheriting API defaults for factual tasks.
- Tuning temperature and top-p together.
- Setting top-p at temperature 0, where it has no effect.
- Setting p very low and getting repetitive output.
- Expecting sampling parameters to fix a grounding problem.

## 10. What to Remember

- **Smallest set of tokens whose cumulative probability reaches p.** Sample from that.
- **Adaptivity is the argument** — one token when confident, forty when not.
- **The standard sampling method**, having displaced top-k as a primary control.
- **Irrelevant at temperature 0** — greedy ignores distribution shape.
- **Override API defaults** — 0.7 / 0.95 is wrong for factual work.
