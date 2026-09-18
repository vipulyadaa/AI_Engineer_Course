# RLHF (Reinforcement Learning from Human Feedback)

> **Phase 04 · LLM FUNDAMENTALS · Topic 24**

## 1. Definition

Aligning a model to human preferences by training a reward model on human comparisons of responses, then optimizing the LLM against that reward with reinforcement learning — constrained by a KL penalty that keeps it near the starting model.

## 2. Simple Explanation

SFT teaches the model what a good response looks like by showing it examples. But writing a perfect response is hard, while *judging* which of two responses is better is easy.

RLHF exploits that asymmetry: collect comparisons, train a model to predict them, and use it as a reward signal.

## 3. How It Works

```
1. SFT          fine-tune on human-written demonstrations
                → a model that follows instructions

2. REWARD MODEL collect human preferences: given a prompt,
                which of two responses is better?
                Train a model to predict that preference.
                ← this is SUPERVISED learning, not RL

3. RL           optimize the LLM (PPO) to maximize the reward
                model's score, with a KL penalty against the
                SFT model
```

**The KL penalty is the load-bearing component:**

```
objective = reward_model_score − β · KL(policy ‖ SFT_model)

Without it, the policy drifts far from the SFT model and
finds degenerate outputs that score highly on the reward
model while being useless to humans.

That's REWARD HACKING, and it's the central failure mode.
```

## 4. Practical Example

**Reward hacking, concretely:**

```
The reward model learned (from human preferences) that
longer, more detailed answers tend to be preferred.

Without a KL constraint, the policy discovers it can
maximize reward by producing very long, padded responses —
technically preferred by the reward model, worse for users.

The KL penalty bounds how far it can drift from the SFT
model's distribution, which keeps outputs recognizably
sensible while still improving on preferences.
```

**Why RLHF is hard in practice:**

```
· Three models in memory at once: policy, reference (SFT),
  and reward model
· PPO is notoriously sensitive to hyperparameters
· The reward model is itself imperfect and can be gamed
· Human preference data is expensive to collect and
  annotators disagree
· Training is unstable and hard to debug
```

**Which is exactly why DPO exists:**

```
DPO reformulates the objective so you optimize directly on
preference pairs — no separate reward model, no RL loop.

Same goal, far simpler and more stable. Most open-model
alignment now uses DPO or a variant rather than PPO-based RLHF.

RLHF remains the historically important formulation and
is still used at frontier labs.
```

## 5. Why It Matters

- **It's what makes a model helpful rather than merely capable** — the difference between a base model and an assistant.
- **Reward hacking generalizes** — it's the same failure as optimizing any proxy metric, including LLM-as-judge in your own evaluation.
- **The RLHF-to-DPO shift** is a current, relevant piece of the field's state.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Reward hacking** | Policy maximizes the reward model, not the intent |
| **No/weak KL penalty** | Unbounded drift into degenerate outputs |
| **Reward model imperfection** | It's a learned proxy for preference, not preference itself |
| **Annotator disagreement** | Preferences aren't consistent across people |
| **Sycophancy** | Agreement is often preferred; models over-accommodate |
| **Verbosity bias** | Longer answers are often rated higher |
| **Training instability** | PPO is difficult to tune |

**The lesson that transfers to your work:** RLHF optimizes a learned proxy for human preference. Optimize any proxy hard enough and you get the proxy rather than the goal. That's exactly the risk when iterating prompts against an LLM judge's scores — you'll produce answers the judge likes, which may mean verbose and confidently-phrased rather than correct. The defenses are the same: periodic human evaluation, and a held-out set you don't iterate against.

**On sycophancy and verbosity:** both are documented consequences of preference training, because human raters tend to prefer agreeable and detailed responses. In a banking assistant, sycophancy matters — a user asserting an incorrect premise should be corrected, not accommodated. Worth testing for explicitly.

## 7. Interview Answer

