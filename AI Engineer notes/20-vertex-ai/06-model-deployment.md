# Model Deployment

> **Phase 20 · VERTEX AI · Topic 06**

## 1. Definition

Getting a model into production on Vertex AI — registering a version, deploying it to an endpoint, splitting traffic, validating, and being able to roll back.

## 2. Simple Explanation

Deployment isn't uploading a model. It's the process that makes a change safe: a versioned artifact, a gradual rollout, a validation gate, and a rollback that takes seconds.

For a generative system the deployable artifact often isn't a model at all — it's a prompt and a configuration, which need the same discipline.

## 3. How It Works

```
1. REGISTER    a new version in Model Registry, with lineage
2. DEPLOY      to an endpoint alongside the current version
3. SPLIT       send 5-10% of traffic to the new version
4. VALIDATE    quality metrics, latency, error rate
5. PROMOTE     increase gradually to 100%
6. ROLL BACK   change the split back — seconds, not a redeploy
```

**Step 6 is what makes the rest worthwhile.** A deployment you can't reverse quickly is a deployment you'll hesitate to make.

## 4. Practical Example

**What "deployment" means in a generative system:**

```
The model is usually a hosted foundation model you didn't
train. So what's actually deployed and versioned is:

  · the prompt (system instruction, templates)
  · the model version and generation config
  · the retrieval configuration — k, thresholds, filters
  · the chunking strategy, if it changed
  · the tool definitions and descriptions

Every one of those changes behaviour as much as a model
swap. So they need version control, an evaluation gate,
and a rollback path — the same discipline as model
deployment, applied to configuration.

Teams apply rigorous MLOps to model artifacts and deploy
prompt changes by editing a string. That's the gap.
```

**That observation is the substantive point here.**

**The evaluation gate:**

```
A deploy should be blocked if the golden set regresses on
groundedness or answer correctness.

That turns evaluation from a report someone reads into a
control that prevents a regression reaching customers —
and it's what makes the evaluation investment pay off
continuously rather than once.
```

**A change that needs more than a rollback:**

```
Changing the embedding model or the chunking strategy
invalidates the index. That's not a deployment — it's a
migration:

  index the new version alongside the old, tagged by
  embedding_model, evaluate both, cut over by changing a
  query filter, delete the old vectors once confident

Rolling back is flipping the filter. Doing it in place
means there's nothing to roll back to.
```

## 5. Why It Matters

- **In generative systems the deployable artifact is configuration**, and it's usually under-governed.
- **An evaluation gate in CI** turns measurement into a control.
- **Embedding or chunking changes are migrations**, not deployments.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Prompt changes outside version control** | Behaviour changes with no record |
| **No evaluation gate** | Regressions reach production |
| **Direct 100% cutover** | No signal before full exposure |
| **Slow rollback** | Discourages deploying at all |
| **In-place index migration** | Nothing to roll back to |
| **No version recorded in traces** | Regressions unattributable |

**On recording versions in traces:** every response should carry the prompt version and model version used. When quality shifts, that's what lets you attribute it to a specific change rather than guessing. Without it, a regression that appeared "sometime last week" is very hard to localize.

**On validation windows:** a new version needs enough traffic and time for a quality difference to be visible. Promoting after ten minutes on five percent of traffic proves nothing — the validation period has to be long enough that the metrics are meaningful, which is usually longer than people want to wait.

## 7. Interview Answer

> "Deployment on Vertex AI is register a version in Model Registry, deploy it to an endpoint alongside the current one, split a small percentage of traffic to it, validate on quality and latency and error rate, promote gradually, and roll back by changing the split. The rollback being a percentage change rather than a redeploy is what makes the rest worthwhile — a deployment you can't reverse in seconds is one you'll hesitate to make.
>
> But the point I'd make about generative systems is that the model is usually a hosted foundation model I didn't train. So what's actually deployed and versioned is the prompt, the model version and generation config, the retrieval configuration — k, thresholds, filters — the chunking strategy, and the tool definitions.
>
> Every one of those changes behaviour as much as a model swap would. So they need version control, an evaluation gate, and a rollback path — the same discipline as model deployment, applied to configuration. The gap I'd call out is that teams apply rigorous MLOps to model artifacts and then deploy prompt changes by editing a string in a config file. That's where the behaviour actually changes.
>
> On the evaluation gate: a deploy should be blocked if the golden set regresses on groundedness or answer correctness. That turns evaluation from a report someone reads into a control that stops regressions reaching customers, and it's what makes the evaluation investment pay off continuously rather than once.
>
> I'd also record the prompt version and model version in every trace. When quality shifts, that's what lets me attribute it to a specific change instead of guessing — without it, a regression that appeared 'sometime last week' is very hard to localize.
>
> One category that needs more than a rollback: changing the embedding model or chunking strategy invalidates the index. That's a migration, not a deployment — index the new version alongside the old tagged by embedding model, evaluate both, cut over by changing a query filter, and delete the old vectors once confident. Rolling back is flipping the filter. Doing it in place means there's nothing to roll back to.
>
> And on validation windows — promoting after ten minutes on five percent of traffic proves nothing. The period has to be long enough for the metrics to be meaningful, which is usually longer than people want to wait."

## 8. Likely Follow-ups

**Q: What's actually deployed in a generative system?**
Usually configuration rather than a model — the prompt, model version and generation config, retrieval parameters, chunking strategy, and tool definitions. All of those change behaviour as much as a model swap, so they need the same versioning, gating, and rollback discipline.

**Q: What does an evaluation gate do?**
Blocks a deploy that regresses on golden-set groundedness or answer correctness. It converts evaluation from a report someone reads into a control that prevents regressions reaching customers, which is what makes the investment pay off continuously rather than once.

**Q: How do you roll back?**
By changing the traffic split back to the previous version — seconds, not a redeploy. That speed is what makes teams willing to deploy at all; a slow rollback path makes every change feel risky and slows delivery more than the deployment process itself does.

**Q: What about embedding model changes?**
Those are migrations, not deployments, because they invalidate the index. Index the new version alongside the old tagged by embedding model, evaluate both, and cut over with a query filter. In-place re-embedding leaves nothing to roll back to and a partial failure is worse than no migration.

**Q: How do you attribute a quality regression?**
By recording the prompt version and model version in every trace. Then a shift in quality maps to a specific change. Without it you're comparing against a moving baseline and a regression that appeared "sometime last week" is very hard to localize.

## 9. Common Mistakes

- Treating prompts as configuration rather than deployable artifacts.
- No evaluation gate in the deployment pipeline.
- Cutting over directly to 100% of traffic.
- In-place index migrations with no rollback path.
- Validation windows too short for metrics to be meaningful.

## 10. What to Remember

- **Register → deploy → split → validate → promote → roll back.**
- **In generative systems the artifact is configuration** — version it like a model.
- **Gate deploys on golden-set regression.**
- **Record prompt and model version in traces** for attribution.
- **Embedding and chunking changes are migrations**, done side by side.
