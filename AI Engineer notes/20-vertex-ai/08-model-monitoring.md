# Model Monitoring

> **Phase 20 · VERTEX AI · Topic 08**

## 1. Definition

Detecting degradation in a deployed model's behaviour over time. Vertex AI Model Monitoring covers feature and prediction drift for predictive models; generative systems need a different set of signals because there's no labelled ground truth arriving.

## 2. Simple Explanation

A predictive model drifts when the input data distribution changes. You can detect that by comparing incoming features against a training baseline.

A generative system has no equivalent baseline. So monitoring it means watching proxy signals that move before quality complaints arrive.

## 3. How It Works

```
PREDICTIVE MODELS — Vertex AI Model Monitoring
  feature skew       serving inputs vs training data
  feature drift      serving inputs vs an earlier window
  prediction drift   output distribution shifting
  attribution drift  which features drive predictions

GENERATIVE SYSTEMS — mostly custom metrics
  retrieval score distribution
  abstention rate
  escalation / handoff rate
  latency and cost per request
  safety block rate
  user feedback signals
```

**The gap is real:** built-in monitoring is designed for tabular predictive models. Generative monitoring is something you assemble from Cloud Monitoring metrics you emit yourself.

## 4. Practical Example

**The signals that actually detect degradation in RAG:**

```
1. RETRIEVAL SCORE DISTRIBUTION
   Mean and percentiles of top-1 similarity over time.
   A downward shift means embedding drift, corpus drift,
   or a model change — and it moves before answers get
   visibly worse.

2. ABSTENTION RATE
   Rising = retrieval degrading or new topics appearing.
   Falling sharply = a threshold or filter change let weak
   context through.
   Both directions matter.

3. ESCALATION RATE
   Customers asking for a human is the most honest quality
   signal available, and it requires no labelling.

4. QUERY CLUSTERING, MONTHLY
   New clusters retrieving poorly are content gaps, not
   model problems — a different fix.

5. GOLDEN SET ON A SCHEDULE
   Fixed questions, known correct chunks, run weekly. If
   nothing changed on my side and recall dropped, the
   cause is external — a model update.
```

**Point 5 is the strongest control**, because it isolates external change from your own.

**Why labelled accuracy isn't the primary signal:**

```
Knowing whether an answer was correct requires labelling,
which arrives late or never. So a monitoring strategy built
on accuracy is a monitoring strategy that detects problems
weeks after they start.

The proxy signals above are label-free and move immediately.
That's why they're the primary layer, with sampled human
review as a slower confirming signal.
```

## 5. Why It Matters

- **Built-in monitoring doesn't cover generative systems** — you assemble it.
- **Label-free proxy signals move before complaints do**, unlike accuracy.
- **A scheduled golden set** isolates external model changes from your own.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Expecting built-in monitoring to cover RAG** | It's built for tabular models |
| **Monitoring only accuracy** | Requires labels; detects too late |
| **Alerting on single requests** | Noise; alert on rates over windows |
| **No baseline before launch** | Nothing to compare against |
| **Abstention monitored one-way** | A sharp fall is also a problem |
| **Golden set changing over time** | Drift becomes unattributable |

**On establishing a baseline:** the metrics are only useful relative to a known-good period. Capturing the score distribution, abstention rate, and latency profile in the first weeks of stable operation gives you the reference. Without it, "is 12% abstention high?" is unanswerable.

**On alert design:** alerting on a single low-scoring request is noise. Alerting on the abstention rate exceeding a threshold over a rolling window, or the median retrieval score dropping by more than a set amount week over week, is signal. Getting that distinction right is what determines whether alerts get read or muted.

## 7. Interview Answer

> "Vertex AI Model Monitoring covers feature skew, feature drift, prediction drift, and attribution drift — and it's designed for tabular predictive models. For a generative system there's no equivalent baseline, so generative monitoring is something you assemble from custom metrics you emit yourself. I'd say that gap plainly rather than implying the built-in service covers RAG.
>
> The signals I'd actually monitor. First, the retrieval score distribution — mean and percentiles of top-1 similarity over time. A downward shift means embedding drift, corpus drift, or a model change, and it moves before answers get visibly worse. Second, abstention rate, in both directions: rising means retrieval is degrading or new topics are appearing, and a sharp fall means a threshold or filter change let weak context through. Third, escalation rate — customers asking for a human is the most honest quality signal available and it requires no labelling. Fourth, monthly query clustering, where new clusters retrieving poorly are content gaps rather than model problems, which is a different fix.
>
> And fifth, the strongest control: a fixed golden set run on a schedule. If nothing changed on my side and recall dropped, the cause is external — a model update. That's what isolates Google's changes from mine, and it's why I'd keep a core subset of the eval set fixed even while adding production queries to the rest.
>
> The reason those are the primary layer rather than accuracy is timing. Knowing whether an answer was correct requires labelling, which arrives late or never — so a monitoring strategy built on accuracy detects problems weeks after they start. These proxy signals are label-free and move immediately, with sampled human review as a slower confirming signal.
>
> Two practical points. I'd establish a baseline during the first weeks of stable operation — score distribution, abstention rate, latency profile — because without it 'is twelve percent abstention high?' is unanswerable.
>
> And alert design: alerting on a single low-scoring request is noise. Alerting on abstention rate exceeding a threshold over a rolling window, or the median retrieval score dropping more than a set amount week over week, is signal. Getting that distinction right determines whether alerts get read or muted, and muted alerts are worse than none."

## 8. Likely Follow-ups

**Q: Does Vertex AI Model Monitoring cover RAG systems?**
Not really — it's built for tabular predictive models, covering feature and prediction drift against a training baseline. Generative systems have no equivalent baseline, so monitoring is assembled from custom metrics you emit into Cloud Monitoring yourself.

**Q: What would you monitor in a RAG system?**
Retrieval score distribution, abstention rate in both directions, escalation rate, monthly query clustering for new topics, and a fixed golden set run on a schedule. All label-free, so they move immediately rather than waiting for labelled accuracy.

**Q: Why not monitor accuracy?**
Because it requires labels, which arrive late or never. A strategy built on accuracy detects problems weeks after they start. Label-free proxy signals move immediately and give you time to react, with sampled human review as a slower confirming layer.

**Q: How do you detect a model update degrading things?**
A fixed golden set run on a schedule. If nothing changed on your side and recall dropped, the cause is external. That's why a core subset of the eval set has to stay unchanged — if both the set and the score move, you can't attribute the difference.

**Q: How do you design alerts?**
On rates over windows, not single events. Abstention rate exceeding a threshold over a rolling window, or median retrieval score dropping week over week. Alerting per request is noise, and noisy alerts get muted — which is worse than having none at all.

## 9. Common Mistakes

- Assuming built-in monitoring covers generative systems.
- Monitoring only labelled accuracy.
- No baseline captured during stable operation.
- Alerting on individual requests rather than rates.
- Treating a falling abstention rate as good news.

## 10. What to Remember

- **Built-in monitoring is for tabular models** — generative monitoring is custom.
- **Retrieval scores, abstention, escalation, query clusters** — label-free signals.
- **A scheduled fixed golden set** isolates external model changes.
- **Capture a baseline early**, or the metrics have no reference.
- **Alert on rates over windows**, not single requests.
