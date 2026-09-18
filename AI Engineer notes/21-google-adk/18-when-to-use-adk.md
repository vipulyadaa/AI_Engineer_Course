# When to Use ADK

> **Phase 21 · GOOGLE ADK · Topic 18**

## 1. Definition

The conditions under which ADK is the right choice — and, equally, the conditions under which no agent framework is needed at all.

## 2. Simple Explanation

The first question isn't which framework. It's whether an agent is needed.

Most tasks in a banking assistant have known steps, and a deterministic pipeline handles them better. ADK becomes the right answer only after you've established that an agent is warranted and that Google Cloud integration matters.

## 3. How It Works

```
1. Do the steps depend on intermediate results?
   NO  → a pipeline. No agent framework needed.
   YES → continue.

2. Is it a fixed sequence with model-filled steps?
   YES → a workflow, possibly LangChain LCEL or plain code.
   NO  → continue.

3. Does execution need to suspend for hours and resume
   mid-flight?
   YES → LangGraph's persistence is more developed.
   NO  → continue.

4. Does it deploy on Google Cloud with IAM, VPC-SC, audit,
   and managed sessions?
   YES → ADK.
   NO  → a neutral framework may fit better.
```

**Step 1 eliminates most candidates**, which is the point of putting it first.

## 4. Practical Example

**Applied to a banking assistant:**

```
"What's the international transfer fee?"
  → retrieve, generate, cite. Known steps. A pipeline.
  → ~80% of traffic, and no agent involved.

"Why was I charged $45 when I'm Premier?"
  → needs the transaction, the tier, the policy, the waiver
    count, then a reconciliation. The path depends on what
    each lookup returns.
  → an agent. And if it deploys on GCP with IAM, VPC-SC,
    audit, and managed sessions — ADK.

"Refund this fee" — with approval that may take a day
  → suspension and mid-flight resume are central.
  → LangGraph's persistence is the better fit, or ADK with
    the approval handled as a separate workflow outside the
    agent.
```

**That last row is the honest one:** the answer isn't always ADK, and being able to say where it isn't is what makes the recommendation credible.

**Where ADK is clearly right:**

```
· a GCP-committed organization
· agent behaviour genuinely needed for a subset of traffic
· IAM, VPC-SC, audit, and residency are requirements
· managed deployment is valued over building it
· callbacks as a single authorization and audit point
  matter for review
```

**Where it isn't:**

```
· the steps are known — use a pipeline
· multi-cloud or provider-agnostic mandate
· multi-hour suspend-and-resume is the central requirement
· an existing working system on another framework
· the team wants a large community and established patterns
```

## 5. Why It Matters

- **The first question is whether an agent is needed**, and usually it isn't.
- **Naming where ADK isn't right** is what makes the recommendation credible.
- **Most banking traffic belongs on a deterministic path**, not in any framework.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Agent where a pipeline fits** | 5× cost, non-determinism, harder audit |
| **Framework chosen before the requirement** | Architecture driven by tooling |
| **ADK under a multi-cloud mandate** | GCP-oriented |
| **ADK where suspension is central** | Persistence less developed |
| **Migrating a working system** | Cost rarely justified by integration alone |
| **Choosing on vendor alignment** | Requirement should decide |

**On the routing consequence:** deciding that most traffic goes through a pipeline and only a minority reaches the agent is the single highest-value architectural decision in the system — around 70% cost reduction with better latency and reliability. The framework question only applies to the minority, which makes it less consequential than it first appears.

**On maturity:** ADK is newer, so there are fewer established patterns and less community material. For a team that wants a well-trodden path, that's a genuine consideration and worth weighing rather than dismissing because it's first-party.

## 7. Interview Answer

> "The first question isn't which framework — it's whether an agent is needed. And for a banking assistant, most tasks have known steps, so a deterministic pipeline handles them better: cheaper, faster, more reliable, and auditable.
>
> My decision sequence is: do the steps depend on intermediate results? If no, it's a pipeline and no agent framework is involved. If yes, is it a fixed sequence with model-filled steps? If so, a workflow — possibly just plain code. If not, does execution need to suspend for hours and resume mid-flight? If yes, LangGraph's persistence is more developed. If no, and it deploys on Google Cloud with IAM, VPC-SC, audit, and managed sessions — that's ADK.
>
> Applied concretely: 'what's the international transfer fee' is retrieve, generate, cite. Known steps, a pipeline, and that's roughly eighty percent of traffic with no agent involved. 'Why was I charged forty-five when I'm Premier' needs the transaction, the tier, the policy, and the waiver count, with the path depending on what each returns — that's an agent, and on GCP with those requirements, ADK.
>
> But 'refund this fee' with approval that may take a day is different. Suspension and mid-flight resume are central there, so LangGraph's persistence is the better fit — or ADK with the approval handled as a separate workflow outside the agent. I think being able to say where ADK isn't the answer is what makes the recommendation credible.
>
> Where it's clearly right: a GCP-committed organization, agent behaviour genuinely needed for a subset of traffic, IAM and VPC-SC and audit and residency as requirements, managed deployment valued over building it, and callbacks as a single authorization and audit point mattering for review.
>
> Where it isn't: known steps, a multi-cloud mandate, multi-hour suspend-and-resume as the central requirement, an existing working system on another framework, or a team that wants a large community and established patterns — because ADK is newer with fewer established patterns, and that's worth weighing rather than dismissing because it's first-party.
>
> One consequence worth stating: deciding that most traffic goes through a pipeline and only a minority reaches the agent is the highest-value architectural decision in the system — around seventy percent cost reduction with better latency and reliability. The framework question only applies to that minority, which makes it less consequential than it first appears."

## 8. Likely Follow-ups

**Q: What's the first question?**
Whether an agent is needed at all. If the steps don't depend on intermediate results, a pipeline is cheaper, faster, more reliable, and auditable. Most banking assistant traffic falls into that category, so the framework question applies to a minority of requests.

**Q: When is ADK clearly right?**
A GCP-committed organization where agent behaviour is genuinely needed, IAM and VPC-SC and audit and residency are requirements, managed deployment is valued, and having callbacks as a single authorization and audit point matters for review.

**Q: When isn't it?**
When the steps are known, under a multi-cloud mandate, when multi-hour suspend-and-resume is central, when a working system already exists on another framework, or when the team needs a large community and established patterns — ADK is newer on that last point.

**Q: How does routing affect the framework decision?**
It makes it less consequential. If most traffic goes through a deterministic pipeline and only a minority reaches the agent, the framework choice applies to that minority. The routing decision itself is worth around seventy percent cost reduction, which is far larger than any framework difference.

**Q: Does first-party status settle it?**
No. It buys real integration — IAM, audit, deployment, evaluation — but it doesn't address maturity, portability, or a persistence requirement. Choosing on vendor alignment rather than the requirement is how architecture ends up driven by tooling.

## 9. Common Mistakes

- Choosing a framework before establishing an agent is needed.
- Using an agent where the steps are known.
- Selecting on vendor alignment rather than requirements.
- Dismissing the maturity gap because ADK is first-party.
- Migrating a working system for integration benefit alone.

## 10. What to Remember

- **First question: is an agent needed?** Usually not.
- **Most banking traffic belongs on a deterministic pipeline.**
- **ADK when GCP integration and managed deployment matter**, and an agent is warranted.
- **Not when suspension is central, or under a multi-cloud mandate.**
- **The routing decision matters more** than the framework choice.
