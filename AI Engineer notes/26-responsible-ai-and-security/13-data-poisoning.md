# Data Poisoning

> **Phase 26 · RESPONSIBLE AI & SECURITY · Topic 13**

## 1. Definition

Corrupting the data a model learns from, so the trained model behaves incorrectly. Distinct from retrieval poisoning, which corrupts the documents a RAG system retrieves at query time.

## 2. Simple Explanation

Poisoning attacks the training data. If an attacker can influence what a model is trained or tuned on, they can influence what it learns.

For a system using a hosted foundation model, this mostly isn't your threat — you didn't train it. It becomes your threat the moment you fine-tune.

## 3. How It Works

```
WHERE IT APPLIES TO YOU

PRETRAINING       not your threat — you didn't train it
                  (and it's the provider's problem)
FINE-TUNING       YOUR threat, if you tune on data an
                  attacker can influence
FEEDBACK LOOPS    your threat — thumbs-up/down signals or
                  auto-collected examples feeding tuning
EVALUATION DATA   poisoned golden set → you optimize toward
                  the wrong target
```

**The evaluation case is the one people miss.** Poisoning the golden set doesn't corrupt the model — it corrupts your measurement, so you make changes that look like improvements and aren't.

## 4. Practical Example

**The feedback loop, which is the realistic attack:**

```
A system collects thumbs-up/down and uses high-rated
exchanges as tuning examples.

An attacker generates conversations containing the
behaviour they want and rates them positively. Over time
that behaviour is reinforced.

CONTROLS
  · never auto-promote feedback into a tuning set
  · human review of every example before it's used
  · weight feedback by account age and history
  · detect coordinated rating patterns
  · treat the tuning set as a reviewed artifact, like code

The general principle: any path from untrusted input to
training data is an attack surface, and automating that
path is what creates the vulnerability.
```

**Evaluation poisoning, which is subtler:**

```
The golden set is refreshed from production queries. An
attacker seeds queries with expected answers they control.

The set now rewards the wrong behaviour. Every subsequent
change is measured against a corrupted target, so the
system is optimized away from correctness while every
metric improves.

Control: golden set labels are reviewed and approved, and
the expected answers come from the authoritative source,
not from what the system produced.
```

**Why this matters less than retrieval poisoning for most RAG systems:**

```
If you don't fine-tune, the attack surface is small:
  · the corpus is the live threat → that's retrieval
    poisoning
  · the golden set is a real but narrower target

Being clear about which threat applies to your architecture
is more useful than describing the general attack — and
for a hosted-model RAG system, retrieval poisoning is the
one to plan for.
```

## 5. Why It Matters

- **It's not your threat unless you tune** — being precise about that shows architectural judgment.
- **Feedback loops are the realistic vector**, and automation is what creates it.
- **Poisoned evaluation data** corrupts measurement rather than the model.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Auto-promoting feedback to tuning data** | A direct path from untrusted input |
| **Unreviewed tuning sets** | Poisoned examples become behaviour |
| **Golden set labels from system output** | Can't detect the system being wrong |
| **Coordinated rating unmonitored** | Slow, gradual reinforcement |
| **Confusing it with retrieval poisoning** | Wrong controls applied |
| **Irreversibility** | Tuned weights can't be selectively cleaned |

**On irreversibility:** once poisoned examples are in a tuned model, they can't be removed selectively — the remedy is retraining from a clean set, which means the clean set has to still exist and be identifiable. That makes tuning-set provenance a real requirement rather than good practice.

**On detection:** poisoning is usually gradual and each individual example looks reasonable, so detection is statistical — comparing a candidate tuning set's distribution against previous ones, and flagging unusual concentrations of a particular behaviour or phrasing. That's more tractable than reviewing every example when the set is large.

## 7. Interview Answer

> "Data poisoning corrupts the data a model learns from. The first thing I'd say is that for a system using a hosted foundation model, this mostly isn't my threat — I didn't train it, and pretraining poisoning is the provider's problem.
>
> It becomes my threat the moment I fine-tune, and the realistic vector is a feedback loop. If the system collects thumbs-up ratings and uses highly-rated exchanges as tuning examples, an attacker can generate conversations containing the behaviour they want and rate them positively. Over time that behaviour gets reinforced.
>
> The controls are: never auto-promote feedback into a tuning set, human review of every example before use, weight feedback by account age and history, detect coordinated rating patterns, and treat the tuning set as a reviewed artifact like code. The general principle is that any path from untrusted input to training data is an attack surface — and automating that path is what creates the vulnerability, not the feedback itself.
>
> The case people miss is evaluation poisoning. If the golden set is refreshed from production queries and an attacker seeds queries with expected answers they control, the set now rewards the wrong behaviour. Every subsequent change is measured against a corrupted target, so the system gets optimized away from correctness while every metric improves. That doesn't corrupt the model — it corrupts the measurement, which is arguably worse because it's invisible. The control is that golden set labels are reviewed and approved, with expected answers coming from the authoritative source rather than from what the system produced.
>
> Two things worth stating. Irreversibility: once poisoned examples are in a tuned model they can't be removed selectively. The remedy is retraining from a clean set, which requires that the clean set still exists and is identifiable — so tuning-set provenance is a real requirement rather than good practice.
>
> And detection is statistical rather than per-example. Poisoning is gradual and each individual example looks reasonable, so what works is comparing a candidate tuning set's distribution against previous ones and flagging unusual concentrations of a particular behaviour or phrasing. That's more tractable than reviewing every example once the set is large.
>
> But I'd close by being clear about which threat applies. For a hosted-model RAG system that doesn't tune, the live threat is retrieval poisoning — corrupting the corpus, not the training data. Being precise about that distinction matters more than describing the general attack."

## 8. Likely Follow-ups

**Q: Is data poisoning your threat?**
Only if you fine-tune. With a hosted foundation model you didn't train, pretraining poisoning is the provider's problem. For a RAG system that doesn't tune, the live threat is retrieval poisoning — corrupting the corpus rather than the training data.

**Q: What's the realistic vector?**
Feedback loops. A system that auto-promotes highly-rated exchanges into a tuning set lets an attacker generate conversations with the behaviour they want and rate them positively. Automating the path from untrusted input to training data is what creates the vulnerability.

**Q: What's evaluation poisoning?**
Corrupting the golden set rather than the model — seeding production queries with attacker-controlled expected answers. Subsequent changes are then measured against a wrong target, so the system is optimized away from correctness while every metric improves.

**Q: Can poisoning be undone?**
Not selectively. Poisoned examples in tuned weights can't be removed individually — the remedy is retraining from a clean set, which requires that the clean set still exists and is identifiable. That makes tuning-set provenance a requirement, not a nicety.

**Q: How do you detect it?**
Statistically rather than per example. Each poisoned example looks reasonable individually, so what works is comparing a candidate tuning set's distribution against previous ones and flagging unusual concentrations of a behaviour or phrasing — which scales where per-example review doesn't.

## 9. Common Mistakes

- Treating pretraining poisoning as your threat when you use a hosted model.
- Auto-promoting user feedback into tuning data.
- Golden set expected answers derived from system output.
- No provenance record for tuning sets.
- Confusing data poisoning with retrieval poisoning and applying the wrong controls.

## 10. What to Remember

- **Not your threat unless you tune** — otherwise it's retrieval poisoning.
- **Feedback loops are the vector**; automation creates the vulnerability.
- **Evaluation poisoning corrupts measurement**, which is quieter than corrupting the model.
- **Irreversible in tuned weights** — keep clean-set provenance.
- **Detect statistically**, by distribution shift, not per example.
