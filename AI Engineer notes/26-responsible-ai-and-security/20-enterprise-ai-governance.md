# Enterprise AI Governance

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 20**

## 1. Definition

The organizational structure around AI systems — who approves what, what evidence is required, who is accountable when something goes wrong, and how that's enforced in the delivery process rather than in a document.

## 2. Simple Explanation

Governance is usually experienced as a review board that slows things down. That happens when the requirements only exist as a policy nobody read until the review.

The version that works converts the requirements into things the pipeline enforces — so the review confirms what's already true rather than discovering what isn't.

## 3. How It Works

```
WHAT GOVERNANCE ACTUALLY ASKS

  what data does it use, and on what basis
  what can it do, and what can't it
  how do you know it works
  what happens when it's wrong
  who is accountable
  can you evidence all of the above
```

**Each maps to something buildable:**

| Question | Evidence |
|---|---|
| What data | Source allowlist, classification, lineage |
| What it can do | Tool inventory with permissions |
| How you know | Golden set, metrics, CI gate |
| When it's wrong | Abstention rate, escalation path, incident runbook |
| Who is accountable | A named owner per component |
| Evidence | Audit trail per decision |

## 4. Practical Example

**Converting governance into pipeline controls:**

```
POLICY                       ENFORCED AS
"only approved sources"      ingestion rejects anything
                             outside the allowlist
"answers must be traceable"  CI fails if a response lacks
                             resolvable citations
"no degradation on release"  CI gate on golden-set
                             groundedness and correctness
"no financial advice"        output classifier, tested in CI
"irreversible actions need
 approval"                   the tool is unavailable without
                             an approval step in the graph

Now the review is a conversation about evidence that
already exists. That's the difference between governance
that works and governance that's resented.
```

**That translation is the substantive point** — it's what turns a slow process into a fast one without weakening it.

**The model risk management framing, which banks will use:**

```
Banks have existing model risk frameworks — typically:
  · model inventory
  · documented purpose and limitations
  · validation independent of the developer
  · ongoing monitoring
  · periodic review

An LLM system fits that framework awkwardly, because it
isn't a model you trained and its behaviour isn't fully
specifiable. The useful move is mapping onto it honestly:

  inventory        the system, its model version, prompt
                   version, corpus version
  purpose/limits   what it answers, what it abstains on,
                   what it must never do
  validation       the golden set, run independently
  monitoring       abstention rate, groundedness, escalation
  review           scheduled re-evaluation, especially on
                   model updates

Speaking that language is worth more than arguing the
framework doesn't apply.
```

**What to say about limitations:** the honest documented limitation is that the system is probabilistic, can be wrong, and is bounded by its corpus. Governance handles that far better than a claim of reliability it can't support — an overclaimed capability becomes a finding when it inevitably fails.

## 5. Why It Matters

- **Governance enforced in the pipeline** is fast; governance in a document is slow.
- **Mapping onto existing model risk frameworks** is more effective than resisting them.
- **Documented limitations** are handled better than overclaimed capabilities.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Policy without enforcement** | Discovered at review, expensive to fix |
| **Governance as a launch gate** | Findings whose fix is a redesign |
| **Overclaiming reliability** | Becomes a finding when it fails |
| **No named owner** | Accountability diffuses |
| **No re-review on model updates** | Behaviour changes without governance |
| **Evidence not captured at the time** | Can't be reconstructed |

**On re-review triggers:** a governance approval is for a system as it was. A model version change, a prompt change, a corpus expansion into a new domain, or a new tool are all changes that should trigger re-review. Defining those triggers up front is what prevents either endless re-approval or silent drift past what was approved.

**On accountability:** "the AI got it wrong" isn't an accountable position. A named owner per component — the corpus, the retrieval configuration, the prompt, the tool set — is what makes the question answerable. In a bank this is usually required explicitly, and it's easier to assign at design time than after an incident.

## 7. Interview Answer