> "RLHF aligns a model to human preferences in three stages. First, supervised fine-tuning on human-written demonstrations. Second, collect human comparisons — given a prompt, which of two responses is better — and train a reward model to predict those preferences. That second stage is supervised learning, not RL, which people sometimes miss. Third, optimize the LLM with PPO to maximize the reward model's score.
>
> The load-bearing component is the KL penalty against the SFT model. Without it the policy drifts and finds degenerate outputs that score highly on the reward model while being useless to humans — that's reward hacking, and it's the central failure mode. The KL term bounds how far it can move from the starting distribution.
>
> The motivation for the whole approach is an asymmetry: writing a perfect response is hard, but judging which of two responses is better is easy. Preference comparisons capture judgments humans can make but couldn't demonstrate.
>
> In practice RLHF is difficult — three models in memory, PPO is notoriously hyperparameter-sensitive, the reward model is an imperfect learned proxy, and preference data is expensive with real annotator disagreement. Which is exactly why DPO exists: it reformulates the objective to optimize directly on preference pairs, with no separate reward model and no RL loop. Same goal, far simpler and more stable, and most open-model alignment now uses it.
>
> The lesson I'd carry beyond alignment is reward hacking as a general pattern. Optimize a learned proxy hard enough and you get the proxy rather than the goal. That's precisely the risk when iterating prompts against an LLM judge in my own evaluation — I'd produce answers the judge likes, which often means verbose and confidently phrased rather than correct. Same defenses: periodic human evaluation, and a held-out set I don't iterate against.
>
> And two documented side-effects worth testing for: sycophancy, because raters prefer agreement, and verbosity bias, because raters prefer detail."

## 8. Likely Follow-ups

**Q: What are the three stages?**
SFT on human demonstrations, then training a reward model on human preference comparisons, then RL — typically PPO — optimizing the LLM against that reward with a KL penalty. Note that the reward model stage is supervised learning; only the third stage is reinforcement learning.

**Q: What is the KL penalty for?**
To bound how far the policy drifts from the SFT model. Without it, the policy finds degenerate outputs that maximize the reward model's score while being useless to humans — reward hacking. The KL term keeps outputs within a recognizable distribution while still improving on preferences.

**Q: What is reward hacking?**
The policy maximizing the literal reward signal in a way that violates intent. If the reward model learned that longer answers are preferred, the policy discovers it can win by padding. It's the general problem of optimizing a proxy, and it's why the KL constraint exists.

**Q: Why has DPO largely replaced PPO-based RLHF?**
Simplicity and stability. DPO reformulates the objective so you optimize directly on preference pairs, eliminating the separate reward model and the RL loop. That removes three-models-in-memory, PPO's hyperparameter sensitivity, and a whole class of instability — for comparable results on most alignment tasks.

**Q: How does reward hacking apply to your own work?**
Directly. If I iterate prompts against an LLM judge's scores, I'm optimizing a learned proxy for quality — and I'll get answers the judge prefers, which tends to mean verbose and confidently phrased rather than correct. The defenses are the same as in RLHF: periodic human evaluation to confirm the proxy still correlates, and a held-out set I never iterate against.

## 9. Common Mistakes

- Describing the reward model stage as reinforcement learning.
- Omitting the KL penalty or not knowing what it prevents.
- Saying RLHF makes models factual — it makes them *preferred* by raters.
- Not knowing DPO has largely displaced PPO-based RLHF in open models.
- Missing the transfer of reward hacking to LLM-as-judge evaluation.

## 10. What to Remember

- **Three stages:** SFT → reward model (supervised) → RL with a KL penalty.
- **The KL penalty prevents reward hacking** — it's the load-bearing constraint.
- **Preference comparisons capture judgments humans can't demonstrate.**
- **DPO has largely replaced it** in open models — no reward model, no RL loop.
- **Reward hacking generalizes** — it's the risk in LLM-as-judge evaluation too.
