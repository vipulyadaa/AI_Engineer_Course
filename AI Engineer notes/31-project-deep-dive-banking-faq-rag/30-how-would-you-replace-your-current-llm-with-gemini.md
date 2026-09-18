# "How Would You Replace Your Current LLM with Gemini?"

> **Phase 31 · PROJECT DEEP DIVE · Topic 30**

## 1. Definition

A migration question about swapping the generation model. The distinguishing insight is that a model swap is not a drop-in change — prompts are tuned to a model family, and the failure is quiet behavioural drift rather than errors.

## 2. Simple Explanation

Changing the model changes the API call, which is an afternoon. It also changes how the model follows instructions, formats output, and decides when to refuse — which is the actual work.

Nothing errors. The answers just come out differently, and the differences that matter are small.

## 3. How It Works

```
THE MIGRATION

1. BASELINE     run the golden set on the current model,
                record per-category scores. Without this
                there's nothing to compare to.
2. PORT         swap the API call; behaviour unchanged
                expectation is wrong, but start here
3. EVALUATE     same golden set, same judge, same index
4. DIAGNOSE     where did it differ, and why
5. RE-TUNE      adjust the prompt for the new family
6. SHADOW       run both on live traffic, compare, serve
                only the old one
7. CANARY       small traffic share, per-category
                monitoring
8. CUT OVER     with the old path still available
```

**Steps 1 and 6 are what make this safe.** Everything else is mechanics.

## 4. Practical Example

**What actually differs between model families:**

```
INSTRUCTION ADHERENCE
  a prompt saying "answer in two sentences" is honoured
  differently — one family treats it as a strong
  constraint, another as a suggestion

REFUSAL BEHAVIOUR
  the abstention rule may fire more or less readily.
  A model that abstains more is SAFER and LESS USEFUL,
  and that shift won't appear in groundedness at all —
  only in coverage.

OUTPUT FORMAT
  citation formatting, markdown habits, preambles like
  "Based on the provided context..." which you then have
  to instruct away

VERBOSITY
  directly changes cost and latency, and shifts
  LLM-as-judge scores because judges favour longer
  answers — so a verbosity change can look like a
  quality change

SAFETY FILTERING
  Vertex AI applies configurable safety filters. Banking
  content — fraud, disputes, debt collection — can trip
  them. A blocked response has a distinct finish reason
  and must be handled, not treated as a normal answer.
```

**Gemini-specific things worth naming:**

```
SYSTEM INSTRUCTION   a distinct field, not a message
                     turn — worth using properly rather
                     than prepending to the prompt
LONG CONTEXT         a large window invites passing more
                     chunks; resist it. Retrieval
                     precision still governs quality, and
                     input tokens still dominate cost
CONTEXT CACHING      for a long stable system instruction,
                     a real cost reduction
SAFETY SETTINGS      explicitly configured, per category,
                     with the blocked case handled
GROUNDING            built-in grounding options exist, and
                     for a private corpus your own
                     retrieval is still the right design
```

**The evaluation that matters most:** run the unanswerable half of the golden set. Abstention behaviour is the thing most likely to shift and least likely to be noticed, because a model that refuses more looks fine on every quality metric while quietly becoming less useful. Coverage — what proportion of answerable questions got answered — is the metric that catches it.

## 5. Why It Matters

- **Prompts are tuned to a family** — a swap needs re-tuning, not copying.
- **Abstention drift is invisible** to quality metrics; coverage catches it.
- **Shadow mode before canary** gives comparison without user risk.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Treating it as a drop-in swap | Quiet behavioural drift in production |
| No baseline before switching | Nothing to compare against |
| Not testing abstention | The useful/safe balance shifts unnoticed |
| Ignoring safety filter blocks | Blocked responses handled as normal answers |
| Passing more chunks because the window is big | Cost rises, precision doesn't |
| Comparing with a different judge model | The comparison measures the judge |

**On the judge:** if evaluation uses LLM-as-judge, keep the judge model fixed across the comparison and prefer a judge from a different family than either candidate. A judge evaluating its own family's output is biased toward it, and that bias is exactly the size of the difference you're trying to measure.

**On what "better" means:** a model can score higher on groundedness and be worse for the product if it's more verbose, slower, and refuses more. The comparison has to include latency, cost per query, verbosity, and coverage alongside quality — otherwise you're optimizing one number and regressing three.

