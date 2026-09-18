# Design: LLM Evaluation Platform

> **Phase 28 · AI SYSTEM DESIGN · Topic 10**

## 1. Definition

Internal infrastructure for measuring LLM system quality — datasets, metric execution, comparison, gating, and the loop from production failures back into the test set.

## 2. Simple Explanation

Most teams build evaluation as scripts that run occasionally. A platform makes it routine: versioned datasets, repeatable runs, comparable results over months, and a gate in CI.

The thing that distinguishes a platform from a script is that results from six months ago are still meaningful.

## 3. How It Works

```
DATASETS      versioned, reviewed, split into fixed core
              and growing set
RUNNER        execute a configuration against a dataset,
              tiered by cost
METRICS       pluggable — deterministic checks and judge-based
STORAGE       every run with its full configuration
COMPARISON    run vs run, per question type
GATE          CI blocks on regression beyond variance
FEEDBACK      production failures → new dataset cases
```

**Storing the full configuration with every run** is what makes historical results comparable. Without it, a score from six months ago is a number with no context.

## 4. Practical Example

**What a run record must contain:**

```
{
  "run_id":          "...",
  "dataset_version": "golden-v7",
  "config": {
     "prompt_version":  "answer-v7",
     "model":           "gemini-2.0-flash-001",
     "temperature":     0.1,
     "retrieval":       {"k": 20, "threshold": 0.55,
                         "rerank": true},
     "embedding_model": "text-embedding-005",
     "index_version":   "policies-v3",
     "chunk_config":    {"size": 800, "overlap": 120}
  },
  "results_by_type": { "simple": {...}, "multi_hop": {...} },
  "cost_usd":        12.40,
  "duration_s":      340
}
```

**Results by question type, never aggregate only.** An aggregate score hides that multi-hop regressed fifteen points while simple lookups improved two.

**The cost tiering that makes it usable:**

```
per commit          deterministic checks only — seconds, free
per PR              30-case smoke set — ~2 min, ~$0.50
release candidate   full set, all metrics — ~30 min, ~$15
scheduled weekly    fixed core, to detect external change

Without tiering, teams either run it rarely (so it doesn't
gate) or run it always (so it's too slow and people skip it).
Either way the gate stops working.
```

**Variance measurement as a platform feature:**

```
The platform should measure run-to-run variance
automatically — run the unchanged configuration N times and
store the spread.

That's what makes the regression threshold principled
rather than guessed, and it's the step teams skip when
evaluation is scripts. Building it into the platform means
it actually happens.
```

## 5. Why It Matters

- **Storing full configuration** is what makes historical comparison possible.
- **Cost tiering** is what keeps the gate in use rather than skipped.
- **Automatic variance measurement** makes thresholds principled.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Configuration not stored with results** | Historical runs uninterpretable |
| **Aggregate results only** | Per-type regressions hidden |
| **No cost tiering** | Run rarely, or skipped as too slow |
| **Thresholds without variance** | Chasing noise or missing regressions |
| **No feedback loop** | The dataset becomes a launch-day snapshot |
| **Datasets unversioned** | Score changes unattributable |

**On over-engineering:** an evaluation platform can become a project in itself. The minimum useful version is versioned datasets, a runner that stores full configuration, per-type results, and a CI gate — that's a few days of work and it delivers most of the value. Dashboards, a UI, and elaborate metric plugins can wait until the basic loop is running.

**On the feedback loop as the point:** without production failures flowing back into the dataset, the platform measures a fixed set of assumptions indefinitely. That loop is what makes it improve rather than just operate, and it's the part most likely to be designed and then never actually wired up.

## 7. Interview Answer

> "Most teams build evaluation as scripts that run occasionally. A platform makes it routine — and the thing that distinguishes the two is that results from six months ago are still meaningful.
>
> Which means storing the full configuration with every run: dataset version, prompt version, model and temperature, retrieval parameters, embedding model, index version, and chunking config. Without that, a score from six months ago is a number with no context and you can't tell whether the system improved or the test changed.
>
> Results have to be stored per question type, never aggregate only. An aggregate hides that multi-hop regressed fifteen points while simple lookups improved two — and the aggregate can even look flat while that happens.
>
> The design decision that determines whether it gets used is cost tiering. Deterministic checks on every commit, in seconds and free. A thirty-case smoke set per PR, a couple of minutes. The full set with all metrics on release candidates, half an hour and maybe fifteen dollars. And the fixed core on a weekly schedule to detect external change like a model update. Without tiering, teams either run it rarely so it doesn't gate anything, or run it always so it's too slow and people skip it. Either way the gate stops working.
>
> I'd build variance measurement into the platform — run the unchanged configuration several times and store the spread automatically. That's what makes the regression threshold principled rather than guessed, and it's exactly the step teams skip when evaluation is scripts. Putting it in the platform means it actually happens.
>
> Two things about scope. This can become a project in itself, so the minimum useful version is versioned datasets, a runner storing full configuration, per-type results, and a CI gate. That's a few days of work and it delivers most of the value — dashboards, a UI, and elaborate metric plugins can wait until the basic loop is running.
>
> And the feedback loop is the point. Without production failures flowing back into the dataset, the platform measures a fixed set of launch-day assumptions indefinitely. That loop is what makes it improve rather than just operate, and it's the part most likely to be designed and then never actually wired up — because it requires someone to review sampled failures regularly, which is ongoing work rather than a build task."

## 8. Likely Follow-ups

**Q: What distinguishes a platform from evaluation scripts?**
That results from six months ago are still meaningful — which requires storing the full configuration with every run, versioned datasets, and per-type results. Scripts give you a number; a platform gives you a comparable series.

**Q: How do you keep it usable?**
Cost tiering. Deterministic checks per commit, a small smoke set per PR, the full set on release candidates, and the fixed core weekly. Without that, teams run it rarely so it doesn't gate, or always so it's skipped as too slow.

**Q: What should be built into the platform that teams skip?**
Automatic variance measurement — running the unchanged configuration several times to establish the noise floor. It's what makes regression thresholds principled rather than guessed, and it's consistently skipped when evaluation lives in scripts.

**Q: How do you avoid over-engineering it?**
Build the minimum: versioned datasets, a runner storing full configuration, per-type results, and a CI gate. That's a few days and most of the value. Dashboards, UIs, and plugin architectures can wait until the basic loop is actually running.

**Q: What's the part most likely to fail?**
The feedback loop from production failures into the dataset. It requires someone to review sampled failures regularly, which is ongoing work rather than a build task — so it gets designed and never wired up, and the dataset quietly becomes a launch-day snapshot.

## 9. Common Mistakes

- Not storing configuration alongside results.
- Reporting aggregate scores only.
- No cost tiering, so the gate is skipped or rarely run.
- Thresholds set without measuring variance.
- Designing the feedback loop but never operating it.

## 10. What to Remember

- **Store full configuration with every run** — that's what makes history comparable.
- **Results per question type**, never aggregate only.
- **Tier by cost** or the gate stops being used.
- **Measure variance automatically** — it's the step scripts skip.
- **The feedback loop is the point**, and the part most likely to lapse.
