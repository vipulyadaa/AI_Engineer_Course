# Automated Evaluation

> **Phase 12 · RAG EVALUATION · Topic 12**

## 1. Definition

Running evaluation metrics programmatically on every change — in CI, on a schedule, or on sampled production traffic — so regressions are caught before users see them.

## 2. Simple Explanation

Manual evaluation doesn't scale to every pull request. Automated evaluation does.

The goal is that changing chunk size, swapping a model, or editing a prompt triggers a measurement run, and a regression blocks the change the same way a failing unit test would.

## 3. How It Works

**Three tiers, by cost and cadence:**

| Tier | Runs | Cost | Metrics |
|---|---|---|---|
| **Deterministic** | Every commit | Free | recall@k, MRR, exact-figure checks, latency, token counts |
| **Judge-based** | Every PR / nightly | Moderate | groundedness, answer relevance, context relevance |
| **Human** | Weekly / per release | High | correctness, compliance, judge calibration |

**A CI gate:**

```yaml
evaluate:
  run: python eval.py --dataset golden/dev.jsonl
  assert:
    recall_at_5      >= 0.85      # hard floor
    groundedness     >= 0.90
    abstention_rate  in [0.10, 0.25]   # BOTH directions
    p95_latency_ms   <= 2500
    regression_vs_baseline <= 0.02     # no metric drops >2pp
```

**The abstention-rate band is the detail people miss.** A one-sided check catches over-abstention or under-abstention but not both. A system that stops abstaining entirely looks great on recall and is dangerous.

## 4. Practical Example

**The frameworks you'd name:**

| Tool | Provides |
|---|---|
| **RAGAS** | Faithfulness, answer relevance, context precision/recall |
| **Vertex AI Gen AI Evaluation Service** | Groundedness and other metrics, integrated with GCP |
| **TruLens** | The RAG triad, with tracing |
| **DeepEval** | Pytest-style assertions for LLM outputs |
| **Custom** | Deterministic checks specific to your domain |

**The custom deterministic checks are cheap and catch the highest-risk failures:**

```python
def check_figures(answer, cited_chunks):
    """Every monetary figure in the answer must appear in a cited chunk."""
    answer_figures = extract_currency(answer)
    context_text = " ".join(c.text for c in cited_chunks)
    unsupported = [f for f in answer_figures if f not in context_text]
    return len(unsupported) == 0, unsupported
```

Free, deterministic, and in a banking context it catches the errors that matter most.

**Regression detection needs a baseline:**

```
Run against the CURRENT PRODUCTION CONFIG as the baseline,
not against an absolute threshold alone.

  baseline: recall@5 = 0.88
  new PR:   recall@5 = 0.86
  → 2pp regression. Absolute threshold (0.85) passes.
    Relative check catches it.
```

## 5. Why It Matters

- **It catches regressions before users do**, which is the entire point.
- **It makes changes comparable** — you can attribute a quality shift to a specific change.
- **It's what makes iteration safe** — without it, every prompt edit is a gamble.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Judge cost in CI** | Running LLM-judge metrics on every commit gets expensive — tier it |
| **Flaky judge scores** | Non-zero temperature or model drift makes CI results non-reproducible |
| **Optimizing against automated metrics** | Reward hacking; the judge's preferences aren't users' needs |
| **One-sided thresholds** | Catching over-abstention but not under-abstention, or vice versa |
| **No baseline comparison** | Absolute thresholds miss gradual regression |
| **Eval set treated as test set** | Iterating against it makes reported metrics optimistic |

**On flakiness:** set judge temperature to 0 and pin the judge's model version, or CI results vary run to run and people learn to ignore failures. A flaky gate is worse than no gate.

**On reward hacking:** automated metrics are proxies. Optimizing hard against them produces systems that score well and serve users worse. The defense is periodic human evaluation confirming that automated scores still correlate with human judgment, plus a held-out test set.

## 7. Interview Answer

> "Automated evaluation is running metrics programmatically on every change, so regressions get caught before users see them — the same role unit tests play for code.
>
> I'd tier it by cost. Deterministic metrics on every commit: recall@k, MRR, exact-figure checks, latency, token counts. Those are free and fast. Judge-based metrics — groundedness, answer relevance, context relevance — on every pull request or nightly, since they cost LLM calls. And human evaluation weekly or per release, to calibrate the judges.
>
> The gate I'd write checks absolute floors and relative regression against the current production config. Absolute alone misses gradual decay: if the floor is 0.85 and recall drops from 0.88 to 0.86, an absolute check passes while a two-point regression slips through.
>
> One detail I'd call out: the abstention rate needs a band, not a one-sided threshold. A system that stops abstaining entirely looks great on recall and is dangerous — it's answering out-of-scope questions confidently. Checking only that abstention isn't too high misses that completely.
>
> Two risks. Flakiness — judge temperature at zero and a pinned judge model version, or CI results vary run to run and people learn to ignore failures. A flaky gate is worse than no gate. And reward hacking — optimizing hard against automated metrics produces systems that score well and serve users worse, so I'd keep periodic human evaluation confirming the automated scores still correlate with human judgment.
>
> On tooling, RAGAS and TruLens for the RAG triad, and on GCP the Vertex AI Gen AI Evaluation Service provides groundedness natively."

## 8. Likely Follow-ups

**Q: What do you gate on?**
Absolute floors for the core metrics — recall@k, groundedness, latency — plus a relative regression check against the current production baseline, plus an abstention-rate band in both directions. The relative check is the one that catches gradual decay that absolute thresholds miss.

**Q: How do you keep it from being expensive?**
Tier it. Deterministic metrics on every commit are free. Judge-based metrics on PRs or nightly, on a sample rather than the full set. Human evaluation weekly. Also sample production traffic for the judge-based metrics rather than evaluating every request, since you need a statistic, not complete coverage.

**Q: How do you handle flaky evaluations?**
Judge temperature at zero, judge model version pinned, and fixed random seeds anywhere sampling is involved. If results still vary, increase the sample size until the metric is stable enough that a real regression is distinguishable from noise. A gate that fails randomly trains people to ignore it.

**Q: What's the risk of optimizing against these metrics?**
Reward hacking — you get systems that score well on the proxy rather than serving users well. If you iterate prompts against an LLM judge, you'll optimize for verbosity and confident phrasing, which is what judges reward. The defense is periodic human evaluation confirming the correlation still holds, plus a test set you never iterate against.

**Q: Which framework would you use?**
RAGAS for the standard RAG triad metrics, TruLens if I want tracing alongside evaluation, DeepEval for pytest-style assertions that fit naturally into CI. On Google Cloud, the Vertex AI Gen AI Evaluation Service provides groundedness and related metrics natively, which is worth using rather than building. Plus custom deterministic checks for domain-specific risks like unsupported monetary figures.

## 9. Common Mistakes

- Running expensive judge metrics on every commit instead of tiering.
- Absolute thresholds only, missing gradual regression against baseline.
- One-sided abstention checks.
- Non-deterministic judge configuration, producing flaky gates.
- Iterating against the eval set and reporting it as an honest number.

## 10. What to Remember

- **Tier by cost:** deterministic every commit, judge-based per PR, human weekly.
- **Gate on absolute floors AND relative regression** against the production baseline.
- **Abstention rate needs a band**, not a one-sided threshold.
- **Pin the judge version and set temperature to 0** — flaky gates get ignored.
- **Reward hacking is the risk** — keep human evaluation confirming correlation.
