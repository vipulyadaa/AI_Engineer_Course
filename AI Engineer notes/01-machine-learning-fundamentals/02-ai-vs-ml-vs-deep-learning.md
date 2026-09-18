# AI vs. Machine Learning vs. Deep Learning

> **Phase 01 · MACHINE LEARNING FUNDAMENTALS · Topic 02**

## 1. Definition

Three **nested sets**, not alternatives. AI is the goal — any system doing something we'd call intelligent, including hand-coded rules. ML is the subset that learns from data. Deep learning is the subset of ML using multi-layer neural networks that learn their own features.

## 2. Simple Explanation

Think of nesting dolls:

```
AI          → includes rule engines, chess search, expert systems (NO learning)
 └─ ML      → learns behavior from data instead of being programmed
     └─ DL  → neural nets that learn their own feature representation
         └─ GenAI → models that produce new content
             └─ LLMs → GPT, Gemini, Claude
                 └─ RAG · Agents ← your work lives here
```

All deep learning is ML. All ML is AI. **The reverse is false at every step** — and the things in the outer rings that aren't in the inner rings are often the right production answer.

## 3. How It Works

The interesting part is **what changes at each boundary**:

1. **AI → ML: who writes the logic.** A human writes `if amount > 10000` versus an optimizer finding weights from 2M labeled transactions. You trade auditability and determinism for coverage and adaptability.
2. **ML → DL: who builds the features.** Classical ML expects you to hand it good features. A deep network learns the hierarchy itself — edges → textures → object parts → objects.
3. **Depth is the mechanism, not the point.** Stacking layers creates a compositional hierarchy where each layer reuses the previous layer's concepts. That's why depth beats width.
4. **DL traded human expertise for data and compute.** At 5,000 examples, engineered features + gradient boosting usually wins. At 5 million, the network wins.
5. **DL → Generative: `P(y|x)` becomes `P(x)`.** Discriminative models classify; generative models produce. LLMs are the generative branch.

## 4. Practical Example

Routing a banking message to `card_lost` / `balance_inquiry` / `loan_application` / `complaint`:

| Approach | Labels needed | Accuracy | Latency | Explainable? |
|---|---|---|---|---|
| Regex rules | 0 | ~65% | <1ms | Perfectly |
| TF-IDF + LogReg | ~5,000 | ~85% | ~1ms | Well |
| Embeddings + LogReg | ~500 | ~93% | ~10ms | Poorly |
| LLM zero-shot | 0 | ~90% | ~500ms | Not really |

The senior answer isn't "pick the best row." It's: ship rules day one to start logging, move to embeddings + logistic regression for the 93%-at-a-millisecond sweet spot, and keep the LLM for novel messages — plus use the LLM to **pre-label training data** for the cheap model rather than serving every request with it.

## 5. Why It Matters

- **Each layer has a different cost profile.** Conflating them means reaching for a transformer when a regex would do, or spending three weeks on feature engineering where a network would learn the features.
- **Deep learning is not universally better.** Tree ensembles (XGBoost/LightGBM) still match or beat deep models on medium-sized tabular data. Saying "for this transaction table I'd start with LightGBM" signals you optimize for the problem, not for novelty.
- **It places your role precisely.** You work at the application layer — RAG, orchestration, evaluation — on top of foundation models. That's a real specialization, and stating it precisely beats an overclaim.

## 6. Trade-offs / Failure Modes

| Situation | What goes wrong |
|---|---|
| **DL on small data** | Millions of parameters, thousands of examples → severe overfitting. Use pretrained + transfer, or drop to classical ML. |
| **DL on tabular data** | Weeks spent to underperform LightGBM. Benchmark gradient boosting *first*. |
| **Unexplainable model in a regulated decision** | Compliance blocks launch regardless of accuracy. Ask "who must be able to challenge this?" on day one. |
| **LLM as a high-volume classifier** | 100× the cost and 500× the latency of a trained model. Distill: LLM labels, small model serves. |
| **Hosted model changes underneath you** | Silent quality change with no code change. Version-pin and keep a golden eval set. |

## 7. Interview Answer

> "They're nested sets, not alternatives. AI is the goal — any system doing something we'd call intelligent, and that includes systems with no learning at all, like a rule engine or chess search. That's worth saying because those are often still the right answer.
>
> Crossing into ML, what changes is who writes the logic: instead of a human writing `if amount > 10000`, an optimizer finds the weights from labeled examples. You gain coverage of cases nobody enumerated, and you lose determinism and auditability.
>
> Crossing into deep learning, what changes is representation. Classical ML expects me to hand it good features. A deep network learns the hierarchy itself. Depth is the mechanism; representation learning is the point. The cost is data, compute, and interpretability.
>
> So my practical rule: unstructured data with volume or a good pretrained model, go deep. Structured tabular data, go gradient boosting — trees still beat deep nets there, which surprises people. If a deterministic rule solves it, just write the rule.
>
> LLMs sit inside deep learning in the generative branch, and my own work is one ring further in — RAG, agents, evaluation, on top of those models."

## 8. Likely Follow-ups

**Q: Is a chess engine AI?**
Yes. Deep Blue used alpha-beta search over a hand-tuned evaluation function with essentially no learning — squarely AI, squarely not ML. AlphaZero is AI *and* ML *and* deep learning. Same game, all three circles. Clean proof the circles are about method, not task.

**Q: Is deep learning always better?**
No. Three counterexamples: gradient-boosted trees on tabular data, regularized linear models on small data, and any regulated decision needing a reason code where an unexplainable model is unshippable regardless of accuracy.

**Q: What makes a network "deep"?**
Conventionally more than one hidden layer, but the count isn't the point. Depth creates a compositional hierarchy where each layer builds on the previous layer's features. A single very wide layer is a universal approximator in theory but can't reuse intermediate concepts, so depth is far more parameter-efficient.

**Q: Where does reinforcement learning fit?**
Inside ML, alongside supervised and unsupervised — it's defined by its supervision signal (rewards), not its model class. It overlaps deep learning when the policy is a neural network. RLHF is RL applied to a deep generative model.

**Q: What's the difference between an ML Engineer and an AI Engineer?**
ML Engineer's artifact is a trained model; core skills are feature engineering, training, tuning; metrics are AUC/F1/RMSE. AI Engineer's artifact is a *system* built on a foundation model; core skills are prompting, retrieval, orchestration, evaluation; metrics are groundedness, recall@k, latency, cost per query.

## 9. Common Mistakes

- Using AI/ML/DL interchangeably — they have different costs, data needs, and failure modes.
- "Deep learning = more layers." Say "the model learns its own features instead of consuming mine."
- Assuming newer is better. It depends on data type, data volume, and the explainability requirement.
- Forgetting that non-learning AI exists — you'll over-engineer problems a rule solves.
- Calling every LLM app "machine learning." You're not learning anything; you're calling a trained model.
- Claiming to have trained large models. It collapses on the first gradient question.

## 10. What to Remember

- **AI ⊃ ML ⊃ DL ⊃ GenAI ⊃ LLMs ⊃ RAG/Agents.**
- **Boundary 1:** human rules → learned weights. **Boundary 2:** human features → learned features.
- **Choose by data:** tabular → gradient boosting. Unstructured + volume → deep. Small + unstructured → pretrained + transfer. Exact known rule → just write the rule.
- **Production pattern:** deterministic guardrails *around* a probabilistic core; cascade cheap → expensive.
- **Your layer:** application layer on foundation models. Say it precisely.
