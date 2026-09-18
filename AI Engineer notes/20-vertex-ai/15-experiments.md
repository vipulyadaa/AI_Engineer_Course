# Experiments

> **Phase 20 · VERTEX AI · Topic 15**

## 1. Definition

Vertex AI Experiments tracks runs with their parameters, metrics, and artifacts, so configurations can be compared systematically rather than remembered.

## 2. Simple Explanation

You try a change, measure it, and record what you tried alongside what you got.

For a RAG system that's the difference between knowing which chunking configuration performed best and having a vague memory that 800 tokens seemed better than 500.

## 3. How It Works

```python
aiplatform.init(experiment="rag-chunking-sweep")

with aiplatform.start_run(run_name="chunk-800-overlap-120"):
    aiplatform.log_params({
        "chunk_size": 800, "overlap": 120,
        "embedding_model": "text-embedding-005",
        "top_k": 20, "rerank": True, "threshold": 0.55,
    })
    results = evaluate(config)
    aiplatform.log_metrics({
        "recall_at_10":       results.recall,
        "groundedness":       results.groundedness,
        "answer_correctness": results.correctness,
        "p95_latency_ms":     results.p95,
        "cost_per_query":     results.cost,
    })
```

**Parameters plus metrics plus artifacts per run**, comparable across runs in the console or via the API.

## 4. Practical Example

**A chunking sweep, which is the realistic use:**

```
Vary chunk size, overlap, and whether breadcrumbs are
prefixed. Hold everything else constant. Measure recall@10,
groundedness, and answer correctness on the same golden set.

  chunk  overlap  breadcrumb  recall@10  groundedness
   500     80        no          0.81        0.89
   500     80        yes         0.88        0.92
   800    120        no          0.84        0.90
   800    120        yes         0.91        0.94
  1200    200        yes         0.87        0.93

That table is an argument. "800 with breadcrumbs" as a
remembered preference is not.
```

**The discipline that makes it valid:**

```
· change ONE thing per run — otherwise you can't attribute
  the difference
· same golden set across every run
· same model, temperature, and prompt unless that's the
  variable
· log the full configuration, not just the variable — six
  months later you won't remember what else was set

The last point is the one people regret. A run logged with
only chunk_size is uninterpretable once anything else has
moved.
```

**Cost and latency as first-class metrics:** logging only quality produces a recommendation to use the most expensive configuration. Logging cost per query and p95 latency alongside makes the trade-off visible and the decision defensible.

**Where this connects to production:** the winning configuration becomes a release record. The experiment is where the number came from, which is what makes "why is the threshold 0.55" answerable rather than arbitrary.

## 5. Why It Matters

- **A comparison table is an argument**; a remembered preference isn't.
- **Log cost and latency alongside quality**, or the conclusion is always the most expensive option.
- **Log the full configuration**, not just the variable — runs must stay interpretable.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Changing several variables per run** | Differences unattributable |
| **Different golden sets across runs** | Not comparable |
| **Logging only the variable** | Runs uninterpretable later |
| **Quality metrics only** | Always recommends the costliest option |
| **Too few golden-set cases** | Differences within noise |
| **Experiments never feeding production** | Tracking for its own sake |

**On statistical significance:** a two-point difference on a fifty-case golden set is probably noise. Either use enough cases that differences are meaningful, or repeat runs and report variance. Declaring a winner on a difference smaller than the run-to-run variation is a common and confident mistake.

**On non-determinism:** generative outputs vary between runs even at temperature zero, so the same configuration evaluated twice won't score identically. That variance needs measuring before any comparison — it's the floor below which differences are meaningless.

## 7. Interview Answer

> "Vertex AI Experiments tracks runs with their parameters, metrics, and artifacts so configurations can be compared systematically rather than remembered.
>
> The realistic use in a RAG system is a chunking sweep. Vary chunk size, overlap, and whether breadcrumbs are prefixed; hold everything else constant; measure recall at ten, groundedness, and answer correctness on the same golden set. What you end up with is a table showing, say, 800 tokens with 120 overlap and breadcrumbs at 0.91 recall versus 0.84 without breadcrumbs. That table is an argument. 'Eight hundred with breadcrumbs' as a remembered preference is not.
>
> The discipline that makes it valid: change one thing per run, use the same golden set across every run, hold the model and temperature and prompt constant unless that's the variable, and log the full configuration rather than just the variable. That last one is what people regret — a run logged with only chunk_size is uninterpretable six months later once anything else has moved.
>
> I'd log cost per query and p95 latency alongside the quality metrics. Logging only quality produces a recommendation to use the most expensive configuration every time, whereas including cost and latency makes the trade-off visible and the decision defensible.
>
> Two things about validity. Statistical significance — a two-point difference on a fifty-case golden set is probably noise. Either use enough cases that differences are meaningful, or repeat runs and report variance. Declaring a winner on a difference smaller than the run-to-run variation is a common and confident mistake.
>
> And generative outputs vary between runs even at temperature zero, so the same configuration evaluated twice won't score identically. That variance needs measuring first, because it's the floor below which any difference is meaningless.
>
> The thing that makes this worth doing rather than tracking for its own sake is that the winning configuration becomes the release record. The experiment is where the number came from — which is what makes 'why is the threshold 0.55' answerable rather than arbitrary, and that question does get asked."

## 8. Likely Follow-ups

**Q: What would you track in an experiment?**
Full configuration — chunk size, overlap, embedding model, top-k, reranking, threshold, prompt version, model, temperature — plus quality metrics, p95 latency, and cost per query. Logging only the variable under test makes the run uninterpretable once anything else changes.

**Q: Why log cost and latency?**
Because logging only quality always recommends the most expensive configuration. Including cost per query and p95 latency makes the trade-off explicit, which turns the result into a decision you can defend rather than a quality maximum nobody can afford.

**Q: How do you know a difference is real?**
By measuring run-to-run variance first. Generative outputs vary even at temperature zero, so the same configuration scores differently on repeat runs. A difference smaller than that variance is noise, and a fifty-case golden set often can't distinguish two points.

**Q: What makes a comparison valid?**
Changing one variable per run, the same golden set every time, and holding model, temperature, and prompt constant unless they're the variable. Otherwise the difference can't be attributed, and you've learned something ambiguous at full cost.

**Q: How does this connect to production?**
The winning configuration becomes the release record, and the experiment is where each number came from. That's what makes "why is the threshold 0.55" answerable with evidence rather than arbitrary — and that question does get asked, particularly in a review.

## 9. Common Mistakes

- Changing several variables in one run.
- Logging only the variable under test.
- Reporting quality without cost and latency.
- Declaring a winner on a difference within run-to-run noise.
- Tracking experiments that never inform a production decision.

## 10. What to Remember

- **One variable per run, same golden set, full configuration logged.**
- **Log cost and latency** or the answer is always the priciest option.
- **Measure run-to-run variance first** — it's the significance floor.
- **A comparison table is an argument**; a remembered preference isn't.
- **The winning config becomes the release record** — that's the point.
