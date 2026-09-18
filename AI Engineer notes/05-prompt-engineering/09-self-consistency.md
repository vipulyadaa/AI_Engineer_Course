# Self-Consistency

> **Phase 05 · PROMPT ENGINEERING · Topic 09**

## 1. Definition

Generating several independent reasoning paths at nonzero temperature and taking the majority final answer. It improves reliability on reasoning tasks by marginalizing over reasoning paths rather than trusting a single one.

## 2. Simple Explanation

A single chain-of-thought can go wrong at any step, and once it does, everything after it follows the error.

Self-consistency runs the reasoning several times independently. Different paths make different mistakes; the correct answer tends to be the one several paths converge on.

## 3. How It Works

```
1. Same prompt, N times, at temperature ~0.7
2. Each run produces its own reasoning path and final answer
3. Take the MAJORITY final answer
   (the reasoning paths are discarded; only answers are voted)
```

```
Q: Is our current wire fee higher than last year's?

path 1 → $45 now, $40 then → "Yes, $5 higher"
path 2 → $45 now, $40 then → "Yes, $5 higher"
path 3 → $45 now, $45 then → "No, unchanged"      ← retrieval slip
path 4 → $45 now, $40 then → "Yes, $5 higher"
path 5 → $45 now, $40 then → "Yes, $5 higher"

majority: "Yes, $5 higher"  (4/5)
```

**Why temperature must be nonzero:** at temperature 0 all N paths are identical, so the vote is meaningless. Diversity across paths is the entire mechanism.

## 4. Practical Example

**The cost, which determines where it's viable:**

```
N = 5 paths, each with chain-of-thought reasoning

  5× the generation cost
  5× the output tokens
  latency: parallel → ~1 path's time; sequential → 5×

So: run them in parallel, and reserve it for questions
where the cost is justified.
```

**When it's worth it:**

| Situation | Worth it? |
|---|---|
| Multi-step reasoning where errors compound | ✅ Yes |
| High-stakes answers (regulatory, financial figures) | ✅ Yes |
| Answers feeding an automated downstream action | ✅ Yes |
| Direct factual lookup from context | ❌ Paths will be identical anyway |
| High-volume routine queries | ❌ 5× cost for marginal gain |

**The disagreement signal is underused:**

```
If 3 paths say "$45" and 2 say "$40", that's not just a vote —
it's an UNCERTAINTY signal.

  strong agreement (5/5)  → high confidence, return
  weak agreement  (3/5)   → flag for review, or abstain,
                            or escalate to a larger model

Using the vote distribution as a confidence estimate is more
valuable than using it only to pick a winner. And an LLM's
stated confidence is poorly calibrated, so this is a better
uncertainty signal than asking the model how sure it is.
```

**Aggregating non-categorical answers:**

```
Majority voting needs comparable answers. For free-text
responses, options are:

· extract the key figure or entity and vote on THAT
· embed the answers and cluster, take the largest cluster
· have a judge model pick the most-supported answer

The first is cleanest when the answer contains a specific
figure, which in banking it usually does.
```

## 5. Why It Matters

- **It's the natural extension of chain-of-thought**, and knowing the temperature requirement shows you understand the mechanism.
- **The disagreement-as-uncertainty signal** is the more valuable half and is frequently overlooked.
- **The N× cost** makes selective application the only sensible deployment.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Temperature 0** | All paths identical; the vote is meaningless |
| **Applied universally** | N× cost on queries that don't need it |
| **Sequential execution** | N× latency instead of ~1× |
| **Free-text answers** | Majority voting needs comparable outputs |
| **Systematic errors** | If all paths share a wrong premise, they agree on the wrong answer |
| **Ignoring the disagreement signal** | Wasting the most useful output |

**On systematic errors:** self-consistency corrects *random* reasoning errors, not systematic ones. If the retrieved context is wrong or missing a key fact, all five paths reason correctly from bad evidence and agree on a wrong answer. It's a reasoning-reliability technique, not a grounding technique — so it doesn't substitute for fixing retrieval.

**On N:** three to five paths captures most of the benefit. Beyond that returns diminish while cost scales linearly.

## 7. Interview Answer

> "Self-consistency generates several independent reasoning paths at nonzero temperature and takes the majority final answer. It improves reliability by marginalizing over reasoning paths rather than trusting one.
>
> The mechanism requires nonzero temperature — at zero, all N paths are identical and the vote is meaningless. Diversity across paths is the entire point. Typically around 0.7 with three to five paths, which captures most of the benefit before returns diminish.
>
> The cost is N times generation and N times output tokens, so I'd run the paths in parallel to keep latency at roughly one path's time, and reserve it for questions where the cost is justified — multi-step reasoning, high-stakes figures, or answers feeding an automated action. For direct factual lookups the paths would be identical anyway and it's pure waste.
>
> The part I'd emphasize as underused is the disagreement signal. If three paths say forty-five dollars and two say forty, that isn't just a vote to resolve — it's an uncertainty estimate. Strong agreement means return with confidence; weak agreement means flag for review, abstain, or escalate to a larger model. That's more valuable than using the vote only to pick a winner, and it's a better uncertainty signal than asking the model how confident it is, because stated confidence is poorly calibrated.
>
> One limitation I'd be clear about: it corrects random reasoning errors, not systematic ones. If the retrieved context is wrong or missing a key fact, all five paths reason correctly from bad evidence and agree on a wrong answer. It's a reasoning-reliability technique, not a grounding technique — it doesn't substitute for fixing retrieval.
>
> And for free-text answers, majority voting needs comparable outputs. In banking the answer usually contains a specific figure, so extracting that and voting on it is the cleanest aggregation."

## 8. Likely Follow-ups

**Q: Why does temperature need to be nonzero?**
Because at temperature 0 every path is identical — greedy decoding gives the same output every time — so the majority vote is over N copies of one answer and provides no information. Diversity across paths is the mechanism; without it there's nothing to marginalize over.

**Q: How many paths?**
Three to five captures most of the benefit. Returns diminish beyond that while cost scales linearly in N, so more paths buy progressively less. Five is a reasonable default for high-stakes queries; three is often enough.

**Q: What does it cost?**
N times generation and N times output tokens, which are the expensive half. Latency can stay near one path's time if you run them in parallel — sequential execution would be N times slower, which is usually unacceptable. That cost is why selective application matters.

**Q: What's the most useful output besides the majority answer?**
The disagreement. The vote distribution is an uncertainty estimate — strong agreement means confidence, weak agreement means flag for review, abstain, or escalate. That's more useful than the vote itself, and it's a better-calibrated uncertainty signal than asking the model how confident it is.

**Q: What doesn't it fix?**
Systematic errors. If the retrieved context is wrong or missing a key fact, all paths reason correctly from bad evidence and converge on the wrong answer. Self-consistency corrects random reasoning errors, not bad premises — so it's a reasoning-reliability technique rather than a substitute for fixing retrieval.

## 9. Common Mistakes

- Running it at temperature 0, making the vote meaningless.
- Applying it universally rather than to high-stakes queries.
- Running paths sequentially, incurring N× latency.
- Using only the majority and discarding the disagreement signal.
- Expecting it to correct errors caused by bad retrieved context.

## 10. What to Remember

- **N reasoning paths at nonzero temperature; majority final answer.**
- **Temperature must be > 0** or all paths are identical and the vote is empty.
- **N× cost** — run in parallel and reserve it for high-stakes queries.
- **Disagreement is an uncertainty signal**, and it's the more valuable output.
- **Corrects random errors, not systematic ones** — bad context still produces agreed-wrong answers.
