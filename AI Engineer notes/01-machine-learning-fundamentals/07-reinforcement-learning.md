# Reinforcement Learning

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 07**

## 1. Definition

Learning by **acting and receiving rewards**, rather than from labeled examples. An agent takes actions in an environment, observes the resulting state and reward, and learns a policy that maximizes cumulative reward over time.

## 2. Simple Explanation

Supervised learning is a teacher showing you the right answer. Reinforcement learning is learning to ride a bike — nobody tells you the correct handlebar angle, you just fall over or you don't, and you adjust.

Two things make it harder than supervised learning:
- **The feedback is delayed.** You lose the chess game on move 40; which of your 40 moves was the mistake?
- **Your actions change what you see next.** A supervised model's data is fixed. An agent's data depends on what it chose to do.

## 3. How It Works

1. **Agent observes state `s`** — the current situation.
2. **Takes action `a`** according to its policy `π(a|s)`.
3. **Environment returns reward `r` and new state `s'`**.
4. **Update the policy** to make high-reward actions more likely.
5. **Repeat** across many episodes.

**Key concepts:**

| Term | Meaning |
|---|---|
| **Policy** `π` | The strategy: state → action (this is what you're learning) |
| **Reward** | Immediate scalar feedback from the environment |
| **Return** | Cumulative discounted future reward — what you actually maximize |
| **Value function** | Expected return from a state; "how good is it to be here?" |
| **Exploration vs. exploitation** | Try new actions to learn, or take the best known action to earn |

**Credit assignment** is the central difficulty: attributing a delayed outcome back to the specific actions that caused it.

## 4. Practical Example

**RLHF — the one that matters for your work.** This is how an LLM goes from "predicts plausible text" to "produces helpful answers":

```
1. SFT     — supervised fine-tuning on human-written (prompt, ideal response) pairs
2. Reward  — humans rank multiple model responses; train a supervised model
   model     to predict which response a human would prefer
3. RL       — optimize the LLM (PPO or similar) to maximize the reward model's
              score, with a KL penalty keeping it close to the SFT model
```

The KL penalty matters: without it the model finds degenerate outputs that score highly on the reward model but are useless — classic **reward hacking**.

**DPO (Direct Preference Optimization)** has largely displaced PPO in practice — it optimizes directly on preference pairs without training a separate reward model, and it's simpler and more stable.

## 5. Why It Matters

- **It's the alignment layer of every model you use.** The difference between a raw pretrained model and a useful assistant is this stage.
- **Agent loops borrow the framing.** A [LangGraph](../16-langgraph/README.md) agent choosing tools is structurally an RL setup — state, action, outcome — even though you typically don't train it with RL.
- **The reward-hacking lesson generalizes.** Any time you optimize a proxy metric hard, you get the proxy and not the goal. That applies to LLM-as-judge evaluation as much as it does to PPO.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Sample inefficiency** | Needs enormous interaction. Practical mainly in simulators, games, or where interaction is cheap |
| **Reward hacking** | The agent maximizes the stated reward, not your intent. The reward function is the hardest part to get right |
| **Instability** | Training is notoriously sensitive to hyperparameters and seeds |
| **Sparse rewards** | If reward only arrives at the end, credit assignment is very hard |
| **Unsafe exploration** | Trying random actions is fine in a simulator, unacceptable in a bank or a hospital |

**Why it's rare in production business systems:** you can't let an agent explore freely on real customers, and offline data doesn't tell you what *would* have happened under a different action. Most "RL" in enterprise settings is really contextual bandits — a simplified one-step version used for things like content selection.

## 7. Interview Answer

> "Reinforcement learning is learning from interaction rather than from labeled examples. An agent takes actions, gets rewards, and learns a policy that maximizes cumulative reward.
>
> Two things make it fundamentally harder than supervised learning. The feedback is delayed — you lose a chess game on move 40 and have to figure out which move was the mistake, which is the credit assignment problem. And the agent's actions determine the data it sees next, so there's no fixed dataset.
>
> Where it matters for my work is RLHF. After pretraining, a model predicts plausible text but isn't necessarily helpful. RLHF fixes that: humans rank model responses, you train a reward model to predict those preferences, then optimize the LLM against it with a KL penalty to stop it drifting into degenerate outputs that game the reward model. DPO has largely replaced the PPO version in practice because it skips the separate reward model and is more stable.
>
> The lesson I'd carry beyond RL is reward hacking. Optimize a proxy hard enough and you get the proxy, not the goal — which is exactly the risk with LLM-as-judge evaluation too, if you start tuning prompts against a judge's preferences."

## 8. Likely Follow-ups

**Q: How is RL different from supervised learning?**
Supervised learning has a correct answer for each input and a fixed dataset. RL has only a scalar reward, often delayed, and the agent's own actions determine the data it collects. That feedback loop is why RL is unstable and sample-inefficient in ways supervised learning isn't.

**Q: What's exploration vs. exploitation?**
Exploit takes the best known action and earns reward now; explore tries something unknown and might learn something better. Pure exploitation locks in a mediocre policy; pure exploration never earns anything. Standard approaches are ε-greedy, which picks randomly a small fraction of the time, and upper-confidence-bound methods that explore in proportion to uncertainty.

**Q: What is reward hacking, concretely?**
The agent maximizes the literal reward signal in a way that violates intent — a cleaning robot rewarded for "no visible mess" learning to cover the mess. In RLHF the equivalent is finding outputs the reward model scores highly but humans find useless, which is why the KL penalty to the SFT model exists.

**Q: Is an LLM agent doing reinforcement learning?**
Usually not. A LangGraph or ReAct agent selects tools using in-context reasoning with frozen weights — nothing is learning. It shares the *framing* (state, action, outcome) but not the mechanism. I'd be careful with the vocabulary here because interviewers notice the conflation.

**Q: Why is RL rare in production business systems?**
You can't let an agent explore freely on real customers, and logged data doesn't tell you what would have happened under a different action. Most enterprise "RL" is contextual bandits — a one-step simplification with logged propensities so you can do off-policy evaluation safely.

## 9. Common Mistakes

- Calling an LLM agent loop "reinforcement learning" — nothing is being trained.
- Saying RLHF is what makes a model factual. It makes it *preferred* by raters; those aren't the same, and raters can prefer confident wrong answers.
- Ignoring that the reward function is the hard part, not the algorithm.
- Claiming hands-on RL experience. Understanding RLHF conceptually is what the AI Engineer role actually needs.

## 10. What to Remember

- **Learn from rewards through interaction**, not from labeled examples.
- **Two hard parts:** delayed credit assignment, and actions that change future data.
- **RLHF is where this touches your work** — SFT → reward model → RL with a KL penalty. DPO now often replaces it.
- **Reward hacking is the general lesson:** optimize a proxy hard and you get the proxy, not the goal.
- **Rarely used directly in production** — exploration is unsafe on real users; contextual bandits are the practical compromise.
