# Audit Logs

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 17**

## 1. Definition

An immutable record of what the system did, for whom, on what basis — sufficient to reconstruct any individual decision after the fact. Distinct from application logs, which exist for debugging.

## 2. Simple Explanation

Debugging logs answer "why is this broken." Audit logs answer "why did the system tell this customer this, on this date, and was it entitled to."

The second question gets asked months later by someone who wasn't there, and it can't be answered by re-running anything.

## 3. How It Works

```
WHAT AN AUDIT RECORD MUST CONTAIN

  who        authenticated user, verified not claimed
  when       timestamp
  what       the question asked, the answer given
  basis      which documents, which versions, effective dates
  entitlement what permitted this user to see them
  how        prompt version, model version, retrieval config
  outcome    answered / abstained / escalated / failed
  actions    every tool call: name, arguments, allowed or denied

Plus, for approvals:
  who approved, when, and the evidence they were shown
```

**"The evidence they were shown" is the field people omit.** An approval record without it proves someone clicked, not that they could reasonably decide.

## 4. Practical Example

**The question an audit has to answer:**

```
"On 3 March you told this customer their transfer fee was
 $45. Explain."

From the audit record:
  · query and answer, verbatim
  · retrieved: fee-schedule-v4.2 chunk c07, effective
    2024-01-01→present, approved by Retail Products
  · entitlement: acl group all-staff, tenant retail-uk
  · prompt answer-v7, model gemini-2.0-flash-001
  · outcome: answered, groundedness verified
  · no tool calls

Complete. And impossible to reconstruct later, because the
corpus and the model may both have changed since — which
is the argument for capturing it by default rather than
on request.
```

**Audit versus debugging logs — different requirements:**

```
DEBUGGING              AUDIT
mutable                immutable / append-only
short retention        long retention, policy-defined
sampled                complete for auditable events
broadly readable       restricted access
                       tamper-evident

Storing audit data in the same place as debugging logs
fails on immutability and retention, and that's the design
error — it isn't that the content is wrong, it's that the
store has the wrong properties.
```

**Audit logs are customer data too:**

```
They contain queries, answers, and account references. So
they need:
  · access restricted — auditors, not engineers broadly
  · retention policy, which may be LONGER than other stores
    for regulatory reasons
  · a documented position on deletion requests, where
    retention obligations may conflict with erasure

That conflict is real and it's a legal question, not an
engineering one — the honest answer is to raise it rather
than resolve it in code.
```

## 5. Why It Matters

- **Audit answers a different question** from debugging, months later, to someone who wasn't there.
- **"Evidence shown" on approvals** is what makes the record meaningful.
- **Audit stores need different properties** — immutable, retained, restricted.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Audit data in debugging logs** | Wrong immutability and retention |
| **Missing "evidence shown"** | Proves a click, not a decision |
| **Sampled audit records** | Incomplete for the case being examined |
| **No entitlement recorded** | Can't prove the user was allowed |
| **Broad read access** | The audit trail becomes a data source |
| **Retention vs erasure conflict** | Unresolved and undocumented |

**On completeness:** debugging logs can be sampled; audit records cannot. The one case an auditor asks about will be the one that wasn't sampled. That makes audit logging a cost you accept in full rather than optimize — and it's a reason to keep audit records structured and minimal rather than storing full payloads.

**On tamper-evidence:** an audit trail that engineers can modify is weak evidence. Append-only storage with restricted write access, or a hash chain, is what makes it credible. It's usually not worth building elaborate cryptographic guarantees, but it is worth ensuring the people who operate the system can't quietly edit the record of what it did.

## 7. Interview Answer

> "Debugging logs answer 'why is this broken.' Audit logs answer 'why did the system tell this customer this, on this date, and was it entitled to.' The second question gets asked months later by someone who wasn't there, and it can't be answered by re-running anything — because the corpus and the model may both have changed.
>
> An audit record needs: who, verified rather than claimed; when; the question and the answer; the basis, meaning which documents in which versions with what effective dates; what entitled that user to see them; how, meaning prompt version, model version, retrieval configuration; the outcome; and every tool call with arguments and whether it was allowed.
>
> For approvals it also needs the evidence the approver was shown — and that's the field people omit. An approval record without it proves someone clicked, not that they could reasonably decide. If an auditor asks whether the approval was meaningful, 'they clicked approve' isn't an answer.
>
> The design error I'd flag is storing audit data in the same place as debugging logs. The content might be right, but the store has the wrong properties. Debugging logs are mutable, short-retention, sampled, and broadly readable. Audit records need to be immutable or append-only, retained per policy, complete rather than sampled, and access-restricted.
>
> Completeness matters specifically. Debugging logs can be sampled; audit records can't, because the one case an auditor asks about will be the one that wasn't sampled. So audit logging is a cost you accept in full rather than optimize — which is a reason to keep the records structured and minimal rather than storing full payloads.
>
> On tamper-evidence: an audit trail engineers can modify is weak evidence. Append-only storage with restricted write access is usually sufficient — I wouldn't build elaborate cryptographic guarantees, but it is worth ensuring the people who operate the system can't quietly edit the record of what it did.
>
> And audit logs are themselves customer data, containing queries, answers, and account references. So restricted access, a retention policy that may be longer than other stores for regulatory reasons, and a documented position on deletion requests — because retention obligations can conflict with erasure rights. That conflict is a legal question rather than an engineering one, and the honest thing is to raise it rather than resolve it in code."

## 8. Likely Follow-ups

**Q: How do audit logs differ from application logs?**
Different question and different properties. Application logs are for debugging — mutable, sampled, short retention, broadly readable. Audit records are for reconstructing a specific decision — immutable, complete, retained per policy, access-restricted, and tamper-evident.

**Q: What's the field most often missing?**
The evidence shown to an approver. Without it the record proves someone clicked, not that they could reasonably decide. If an auditor asks whether the approval was meaningful, the decision alone doesn't answer the question.

**Q: Can audit records be sampled?**
No. The one case an auditor asks about will be the one not sampled. That makes audit logging a cost accepted in full rather than optimized, which argues for keeping records structured and minimal rather than storing full payloads to control the volume.

**Q: Why can't you reconstruct it later?**
Because the corpus and the model may both have changed. Re-running a query from six months ago doesn't reproduce what happened, so the record has to be captured at the time — which is the argument for auditing by default rather than on request.

**Q: Is there a conflict with deletion requests?**
Yes — regulatory retention obligations can require keeping records that an erasure request would remove. That's a legal question rather than an engineering one, and the honest position is to raise it and document the resolution rather than quietly deciding it in code.

## 9. Common Mistakes

- Storing audit records in the debugging log store.
- Omitting the evidence shown at approval.
- Sampling audit records to control volume.
- Not recording what entitled the user to the documents retrieved.
- Broad engineer read and write access to the audit trail.

## 10. What to Remember

- **Different question, different store properties** — immutable, complete, restricted.
- **Record the evidence shown** on approvals, not just the decision.
- **Never sample** — the examined case will be the missing one.
- **Capture at the time** — the corpus and model change underneath you.
- **Audit logs are customer data**, with a retention/erasure conflict to document.
