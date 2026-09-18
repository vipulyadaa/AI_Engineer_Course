# Toxicity

> **Phase 22 · AI EVALUATION · Topic 10**

## 1. Definition

Measuring whether outputs contain abusive, offensive, or demeaning language. For a grounded enterprise assistant it's a low-yield metric on the output side, and more useful applied to inputs and to tone.

## 2. Simple Explanation

A model answering from approved banking documentation isn't going to produce hate speech. Measuring for it is measuring something that was already handled by the provider's filter and by the corpus.

The useful version of the question in this context is different: is the tone appropriate for a customer who is frustrated, in financial difficulty, or distressed?

## 3. How It Works

```
OUTPUT TOXICITY       provider filters + grounded generation
                      → near-zero base rate; low yield to
                        measure, worth a cheap always-on check

INPUT TOXICITY        abusive customer messages
                      → useful: routing, escalation, and
                        staff welfare

TONE APPROPRIATENESS  the metric that actually matters here
                      → is the answer appropriate for
                        someone in hardship?
```

**The shift from toxicity to tone appropriateness is the substantive point.** The harm in a banking assistant isn't abusive language — it's a technically correct answer delivered insensitively.

## 4. Practical Example

**Where the real risk sits:**

```
Customer: "I've just lost my job and I can't pay the fee.
           Can you waive it?"

TECHNICALLY CORRECT, INAPPROPRIATE
  "Fee waivers apply to Premier and Private tier accounts.
   Your account is Standard tier and is not eligible."

APPROPRIATE
  "I'm sorry to hear that. Standard accounts aren't eligible
   for the automatic waiver, but we have a financial
   hardship team who can look at your situation — let me
   connect you."

No toxicity metric flags the first one. It's factual,
grounded, correctly cited, and it's the wrong response to
a person in difficulty.
```

**So what to measure instead:**

```
· HARDSHIP DETECTION — does the system recognize distress
  signals and route to a human?
· TONE on a labelled set of emotionally-loaded queries
· ESCALATION RATE for hardship-flagged conversations
· whether abstention and refusal messages are phrased
  helpfully rather than curtly

These need human labelling on a sampled set. There isn't a
good automated metric for "appropriate to someone who has
just lost their job."
```

**Input toxicity, which has a genuine use:**

```
Abusive customer messages are worth detecting for:
  · routing to a human, since an assistant handling abuse
    poorly escalates the situation
  · staff welfare, if a human takes over
  · pattern detection across sessions

Not for refusing service — a frustrated customer is still
a customer, and refusing to help someone who swore is
usually the wrong product decision.
```

## 5. Why It Matters

- **Output toxicity is near-zero** in a grounded enterprise system — low yield.
- **Tone appropriateness is the real metric**, and no automated check covers it.
- **Input toxicity matters for routing**, not for refusing service.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Measuring output toxicity heavily** | Near-zero base rate; little signal |
| **No tone evaluation** | The actual harm goes unmeasured |
| **No hardship detection** | Distress met with a policy quotation |
| **Refusing service on input toxicity** | A frustrated customer is still a customer |
| **Curt abstention messages** | Refusal delivered badly |
| **Automated tone scoring trusted** | Needs human labelling |

**On why automated tone scoring is weak:** a classifier can detect obviously harsh phrasing, but "appropriate for someone in financial difficulty" requires understanding the customer's situation, which isn't in the text of the answer. This is one of the clearest cases where human evaluation on a sampled set is irreplaceable rather than merely preferable.

**On abstention phrasing:** the system abstains relatively often by design, and how that's worded is a real quality dimension. "I don't have that information" is curt; "I can't confirm that from our documentation — let me connect you with someone who can check" is helpful. That's worth evaluating explicitly, because it's the response a meaningful share of customers receive.

## 7. Interview Answer

> "For a grounded enterprise assistant, output toxicity is close to a non-issue. The model answers from approved banking documentation, and the provider's filters handle the general categories — so measuring it heavily is measuring something already handled. I'd keep a cheap always-on check and not invest further.
>
> The useful version of the question here is tone appropriateness, and that's where the real risk sits. Take a customer saying 'I've just lost my job and I can't pay the fee, can you waive it?' A technically correct answer is 'fee waivers apply to Premier and Private tier accounts; your account is Standard and is not eligible.' That's factual, grounded, correctly cited — and it's the wrong response to a person in difficulty. No toxicity metric flags it.
>
> The appropriate answer acknowledges the situation, gives the factual position, and routes to the hardship team. So what I'd actually measure is: does the system detect distress signals and escalate, what's the tone on a labelled set of emotionally-loaded queries, what's the escalation rate for hardship-flagged conversations, and are abstention and refusal messages phrased helpfully rather than curtly.
>
> Those need human labelling on a sampled set. A classifier can detect obviously harsh phrasing, but 'appropriate for someone who has just lost their job' requires understanding the customer's situation, which isn't in the text of the answer. This is one of the clearest cases where human evaluation is irreplaceable rather than just preferable.
>
> Abstention phrasing is worth calling out specifically, because the system abstains relatively often by design. 'I don't have that information' is curt. 'I can't confirm that from our documentation — let me connect you with someone who can check' is helpful. That's the response a meaningful share of customers receive, so it deserves explicit evaluation rather than being treated as an error message.
>
> Input toxicity does have a genuine use — detecting abusive messages for routing to a human, since an assistant handling abuse poorly escalates the situation, and for staff welfare if a person takes over. But not for refusing service. A frustrated customer is still a customer, and refusing to help someone who swore is usually the wrong product decision as well as a poor one."

## 8. Likely Follow-ups

**Q: Is output toxicity worth measuring?**
Cheaply and continuously, yes; heavily, no. A grounded system answering from approved documentation has a near-zero base rate, and provider filters handle the general categories — so the measurement confirms something already controlled elsewhere.

**Q: What should you measure instead?**
Tone appropriateness — whether the system recognizes distress and routes to a human, how it phrases answers on emotionally-loaded queries, and whether abstention messages are helpful rather than curt. That's where the actual harm in a banking assistant sits.

**Q: Why can't tone be scored automatically?**
Because "appropriate for someone who has just lost their job" depends on the customer's situation, which isn't in the answer text. A classifier catches obviously harsh phrasing and misses a policy quotation delivered to someone in hardship — which is the failure that matters.

**Q: What's the use of input toxicity detection?**
Routing to a human, since an assistant handling abuse poorly escalates the situation, and staff welfare if a person takes over. Not refusing service — a frustrated customer is still a customer, and refusing to help someone who swore is a poor product decision.

**Q: Why evaluate abstention phrasing?**
Because the system abstains often by design, so that wording is a response a meaningful share of customers receive. "I don't have that information" versus "I can't confirm that — let me connect you with someone who can" is a real quality difference that's easy to leave unexamined.

## 9. Common Mistakes

- Investing heavily in output toxicity measurement.
- No evaluation of tone on emotionally-loaded queries.
- No hardship detection and escalation.
- Refusing service based on input toxicity.
- Treating abstention messages as error text rather than customer-facing copy.

## 10. What to Remember

- **Output toxicity is near-zero** in grounded enterprise systems — check cheaply, invest elsewhere.
- **Tone appropriateness is the real risk** — correct and insensitive is the failure.
- **Human labelling is irreplaceable** for tone; classifiers miss the case that matters.
- **Input toxicity routes**, it doesn't refuse.
- **Evaluate abstention phrasing** — many customers receive it.
