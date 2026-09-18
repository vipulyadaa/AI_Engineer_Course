# Datasets

> **Phase 20 · VERTEX AI · Topic 16**

## 1. Definition

Managed dataset resources on Vertex AI for training, tuning, and evaluation — with versioning, lineage, and access control. In a generative system the datasets that matter most are the golden set and any tuning data.

## 2. Simple Explanation

A dataset is a managed, versioned collection with a record of where it came from and who can read it.

For a RAG system the dataset you should care about isn't training data — it's the evaluation golden set, because that's the artifact every quality claim rests on.

## 3. How It Works

```
MANAGED DATASETS      tabular, image, text, video — for
                      AutoML and custom training
GCS / BIGQUERY        the usual backing for generative
                      workflows: JSONL for tuning and
                      evaluation
VERSIONING            so a result can be tied to the exact
                      data that produced it
ACCESS CONTROL        IAM on the underlying storage
```

**In generative workflows the datasets are usually JSONL in GCS or tables in BigQuery** rather than managed dataset resources, which is fine — the discipline matters more than the resource type.

## 4. Practical Example

**The golden set as a governed artifact:**

```
It should be treated like code:

  · VERSIONED — a result is meaningless without knowing
    which version of the set produced it
  · REVIEWED — new cases and label changes go through
    review, because a wrong label silently changes what
    "good" means
  · SPLIT — a fixed core subset that never changes, plus a
    growing set refreshed from production
  · ACCESS CONTROLLED — it contains real customer queries

The fixed core is what makes drift detection valid. If both
the eval set and the score move, you can't attribute the
difference — so a stable subset is the control.
```

**That fixed-core point is the one most easily missed.**

**The PII problem with a golden set built from real queries:**

```
Real production queries contain account numbers, names, and
amounts. So the golden set is a customer data store:

  · IAM-restricted, not in a shared bucket
  · covered by retention policy
  · subject to erasure requests
  · ideally redacted or synthesized where the specific
    values don't matter to the test case

Redaction is usually possible without weakening the test —
"what's the fee on TXN-XXXXXXXX" tests the same retrieval
path as the real transaction ID.
```

**Tuning datasets, if tuning happens:**

```
· examples must reflect the behaviour you want, not just
  correct answers — tuning teaches behaviour
· a held-out split, never used in tuning, for honest
  evaluation
· lineage from the tuned model back to the exact dataset
  version, because "which data produced this model" is an
  audit question
```

## 5. Why It Matters

- **The golden set is the artifact every quality claim rests on** — govern it like code.
- **A fixed core subset** is what makes drift detection attributable.
- **Golden sets built from real queries are customer data stores.**

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Unversioned golden set** | Results not tied to what produced them |
| **Whole set changing over time** | Drift becomes unattributable |
| **Unreviewed label changes** | "Good" redefined silently |
| **PII in an uncontrolled location** | A compliance gap |
| **No held-out split for tuning** | Evaluation on training data |
| **Set too small** | Differences within noise |

**On label quality:** a golden set with wrong expected answers produces confident wrong conclusions — a change that actually improved things scores worse, and gets reverted. Labels deserve the same review as code, and disagreement between two labellers on a case is a signal that the case is ambiguous and may not belong in the set at all.

**On refreshing:** adding sampled production queries — especially failures and abstentions — keeps the set representative as the product evolves. But it must be additive to the growing portion, never a replacement of the fixed core, or the ability to compare across time is lost.

## 7. Interview Answer

> "In generative workflows the datasets are usually JSONL in GCS or tables in BigQuery rather than managed dataset resources, and that's fine — the discipline matters more than the resource type.
>
> The dataset I'd actually focus on is the evaluation golden set, because that's the artifact every quality claim rests on. I'd treat it like code: versioned, so a result is tied to the exact set that produced it. Reviewed, because a wrong expected answer silently redefines what 'good' means — and a change that genuinely improved things can score worse and get reverted. Access controlled. And split into a fixed core that never changes plus a growing portion refreshed from production.
>
> That fixed core is the point most easily missed. It's what makes drift detection valid — if both the eval set and the score move, you can't attribute the difference. So a stable subset is the control, and additions go to the growing portion rather than replacing anything.
>
> On refreshing, I'd add sampled production queries continuously, especially failures and abstentions, because that's where the cases the set doesn't represent actually live.
>
> The compliance point: a golden set built from real queries contains account numbers, names, and amounts, so it's a customer data store. IAM-restricted rather than in a shared bucket, covered by retention policy, and subject to erasure requests. Where the specific values don't matter to the test case I'd redact or synthesize — 'what's the fee on transaction TXN-XXXXXXXX' tests the same retrieval path as the real ID, so redaction usually costs nothing.
>
> On label quality specifically: labels deserve the same review as code, and disagreement between two labellers on a case is a useful signal — it usually means the case is genuinely ambiguous and may not belong in the set at all.
>
> If tuning is involved, the dataset has to reflect the behaviour I want rather than just correct answers, since tuning teaches behaviour. And there has to be a held-out split never used in tuning, plus lineage from the tuned model back to the exact dataset version — because 'which data produced this model' is an audit question, not just an engineering one."

## 8. Likely Follow-ups

**Q: Which dataset matters most in a RAG system?**
The evaluation golden set. Every quality claim rests on it, so it needs versioning, review, access control, and a fixed core subset. Training data is usually irrelevant because the model is a hosted foundation model you didn't train.

**Q: Why keep a fixed core subset?**
So drift is attributable. If both the eval set and the measured score change, you can't tell whether the system got worse or the test got harder. A stable subset is the control that makes "recall dropped and nothing changed on our side" a meaningful statement.

**Q: Is the golden set sensitive data?**
Yes, if it's built from real queries — it contains account numbers, names, and amounts. So it's a customer data store needing IAM restriction, retention policy, and coverage by erasure requests. Redacting values that don't affect the test case usually costs nothing.

**Q: How do you keep labels trustworthy?**
Review them like code. A wrong expected answer produces confident wrong conclusions — a genuine improvement scores worse and gets reverted. And disagreement between two labellers on a case usually means it's ambiguous and probably shouldn't be in the set.

**Q: What matters for tuning datasets?**
That the examples reflect the behaviour you want, since tuning teaches behaviour rather than supplying knowledge. Plus a held-out split never used in tuning, and lineage from the model back to the exact dataset version — which is an audit question as much as an engineering one.

## 9. Common Mistakes

- Not versioning the golden set.
- Replacing the whole set over time, losing comparability.
- Changing expected answers without review.
- Storing real customer queries in an uncontrolled location.
- Evaluating a tuned model on data used in tuning.

## 10. What to Remember

- **The golden set is the artifact quality claims rest on** — govern it like code.
- **Fixed core + growing portion** — the core makes drift attributable.
- **Refresh from production failures and abstentions.**
- **Real queries make it a customer data store** — redact where possible.
- **Review labels**; disagreement means the case is ambiguous.
