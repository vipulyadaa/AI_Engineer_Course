# Interview Questions: AI Governance

> **Phase 34 · GOOGLE-SPECIFIC INTERVIEW QUESTIONS · Topic 12**

## 1. Definition

How an AI system gets approved, monitored, and held accountable in a regulated organization. Interview questions test whether you'd treat governance as a delivery constraint you design for, or a review you hope to pass.

## 2. Simple Explanation

Governance is usually experienced as a review board that slows things down. That happens when the requirements only exist as a policy nobody read until the review.

The version that works converts requirements into things the pipeline enforces — so the review confirms what's already true rather than discovering what isn't.

## 3. How It Works

```
WHAT GOVERNANCE ASKS      WHAT YOU BUILD

what data, on what basis  source allowlist, classification,
                          lineage
what can it do            tool inventory with permissions
how do you know it works  golden set, metrics, CI gate
what if it's wrong        abstention rate, escalation path,
                          incident runbook
who is accountable        a named owner per component
can you evidence it       audit trail per decision
```

**Each question maps to something buildable**, which is what turns governance from a conversation into a checklist you've already satisfied.

## 4. Practical Example

**Converting policy into enforcement:**

```
POLICY                      ENFORCED AS

"only approved sources"     ingestion rejects anything
                            outside the allowlist
"answers must be traceable" CI fails if a response lacks
                            resolvable citations
"no degradation on release" CI gate on golden-set
                            groundedness
"no financial advice"       output classifier, tested in CI
"irreversible actions need
 approval"                  the tool is unavailable without
                            an approval step

Then the review is a conversation about evidence that
already exists. That's the difference between governance
that works and governance that's resented.
```

**Speaking the bank's existing language:**

```
Banks have model risk management frameworks — inventory,
documented purpose and limitations, independent validation,
ongoing monitoring, periodic review.

An LLM system fits that awkwardly, because it isn't a model
you trained and its behaviour isn't fully specifiable. But
mapping onto it honestly beats arguing the framework
doesn't apply:

  inventory     the system plus model, prompt, and corpus
                versions
  purpose/limits what it answers, what it abstains on, what
                it must never do
  validation    the golden set, run independently
  monitoring    abstention rate, groundedness, escalation
  review        scheduled re-evaluation, especially on
                model updates
```

**That mapping is the answer that signals having worked in a regulated environment**, because it shows you'd engage with the existing process rather than ask for an exception.

**On documented limitations:**

```
The honest position is that the system is probabilistic,
can be wrong, and is bounded by its corpus.

Governance handles a stated limitation far better than a
claim of reliability the system can't support — an
overclaimed capability just becomes a finding the first
time it fails in the way you said it wouldn't.
```

## 5. Why It Matters

- **Enforcement in the pipeline** makes the review confirm rather than discover.
- **Mapping onto model risk management** shows you'd engage with the existing process.
- **Documented limitations survive** where overclaimed capabilities become findings.

## 6. Trade-offs / Failure Modes

| Weak answer | Why |
|---|---|
| "We'd work with the governance team" | Says nothing about what you'd build |
| Policy with no enforcement | Discovered at review, expensive to fix |
| Overclaiming reliability | Becomes a finding when it fails |
| No named owner | "The AI got it wrong" isn't accountability |
| Arguing the framework doesn't apply | Loses the room |
| No re-review triggers | Approved scope drifts silently |

**On re-review triggers:** an approval covers the system as it was. A model version change, a prompt change, a corpus expansion into a new domain, or a new tool should all trigger re-review. Defining those up front prevents both endless re-approval and silent drift past what was actually approved — and naming that unprompted shows you've thought past the initial launch.

**On accountability:** "the AI got it wrong" isn't an accountable position. A named owner per component — the corpus, the retrieval configuration, the prompt, the tool set — is what makes the question answerable, and in a bank it's usually required explicitly. It's far easier to assign at design time than during an incident.

## 7. Interview Answer

