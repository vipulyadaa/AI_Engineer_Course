# Interview Questions: Gemini

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 01**

## 1. Definition

The Gemini questions a Google Cloud AI Engineer interview actually asks — less about model internals, more about access path, version discipline, tier selection, and the limits you'd design around.

> Gemini capabilities are covered in [19-google-gemini](../19-google-gemini/). This topic is what gets asked and how to answer it.

## 2. Simple Explanation

Interviewers rarely ask "what is Gemini." They ask questions that reveal whether you've run it in production.

The distinguishing answers are about the access path, version pinning, tier selection by task, and what you'd do when safety filters block legitimate content.

## 3. How It Works

**The five questions that come up, and what they're testing:**

```
"Gemini API or Vertex AI?"
  → do you understand enterprise governance

"Which model would you use?"
  → do you tier by task, or use one everywhere

"How do you handle model updates?"
  → version pinning and golden-set regression

"Does long context replace RAG?"
  → do you reach for the access control argument

"What are its limits?"
  → can you criticize the tool you're advocating
```

## 4. Practical Example

**The answers that distinguish:**

```
ACCESS PATH
  Vertex AI, and the reason is governance not capability —
  IAM instead of API keys, VPC Service Controls, CMEK,
  Cloud Audit Logs, regional residency. An API key
  satisfies none of what a security review asks about.

MODEL SELECTION
  Per task, not per system. Smallest tier for
  classification and query rewriting, Flash-class for
  generation and verification, Pro-class only where
  reasoning is the task, and a cross-encoder — not an LLM —
  for reranking.
  Then: "I'd test whether generation needs the flagship at
  all, because generation is constrained by retrieved
  context. That's usually the largest cost saving
  available."

MODEL UPDATES
  Pin explicitly, never a floating alias. Run a fixed
  golden set on a schedule — if nothing changed on my side
  and recall dropped, the cause is external. And evaluate
  the prompt-model PAIR, since prompts are version-coupled.

LONG CONTEXT vs RAG
  Cost and latency, but decisively access control: putting
  the corpus in context means the model sees documents the
  user isn't entitled to, with nothing but its discretion
  preventing disclosure. That's not a control.

LIMITS
  Safety filters block legitimate banking content — fraud
  procedures, AML controls, debt collection. Test
  thresholds against real domain content before launch.
  And multimodal input is far more token-expensive than
  people estimate.
```

**The safety-filter answer is the one that signals production experience**, because it's a problem you only encounter by shipping.

## 5. Why It Matters

- **The access path question** is the most common and it's about governance.
- **Tiering per task** distinguishes a designed system from a default one.
- **Naming the safety-filter problem** signals having shipped rather than prototyped.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "Gemini API is simpler" | Fails the enterprise question entirely |
| "We use the latest model" | No tiering, no version discipline |
| "Long context replaces RAG" | Misses the access control argument |
| "It's very capable" | No criticism; reads as unfamiliar |
| Reciting version numbers | Dated fast, and not what's being asked |
| No mention of safety filters | Suggests prototype-only experience |

**On version numbers:** naming specific model versions risks being out of date and isn't what the question tests. Describing the tier structure — flagship for reasoning, Flash-class for production, smallest for classification — is durable and demonstrates the reasoning, which is what's actually being assessed.

**On criticizing the tool:** an interviewer asking about limits wants to know whether you've hit any. Quadratic attention cost, safety filters on financial content, multimodal token expense, and the fact that a large context window isn't permission to fill it are all real and all indicate experience rather than enthusiasm.

## 7. Interview Answer

> "The Gemini questions that come up are about the access path, tier selection, version discipline, long context versus RAG, and limits. I'd answer all five from a production standpoint rather than a capability one.
>
> On access path — Vertex AI, and the reason is governance rather than capability. The models are the same. What changes is IAM instead of API keys, VPC Service Controls so data can't leave the perimeter even with valid credentials, customer-managed encryption keys, Cloud Audit Logs, and regional residency. An API key satisfies none of what a security review actually asks about, so for a bank that decision gets made before anyone compares model quality.
>
> On model selection — per task, not per system. Smallest tier for classification and query rewriting, Flash-class for generation and verification, Pro-class only where multi-step reasoning is genuinely the task, and a cross-encoder rather than an LLM for reranking. And I'd add that I'd test whether generation needs the flagship at all, because generation is constrained by retrieved context — the model synthesizes rather than reasons from scratch — so that's usually the largest cost saving available and it's a measurable claim.
>
> On model updates — pin explicitly, never a floating alias, because otherwise a provider update changes behaviour with no deploy on my side. Run a fixed golden set on a schedule, so if nothing changed on my side and recall dropped, the cause is external. And evaluate the prompt-model pair rather than the model alone, since prompts are version-coupled — 'the new model scored worse' sometimes means the old prompt doesn't fit it.
>
> On long context versus RAG — cost and latency matter, but the decisive argument is access control. Putting the corpus in context means the model sees documents the user isn't entitled to, and the only thing preventing disclosure is the model choosing not to mention them. That isn't a control. In a regulated environment that ends the discussion regardless of the cost comparison.
>
> On limits, I'd give real ones. Safety filters block legitimate banking content — fraud prevention procedures, anti-money-laundering controls, debt collection policy all read as dangerous content to a general-purpose classifier. So thresholds need testing against real domain content before launch, with any loosening narrow and per category. And multimodal input is far more token-expensive than people estimate — a scanned page isn't comparable to a paragraph, so a document-heavy workload can cost several times a text-only estimate.
>
> I'd avoid reciting version numbers. They date quickly and they aren't what the question is testing — the tier structure and the selection reasoning are durable and they're what's actually being assessed."

## 8. Likely Follow-ups

**Q: Gemini API or Vertex AI?**
Vertex AI, on governance rather than capability. IAM instead of API keys, VPC Service Controls, CMEK, audit logs, and regional residency — an API key satisfies none of what a security review asks, so the decision precedes any quality comparison.

**Q: Which model would you use?**
Per task. Smallest tier for classification and rewriting, Flash-class for generation and verification, Pro-class only where reasoning is the task, and a cross-encoder for reranking. And I'd test whether generation needs the flagship, since it's constrained by retrieved context.

**Q: How do you handle model version updates?**
Pin explicitly rather than using a floating alias, run a fixed golden set on a schedule to detect external change, and evaluate the prompt-model pair — prompts are version-coupled, so a worse score sometimes means the old prompt doesn't fit the new model.

**Q: Does long context replace RAG?**
No, and the decisive reason is access control rather than cost. Putting the corpus in context means the model sees documents the user isn't entitled to, with only its discretion preventing disclosure — which isn't a control in a regulated environment.

**Q: What are Gemini's limits?**
Safety filters blocking legitimate financial content like fraud and AML procedures, multimodal input being far more token-expensive than estimated, quadratic attention cost making long context expensive, and a large window not being permission to fill it.

## 9. Common Mistakes

- Proposing the standalone API for an enterprise system.
- Naming one model for the whole system.
- Reciting version numbers rather than tier reasoning.
- Missing the access control argument on long context.
- Unable to name a real limitation.

## 10. What to Remember

- **Vertex AI on governance** — IAM, VPC-SC, CMEK, audit, residency.
- **Tier per task**; test whether generation needs the flagship.
- **Pin versions; fixed golden set on a schedule; evaluate the pair.**
- **Access control is the long-context argument**, not cost.
- **Name real limits** — safety filters on financial content signal shipping.