> "Governance is usually experienced as a review board that slows things down, and that happens when the requirements only exist as a policy nobody read until the review. The version that works converts requirements into things the pipeline enforces, so the review confirms what's already true rather than discovering what isn't.
>
> Concretely: 'only approved sources' becomes ingestion rejecting anything outside an allowlist. 'Answers must be traceable' becomes CI failing if a response lacks resolvable citations. 'No degradation on release' becomes a CI gate on golden-set groundedness and correctness. 'No financial advice' becomes an output classifier tested in CI. 'Irreversible actions need approval' becomes the tool being unavailable without an approval step in the graph. Then the review is a conversation about evidence that already exists — and that translation is what turns a slow process into a fast one without weakening it.
>
> The other thing I'd do is speak the bank's existing language. Banks have model risk management frameworks — model inventory, documented purpose and limitations, independent validation, ongoing monitoring, periodic review. An LLM system fits that awkwardly, because it isn't a model you trained and its behaviour isn't fully specifiable. But mapping onto it honestly is far more effective than arguing the framework doesn't apply.
>
> So: inventory becomes the system with its model version, prompt version, and corpus version. Purpose and limits become what it answers, what it abstains on, and what it must never do. Validation is the golden set, run independently of the developer. Monitoring is abstention rate, groundedness, and escalation rate. And review is scheduled re-evaluation, especially on model updates.
>
> On limitations, the honest documented position is that the system is probabilistic, can be wrong, and is bounded by its corpus. Governance handles a stated limitation far better than a claim of reliability the system can't support — an overclaimed capability just becomes a finding when it inevitably fails.
>
> Two things I'd define up front. Re-review triggers: a model version change, a prompt change, a corpus expansion into a new domain, or a new tool. Defining those prevents either endless re-approval or silent drift past what was actually approved.
>
> And named ownership per component — the corpus, the retrieval configuration, the prompt, the tool set. 'The AI got it wrong' isn't an accountable position, and in a bank a named owner is usually required explicitly. It's much easier to assign at design time than after an incident."

## 8. Likely Follow-ups

**Q: How do you make governance fast?**
By converting requirements into pipeline controls — allowlisted ingestion, CI gates on citations and golden-set metrics, output classifiers tested in CI. Then the review confirms evidence that already exists rather than discovering gaps whose fix is a redesign.

**Q: How does an LLM system fit model risk management?**
Awkwardly, but mapping onto it honestly beats resisting it. Inventory becomes system plus model, prompt, and corpus versions. Validation becomes the golden set run independently. Monitoring becomes abstention and groundedness rates. Speaking that language is worth more than arguing the framework doesn't apply.

**Q: What should be documented as a limitation?**
That the system is probabilistic, can be wrong, and is bounded by its corpus. Governance handles a stated limitation far better than an overclaimed capability — the overclaim becomes a finding the first time the system fails in the way you said it wouldn't.

**Q: What triggers re-review?**
A model version change, a prompt change, a corpus expansion into a new domain, or a new tool. Defining those triggers up front prevents both endless re-approval and silent drift past what was originally approved, which are the two failure directions.

**Q: Who is accountable?**
A named owner per component — corpus, retrieval configuration, prompt, tool set. "The AI got it wrong" isn't an accountable position, and in a regulated environment named ownership is usually required explicitly. It's far easier to assign at design time than in the middle of an incident.

## 9. Common Mistakes

- Policy that exists only as a document, checked at review.
- Treating governance as a launch gate rather than a design input.
- Overclaiming reliability the system can't deliver.
- No defined re-review triggers, so approved scope drifts.
- No named owner per component.

## 10. What to Remember

- **Enforce governance in the pipeline** — the review then confirms, not discovers.
- **Map onto existing model risk frameworks** rather than resisting them.
- **Document limitations honestly** — overclaims become findings.
- **Define re-review triggers** — model, prompt, corpus, tools.
- **Name an owner per component** — "the AI got it wrong" isn't accountability.
