# Safety

> **Phase 19 · GOOGLE GEMINI · Topic 20**

## 1. Definition

Gemini's built-in content filters across harm categories, with configurable thresholds on Vertex AI — plus the application-level controls that matter more for a banking system than the filters themselves.

## 2. Simple Explanation

Gemini scores both the prompt and the response against harm categories and can block either. On Vertex AI you can adjust the thresholds.

For banking the more important point is that these filters address general content harms, not the harms specific to financial advice — so they're necessary and nowhere near sufficient.

## 3. How It Works

```python
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT:        BLOCK_ONLY_HIGH,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH:       BLOCK_ONLY_HIGH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: BLOCK_ONLY_HIGH,
}
```

**Blocking can happen on input or output**, and the `finish_reason` plus `safety_ratings` tell you which and why. A blocked response isn't an error — it's a response you must handle.

## 4. Practical Example

**The banking-specific problem with the defaults:**

```
Legitimate financial content can trigger filters:

  · fraud detection and prevention procedures
  · anti-money-laundering controls
  · debt collection and hardship policy
  · sanctions screening
  · suspicious activity reporting

These read as "dangerous content" to a general-purpose
classifier. Default thresholds can block a legitimate
compliance query, and the failure looks like the system
being broken.

So thresholds must be tested against real domain content
before launch, not discovered in production.
```

**What the filters don't cover — which matters more:**

```
FINANCIAL ADVICE      "should I invest in X" is a regulated
                      activity. No safety filter prevents it.
GUARANTEES            "you'll definitely be approved" —
                      harmless by general standards, a
                      serious problem in banking.
UNGROUNDED CLAIMS     a confident wrong fee. The filters
                      don't check groundedness.
PII DISCLOSURE        another customer's data would not
                      trigger a harm category.

Every one of those is an application-level control:
grounding, verification, output checks, and pre-filtered
retrieval.
```

**That's the point to make:** built-in safety is table stakes for general harms, and the harms that actually matter in banking are ones you have to build controls for.

**The application-level layer:**

```
1. system instruction: never give financial advice, never
   guarantee outcomes, never state a figure not in context
2. grounding verification before answering
3. an output check for advice-like or guarantee-like language
4. permission-filtered retrieval, so other customers' data
   is never in context to disclose
5. abstention and handoff when out of scope
```

## 5. Why It Matters

- **Default thresholds can block legitimate financial content** — test before launch.
- **The harms that matter in banking aren't in the harm categories** at all.
- **Application-level controls** are where the real safety work is.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Untested thresholds** | Legitimate compliance queries blocked |
| **Blocked responses unhandled** | Looks like a system error to the user |
| **Assuming filters cover financial harms** | They don't |
| **Loosening thresholds broadly** | Reduces protection where it was working |
| **No output-side advice check** | Regulated advice reaches customers |
| **Filters as the whole safety story** | The dangerous misconception |

**On handling a block gracefully:** if a response is blocked, the user should get a clear message and a route to a human — not a generic error. And the block should be logged with the category, because a rising block rate on a specific category usually means either an attack pattern or a threshold that's wrong for your domain.

**On adjusting thresholds:** loosen narrowly and deliberately, per category, with the reasoning documented — and re-test. Broadly disabling filters to stop false positives removes protection that was working, and in a regulated environment the decision to loosen a safety control needs a written justification anyway.

## 7. Interview Answer

> "Gemini scores both prompt and response across harm categories and can block either, with configurable thresholds on Vertex AI. The finish reason and safety ratings tell you which and why, and a blocked response isn't an error — it's a response you have to handle.
>
> There are two banking-specific points, and the second matters more.
>
> First, default thresholds can block legitimate financial content. Fraud prevention procedures, anti-money-laundering controls, debt collection policy, sanctions screening — those read as dangerous content to a general-purpose classifier. So a legitimate compliance query gets blocked and it looks like the system is broken. That behaviour has to be tested against real domain content before launch rather than discovered in production, and where thresholds need loosening I'd do it narrowly per category with documented reasoning, not broadly — broadly disabling filters removes protection that was working, and in a regulated environment loosening a safety control needs written justification anyway.
>
> Second, and more importantly: the harms that actually matter in banking aren't in the harm categories at all. 'Should I invest in X' is regulated financial advice, and no safety filter prevents it. 'You'll definitely be approved' is a guarantee — harmless by general standards, a serious problem in banking. A confident wrong fee figure is an ungrounded claim, and the filters don't check groundedness. And another customer's data being disclosed wouldn't trigger any harm category.
>
> Every one of those is an application-level control. A system instruction that never gives financial advice, never guarantees outcomes, and never states a figure not in the retrieved context. Grounding verification before answering. An output-side check for advice-like or guarantee-like language. Permission-filtered retrieval so other customers' data is never in context to disclose in the first place. And abstention with handoff when out of scope.
>
> So built-in safety is table stakes for general harms, and treating it as the whole safety story is the dangerous misconception. The real safety work in a banking assistant is in controls I build.
>
> Operationally, a blocked response should give the user a clear message and a route to a human rather than a generic error — and it should be logged with the category, because a rising block rate on one category usually means either an attack pattern or a threshold that's wrong for the domain."

## 8. Likely Follow-ups

**Q: Do the default safety settings work for banking?**
Not without testing. Fraud prevention, anti-money-laundering, debt collection, and sanctions content can read as dangerous to a general-purpose classifier, so legitimate compliance queries get blocked. Thresholds need testing against real domain content before launch.

**Q: What do the filters not cover?**
The harms that matter most in banking — giving regulated financial advice, guaranteeing outcomes, stating ungrounded figures, and disclosing another customer's data. None of those map to a harm category, so they need application-level controls.

**Q: How would you adjust thresholds?**
Narrowly, per category, with documented reasoning, and re-tested afterwards. Broadly loosening filters to stop false positives removes protection that was working, and in a regulated environment the decision to relax a safety control requires written justification regardless.

**Q: What are the application-level controls?**
A system instruction prohibiting advice, guarantees, and unsupported figures; grounding verification before answering; an output check for advice-like language; permission-filtered retrieval so other customers' data is never in context; and abstention with handoff when out of scope.

**Q: How do you handle a blocked response?**
Give the user a clear message and a route to a human rather than a generic error, and log the block with its category. A rising block rate on one category usually indicates either an attack pattern or a threshold that's wrong for the domain, and both need someone to see it.

## 9. Common Mistakes

- Treating built-in filters as the complete safety story.
- Not testing thresholds against real financial content before launch.
- Loosening filters broadly rather than per category.
- Surfacing a safety block as a generic error.
- No output-side check for advice or guarantee language.

## 10. What to Remember

- **Filters cover general harms**, not financial-advice harms.
- **Legitimate banking content can trigger them** — test before launch.
- **Loosen narrowly, per category, with documented reasoning.**
- **The real controls are application-level:** grounding, output checks, filtered retrieval.
- **Handle blocks gracefully** and alert on rising category rates.