## 7. Interview Answer

> "The framing I'd start with is that this isn't a drop-in swap. Changing the API call is an afternoon. Changing how the model follows instructions, formats output, and decides when to refuse is the actual work — and none of it errors. The answers just come out differently, and the differences that matter are small enough to miss.
>
> So step one is a baseline: run the golden set on the current model and record per-category scores, before touching anything. Without that there's nothing to compare against and the migration becomes an opinion.
>
> Then port the call, re-evaluate on the same golden set with the same judge and the same index, and diagnose the differences.
>
> What actually differs between families: instruction adherence — a prompt saying answer in two sentences is treated as a hard constraint by one family and a suggestion by another. Output format, including preambles like 'based on the provided context' that you then have to instruct away. Verbosity, which changes cost and latency directly and also shifts LLM-as-judge scores, because judges favour longer answers — so a verbosity change can masquerade as a quality change.
>
> And refusal behaviour, which is the one I'd test hardest. If the new model abstains more readily, it's safer and less useful, and that shift doesn't appear in groundedness at all — groundedness only scores the answers it did give. The metric that catches it is coverage: what proportion of answerable questions actually got answered. So I'd run the unanswerable half of the golden set specifically, because abstention is the most likely thing to shift and the least likely to be noticed.
>
> Gemini-specific points. The system instruction is a distinct field rather than a message turn, so it's worth using properly. Context caching for a long stable system instruction is a real cost reduction. Safety settings are configurable per category and need explicit configuration — banking content around fraud, disputes, and debt collection can trip them, and a blocked response has its own finish reason that has to be handled rather than treated as a normal answer.
>
> And a discipline point: a large context window invites passing more chunks, and I'd resist that. Retrieval precision still governs quality and input tokens still dominate cost, so the window being bigger isn't a reason to fill it.
>
> On rollout — shadow mode first. Run both models on live traffic, serve only the old one, and compare outputs on real queries rather than just the golden set. That surfaces the cases the golden set doesn't cover, with no user risk. Then a canary on a small traffic share with per-category monitoring, then cut over with the old path still available.
>
> Two cautions. Keep the judge model fixed across the comparison, and prefer a judge from a different family than either candidate — a judge evaluating its own family's output is biased toward it, and that bias is about the size of the difference you're trying to measure.
>
> And define better carefully. A model can score higher on groundedness and be worse for the product if it's more verbose, slower, and refuses more. The comparison has to cover latency, cost per query, verbosity, and coverage alongside quality — otherwise you optimize one number and regress three."

## 8. Likely Follow-ups

**Q: Why isn't it a drop-in swap?**
Prompts are tuned to a model family. Instruction adherence, refusal thresholds, output formatting, and verbosity all differ, and none of those produce errors — they produce quietly different answers.

**Q: What's the hardest difference to detect?**
Abstention drift. A model that refuses more is safer and less useful, and groundedness only scores the answers it gave — so quality metrics look fine. Coverage is the metric that catches it.

**Q: How would you roll it out?**
Shadow mode first — both models on live traffic, only the old one served, outputs compared. Then a canary with per-category monitoring, then cut over with the old path retained. Shadow gives real-traffic comparison at zero user risk.

**Q: What's the risk with LLM-as-judge here?**
Judging your own family's output. Keep the judge fixed across the comparison and prefer a different family from both candidates, because that bias is roughly the size of the difference being measured.

**Q: Does a bigger context window change the design?**
It shouldn't. Retrieval precision still determines quality and input tokens still dominate cost, so a larger window isn't a reason to pass more chunks. It's useful for a longer system instruction and for context caching.

## 9. Common Mistakes

- Copying prompts across families unchanged.
- No baseline measurement before switching.
- Not testing refusal and coverage behaviour.
- Ignoring safety-filter blocks as a distinct outcome.
- Using a judge from the candidate's own family.

## 10. What to Remember

- **Not a drop-in swap** — prompts are family-tuned.
- **Baseline first**, or there's nothing to compare.
- **Abstention drift hides from quality metrics** — measure coverage.
- **Shadow then canary** — real traffic, no user risk.
- **"Better" includes latency, cost, verbosity, and coverage.**