> "Governance is usually experienced as a review board that slows things down, and that happens when the requirements only exist as a policy nobody read until the review. The version that works converts them into things the pipeline enforces, so the review confirms what's already true rather than discovering what isn't.
>
> Concretely: 'only approved sources' becomes ingestion rejecting anything outside an allowlist. 'Answers must be traceable' becomes CI failing if a response lacks resolvable citations. 'No degradation on release' becomes a CI gate on golden-set groundedness. 'No financial advice' becomes an output classifier tested in CI. 'Irreversible actions need approval' becomes the tool being unavailable without an approval step. Then the review is a conversation about evidence that already exists.
>
> The other thing I'd do is speak the bank's existing language. Banks have model risk management frameworks — model inventory, documented purpose and limitations, independent validation, ongoing monitoring, periodic review. An LLM system fits that awkwardly, because it isn't a model you trained and its behaviour isn't fully specifiable. But mapping onto it honestly is far more effective than arguing the framework doesn't apply, which loses the room.
>
> So: inventory becomes the system plus its model, prompt, and corpus versions. Purpose and limitations become what it answers, what it abstains on, and what it must never do. Validation is the golden set run independently of the developer. Monitoring is abstention rate, groundedness, and escalation rate. Review is scheduled re-evaluation, especially on model updates.
>
> On limitations, the honest documented position is that the system is probabilistic, can be wrong, and is bounded by its corpus. Governance handles a stated limitation far better than a claim of reliability the system can't support — an overclaimed capability just becomes a finding the first time it fails in the way you said it wouldn't.
>
> Two things I'd define up front. Re-review triggers: a model version change, a prompt change, a corpus expansion into a new domain, or a new tool. Defining those prevents both endless re-approval and silent drift past what was actually approved.
>
> And named ownership per component — the corpus, the retrieval configuration, the prompt, the tool set. 'The AI got it wrong' isn't an accountable position, and in a bank named ownership is usually required explicitly. It's much easier to assign at design time than in the middle of an incident.
>
> What I'd avoid is answering 'we'd work closely with the governance team'. That's true and it says nothing about what I'd build — and what I'd build is the thing that makes the conversation short."

## 8. Likely Follow-ups

**Q: How do you make governance fast?**
By converting requirements into pipeline controls — allowlisted ingestion, CI gates on citations and golden-set metrics, output classifiers tested in CI. The review then confirms evidence that already exists rather than discovering gaps whose fix is a redesign.

**Q: How does an LLM system fit model risk management?**
Awkwardly, but mapping honestly beats resisting. Inventory becomes system plus model, prompt, and corpus versions. Validation becomes the golden set run independently. Monitoring becomes abstention and groundedness rates. Arguing the framework doesn't apply loses the room.

**Q: What should be documented as a limitation?**
That the system is probabilistic, can be wrong, and is bounded by its corpus. A stated limitation is handled far better than an overclaimed capability, which becomes a finding the first time the system fails in exactly the way you said it wouldn't.

**Q: What triggers re-review?**
A model version change, a prompt change, a corpus expansion into a new domain, or a new tool. Defining those up front prevents endless re-approval on one side and silent drift past the approved scope on the other — both of which are real failure directions.

**Q: Who's accountable?**
A named owner per component — corpus, retrieval configuration, prompt, tool set. "The AI got it wrong" isn't an accountable position, and in a bank named ownership is typically required explicitly. Assigning it at design time is far easier than during an incident.

## 9. Common Mistakes

- Answering "we'd work with the governance team" and stopping.
- Policy that exists only as a document.
- Overclaiming reliability the system can't deliver.
- Arguing the model risk framework doesn't apply.
- No defined re-review triggers or named owners.

## 10. What to Remember

- **Enforce in the pipeline** — the review then confirms rather than discovers.
- **Map onto model risk management** rather than resisting it.
- **Document limitations honestly** — overclaims become findings.
- **Define re-review triggers** — model, prompt, corpus, tools.
- **Name an owner per component** — "the AI got it wrong" isn't accountability.
