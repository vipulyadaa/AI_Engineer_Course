# Interview Questions: Vertex AI

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 02**

## 1. Definition

The Vertex AI questions that distinguish someone who has operated the platform from someone who has read about it — IAM scoping, quota, regional constraints, and what the platform doesn't do.

> Vertex AI itself is covered in [20-vertex-ai](../20-vertex-ai/). This topic is what gets asked.

## 2. Simple Explanation

"What is Vertex AI" is a warm-up. The real questions are operational: how would you set up identity, what would you ask for before launch, and what does the platform not give you.

Operational answers signal experience in a way capability lists don't.

## 3. How It Works

**What gets asked, and what it tests:**

```
"Why Vertex AI over the direct API?"
  → governance understanding

"How would you set up access?"
  → IAM scoping and workload identity

"What would you do before launching?"
  → quota, region, audit logging — operational foresight

"What does Vertex AI NOT give you?"
  → can you separate platform from architecture

"What would surprise you in production?"
  → have you actually run it
```

## 4. Practical Example

**The answers that distinguish:**

```
ACCESS SETUP
  A service account per workload — ingestion, query,
  evaluation — each scoped to only what it needs. Workload
  identity federation rather than downloaded keys, because
  a downloaded key is a long-lived credential in a file.

  Then: "the common failure is granting aiplatform.user at
  project level because scoping is fiddly. In a bank that's
  an audit finding, and it's far easier to scope at the
  start than retrofit."

BEFORE LAUNCH
  Quota requested per region and per model, with the agent
  multiplier accounted for — one user request becoming
  eight model calls means limits hit at an eighth the
  expected traffic. Region checked for model availability
  as well as residency, because those can conflict. Data
  access audit logs enabled deliberately, with the volume
  budgeted.

WHAT IT DOESN'T GIVE YOU
  Chunking strategy, retrieval thresholds, abstention,
  grounding verification, prompt governance, agent budgets.
  Those are architecture, and no platform supplies them.
```

**The "what doesn't it give you" answer is the strongest**, because it shows you can separate platform capability from system design — which is the distinction most candidates blur.

**What surprises people in production:**

```
· quota is per region AND per model, and increases take
  lead time
· model availability differs by region, so a residency
  requirement can force a region where your preferred
  model isn't available
· data access audit logs aren't always on by default and
  generate real volume
· idle deployed endpoints bill continuously
· Vector Search index deployment isn't instant
```

## 5. Why It Matters

- **Operational answers signal experience** where capability lists don't.
- **"What it doesn't give you"** separates platform from architecture.
- **Region and quota conflicts** are the surprises that indicate having shipped.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| Listing services | Reads as documentation recall |
| "It's Google's ML platform" | Answers nothing |
| No IAM scoping detail | The most common real finding |
| Expecting the platform to supply architecture | Blurs the key distinction |
| No operational surprises named | Suggests reading rather than running |
| Downloaded service account keys | A security review will ask |

**On the IAM answer specifically:** a service account per workload — ingestion that can read documents and write vectors but can't call Gemini, query that can call Gemini and read but can't write — is blast-radius containment for the cost of a few extra accounts. Describing that concretely rather than saying "least privilege" is what demonstrates having done it.

**On not overclaiming:** if you haven't used a particular service, saying so and describing what you'd evaluate is stronger than a vague answer. An interviewer can tell the difference, and a confident wrong description of a service they know well is worse than an honest gap.

## 7. Interview Answer

> "The Vertex AI questions that matter are operational rather than about capability. 'What is Vertex AI' is a warm-up; the real ones are how you'd set up access, what you'd do before launching, and what the platform doesn't give you.
>
> On access — a service account per workload. An ingestion account that can read source documents, call Document AI and the embedding model, and write to Vector Search, but can't call Gemini or deploy endpoints. A query account that can call Gemini and read the index but has no write permission anywhere. An evaluation account that's read-only on production data. That's blast-radius containment for the cost of a few extra accounts, and a compromise of the query service then can't modify the index.
>
> And workload identity federation rather than downloaded keys, because a downloaded service account key is a long-lived credential sitting in a file with no expiry. That's the specific thing a security review asks about.
>
> The common failure is granting aiplatform.user at project level because scoping specific permissions is fiddly. In a bank that's an audit finding, and it's far easier to scope at the start than to retrofit.
>
> Before launching: quota requested per region and per model, with the agent multiplier accounted for — one user request becoming eight model calls means rate limits are hit at an eighth of the expected traffic, and that's the term people forget. Region checked for model availability as well as residency, because a residency requirement can force a region where the preferred model isn't available, and discovering that during design is much better than during launch. And data access audit logging enabled deliberately with the volume budgeted, since it isn't always on by default.
>
> The question I'd want to answer well is what Vertex AI doesn't give you. Chunking strategy, retrieval thresholds, the abstention decision, grounding verification, prompt governance, and agent budgets. Those are architecture, and no platform supplies them. Being clear about that boundary is what separates platform capability from system design.
>
> On production surprises — idle deployed endpoints billing continuously, Vector Search index deployment not being instant, and the quota and region conflicts I mentioned. Those are the ones you only learn by running it.
>
> And if I hadn't used a particular service, I'd say so and describe what I'd evaluate. A confident wrong description of something an interviewer knows well is worse than an honest gap."

## 8. Likely Follow-ups

**Q: How would you set up access?**
A service account per workload — ingestion, query, evaluation — each scoped narrowly, using workload identity rather than downloaded keys. That's blast-radius containment cheaply, and it avoids the common audit finding of a broad project-level grant.

**Q: What would you do before launching?**
Request quota per region and model including the agent multiplier, verify the region has both residency compliance and model availability since those can conflict, enable data access audit logging with volume budgeted, and confirm the rollback path actually works.

**Q: What doesn't Vertex AI give you?**
Chunking strategy, retrieval thresholds, abstention, grounding verification, prompt governance, and agent budgets. Those are architecture rather than platform features, and no managed service supplies them — the boundary is what separates platform capability from system design.

**Q: What's the common IAM mistake?**
Granting `aiplatform.user` at project level because scoping specific permissions takes work. It's an audit finding in a regulated environment, it maximizes blast radius, and retrofitting proper scoping later is considerably harder than doing it at the start.

**Q: What surprises people in production?**
Quota being per region and per model with lead time on increases, model availability differing by region so residency can force an unavailable model, audit logs not being on by default, idle endpoints billing continuously, and index deployment not being instant.

## 9. Common Mistakes

- Listing services rather than answering operationally.
- No concrete IAM scoping detail.
- Expecting the platform to supply architecture decisions.
- Downloaded service account keys.
- Overclaiming familiarity with a service you haven't used.

## 10. What to Remember

- **Operational answers signal experience** — access setup, quota, regions.
- **A service account per workload**, with workload identity.
- **"What it doesn't give you"** is the distinguishing answer.
- **Quota × the agent multiplier**, and region can conflict with model availability.
- **Admit gaps honestly** — a confident wrong answer is worse.
