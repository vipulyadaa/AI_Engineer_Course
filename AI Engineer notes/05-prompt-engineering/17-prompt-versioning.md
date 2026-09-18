# Prompt Versioning

> **Phase 05 · PROMPT ENGINEERING · Topic 17**

## 1. Definition

Treating prompts as versioned artifacts — reviewed, deployed, logged, and rollable-back independently of application code. It's what makes a quality change attributable to a specific prompt revision.

## 2. Simple Explanation

A prompt change can alter system behavior as much as a code change. If it isn't versioned, a metric shift six weeks later is unexplainable.

Versioning means: the prompt has an identity, changes are reviewed, the version is logged with every request, and rolling back doesn't require a code deploy.

## 3. How It Works

**The minimum viable setup:**

```
1. Prompts live as files in version control, not string literals
2. Each has a name and a monotonic version
3. Changes go through review + an eval run against a held-out set
4. The version is logged with every request
5. Rollback is a config change, not a deploy
```

**What each buys:**

| Practice | Enables |
|---|---|
| Named versioned artifact | Meaningful diffs; review |
| Version in request logs | **Attributing a quality change** |
| Eval gate on change | Catching regressions before users |
| Rollback without deploy | Fast recovery |
| Both versions loadable | A/B testing |

**Log the whole config, not just the prompt:**

```json
{
  "prompt_name": "banking_rag",
  "prompt_version": 7,
  "model_version": "gemini-2.5-pro-002",
  "embedding_model": "text-embedding-005",
  "retrieval_config": "hybrid-rerank-v3",
  "config_version": "rag-v4.2.1"
}
```

**Because the prompt isn't the only thing that changes.** If several things shipped in a week and only the prompt version is logged, attribution is still guesswork.

## 4. Practical Example

**The attribution problem, concretely:**

```
Monday:    prompt updated (abstention wording)
Tuesday:   reranker enabled
Wednesday: embedding model upgraded
Friday:    groundedness metric drops 4 points

Without per-request config versions:
  → three candidate causes, no way to separate them
  → you revert everything and lose two improvements

With config versions logged:
  → slice the metric by config_version
  → the drop correlates with Wednesday's embedding change
  → revert one thing
```

**Rollback should not require a deploy:**

```
Prompt stored outside the binary → change a version pointer
→ traffic shifts to the previous version in seconds

If rolling back a prompt requires a code deploy, your
mean-time-to-recovery is a deploy cycle. For a quality
regression affecting users, that's too slow.
```

**A/B testing needs both versions loadable simultaneously:**

```
50% → prompt v7
50% → prompt v8

Compare groundedness, abstention rate, escalation rate,
and latency. Ship v8 only if the primary metric improves
and guardrails hold.
```

## 5. Why It Matters

- **Attribution is the core value** — a metric shift needs to map to a specific change.
- **Rollback speed** determines recovery time on a quality regression.
- **It's what makes prompt changes reviewable** rather than casual edits.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **No version in request logs** | Quality changes unattributable |
| **Only the prompt version logged** | Model, embedding, and retrieval config also change |
| **Rollback requires a deploy** | Slow recovery on a regression |
| **No eval gate** | Regressions reach users |
| **Prompts hot-edited in production** | Bypasses review entirely |
| **Version drift across environments** | Staging and production running different prompts |
| **No record of what changed and why** | The diff shows what; you also need why |

**On hot-editing:** storing prompts outside the binary makes rapid iteration possible, and that's genuinely valuable. The risk is that it bypasses review and the eval gate. The workable compromise is that changes are fast but still gated — a promote step that runs the eval set and records who changed what and why.

**On environment drift:** staging and production running different prompt versions means staging tests don't predict production behavior. Version pinning per environment with an explicit promotion step avoids it, and it's a common source of "it worked in staging."

## 7. Interview Answer

> "Prompt versioning means treating prompts as versioned artifacts — reviewed, deployed, logged, and rollable-back independently of code. The core value is attribution.
>
> The concrete problem it solves: suppose on Monday the prompt changed, Tuesday a reranker was enabled, Wednesday the embedding model was upgraded, and Friday groundedness drops four points. Without per-request config versions you have three candidate causes and no way to separate them, so you revert everything and lose two improvements. With versions logged, you slice the metric by config version and see the drop correlates with Wednesday's embedding change — and you revert one thing.
>
> That's why I'd log more than just the prompt version. The prompt isn't the only thing that changes — model version, embedding model, and retrieval configuration all move too, so I'd log a config version covering the whole pipeline state.
>
> Rollback should not require a code deploy. If prompts live outside the binary, reverting is a version pointer change that takes seconds. If it requires a deploy cycle, your mean time to recovery on a user-facing quality regression is however long a deploy takes, which is usually too slow.
>
> And changes go through an eval gate — a run against the held-out set, checking absolute floors and regression against the current production baseline. A prompt change can alter behavior as much as a code change, so it deserves the same rigor.
>
> The tension I'd acknowledge is hot-editing. Storing prompts outside the binary makes rapid iteration possible and that's genuinely valuable, but it can bypass review. The workable compromise is fast-but-gated: a promote step that runs the eval set and records who changed what and why.
>
> One failure I'd watch for is environment drift — staging and production running different prompt versions means staging tests stop predicting production behavior, which is a common source of 'it worked in staging.'"

## 8. Likely Follow-ups

**Q: Why version prompts separately from code?**
So a quality change is attributable and rollback doesn't require a deploy. A prompt change can alter behavior as much as code, but coupling it to the deploy cycle makes recovery from a regression as slow as a deploy — which is usually too slow for a user-facing quality problem.

**Q: What should you log with each request?**
More than the prompt version — the model version, embedding model, retrieval configuration, and a config version covering the whole pipeline state. The prompt isn't the only thing that changes, and if several things shipped in a week, logging only the prompt version still leaves attribution ambiguous.

**Q: How do you gate prompt changes?**
An eval run against a held-out set, checking absolute quality floors and regression against the current production baseline — the relative check being the one that catches gradual decay. Plus review, same as a code change. And a record of who changed what and why, since the diff shows what changed but not the intent.

**Q: Should prompts be hot-editable in production?**
It's genuinely useful for iteration speed, and the risk is bypassing review. I'd keep the capability but gate it — a promote step that runs the eval set and records the change and its author. Fast but not unreviewed. The speed benefit shouldn't cost the discipline.

**Q: What's environment drift?**
Staging and production running different prompt versions, so staging tests stop predicting production behavior. It's a common source of "it worked in staging." The fix is explicit version pinning per environment with a promotion step, rather than letting each environment track whatever was last edited.

## 9. Common Mistakes

- Not logging a version with requests, making changes unattributable.
- Logging only the prompt version when model and retrieval config also change.
- Rollback requiring a code deploy.
- Hot-editing production prompts without review or an eval gate.
- Letting staging and production drift to different versions.

## 10. What to Remember

- **Attribution is the core value** — a metric shift must map to a specific change.
- **Log a full config version**, not just the prompt — several things change.
- **Rollback without a deploy** determines your recovery time.
- **Gate changes with an eval run**, checking floors and regression against baseline.
- **Hot-editing is useful but must stay gated**; watch for environment drift.
