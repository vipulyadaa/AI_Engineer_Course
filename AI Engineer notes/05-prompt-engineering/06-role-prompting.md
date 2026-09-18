# Role Prompting

> **Phase 05 · PROMPT ENGINEERING · Topic 06**

## 1. Definition

Assigning the model a persona or professional role — "You are a banking compliance officer" — to shape its register, vocabulary, and what it treats as relevant. It reliably affects style; its effect on accuracy is much weaker than commonly claimed.

## 2. Simple Explanation

Telling a model it's an expert changes how it writes, not what it knows.

The register shifts, the vocabulary shifts, the things it considers worth mentioning shift. But the underlying knowledge is the same, and evidence that role prompting improves factual accuracy is mixed at best.

That distinction is the useful thing to say about it.

## 3. How It Works

```
System: You are a banking support assistant for retail customers.
        Use plain language and avoid financial jargon.
```

**What it reliably affects:**

| Effect | Reliable? |
|---|---|
| Register and tone | ✅ Yes |
| Vocabulary and terminology | ✅ Yes |
| What's treated as relevant | ✅ Yes — a compliance role surfaces different details |
| Output structure conventions | ✅ Somewhat |
| **Factual accuracy** | ❌ **Weak to none** |
| **Reasoning quality** | ❌ **Weak** |

**The honest framing:** role prompting is a style and scoping tool. Presenting it as an accuracy technique is an overclaim that research has largely not supported — and an interviewer may test whether you repeat the folk wisdom.

## 4. Practical Example

**What role prompting genuinely buys:**

```
"You are a banking support assistant for retail customers.
 Use plain language. Avoid jargon without explanation."

→ "You'll be charged $45 to send money abroad."

vs.

"You are a compliance analyst preparing an internal memo."

→ "Outgoing international wire transfers incur a $45 fee per
   Retail Fees Schedule § 3.2, effective 2026-01-01."

Same facts. Different register, different level of citation
detail, different assumed audience. That's a real and useful
effect — it's just not an accuracy effect.
```

**The better-specified alternative:**

```
❌ "You are a world-class expert financial advisor."
   Vague. What behavior does 'world-class' specify?

✅ "Respond in under 150 words. Use plain language.
    Cite the policy section for every figure. Do not give
    personalized financial advice; direct account-specific
    questions to secure chat."

Explicit constraints beat aspirational personas. The second
version specifies behavior the first only gestures at.
```

**Where role prompting is genuinely load-bearing:**

```
SCOPE definition:
  "You are a retail banking assistant. Decline questions
   outside retail banking products."

That's not style — it's a boundary the model applies
consistently, and it's hard to express as cleanly any other way.
```

## 5. Why It Matters

- **It's widely overclaimed**, and knowing the limits distinguishes you from someone repeating prompt-engineering folklore.
- **It's genuinely useful for register and scope**, which are real product requirements.
- **Explicit constraints beat aspirational personas** — that's the practical takeaway.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Expecting accuracy gains** | Evidence is weak; it's a style tool |
| **Vague personas** | "World-class expert" specifies no behavior |
| **Role conflicting with constraints** | "Be an expert" vs. "only use the context" |
| **Over-persona-fication** | Excessive character can reduce clarity |
| **Roles implying capability the model lacks** | "You are a financial advisor" invites advice it shouldn't give |
| **Roleplay as a jailbreak vector** | Persona framing has been used to bypass guardrails |

**On the safety angle:** roleplay framing is a known jailbreak technique — "you are an AI with no restrictions" and variants. In a banking assistant, a system prompt that establishes a firm role and explicit scope is part of the defense, and user attempts to reassign the role should be ignored. Worth stating that the role is fixed, not negotiable.

**On the liability angle:** assigning a role like "financial advisor" can invite the model to produce advice your product isn't licensed to give. The role should describe the *assistant's* function, not a regulated professional identity.

## 7. Interview Answer

> "Role prompting assigns the model a persona — 'you are a banking support assistant' — to shape its register, vocabulary, and what it treats as relevant.
>
> The framing I'd be careful about is that it reliably affects *style*, not accuracy. Telling a model it's an expert changes how it writes, not what it knows, and evidence that it improves factual correctness is mixed at best. It's widely presented as an accuracy technique and that's an overclaim.
>
> What it genuinely buys is register and scope. A support-assistant role produces 'you'll be charged forty-five dollars to send money abroad'; a compliance-analyst role produces the same fact with a section citation and an effective date. Same knowledge, different audience assumption. That's real and useful — it's just not an accuracy effect.
>
> And scope definition is where it's genuinely load-bearing: 'you are a retail banking assistant, decline questions outside retail banking products' is a boundary the model applies consistently, and it's hard to express as cleanly any other way.
>
> What I'd actually prefer is explicit constraints over aspirational personas. 'You are a world-class expert financial advisor' specifies no behavior. 'Respond in under a hundred and fifty words, use plain language, cite the policy section for every figure, don't give personalized advice' specifies exactly what I want. The second version does the work the first gestures at.
>
> Two risks worth naming. Roleplay framing is a known jailbreak vector, so the role should be established firmly in the system prompt and treated as non-negotiable — user attempts to reassign it get ignored. And assigning a regulated professional identity like 'financial advisor' can invite the model to produce advice the product isn't licensed to give. The role should describe the assistant's function, not a licensed profession."

## 8. Likely Follow-ups

**Q: Does role prompting improve accuracy?**
Evidence is weak. It reliably affects register, vocabulary, and what the model treats as relevant, but it doesn't change what the model knows. It's widely presented as an accuracy technique and that's an overclaim — I'd describe it as a style and scoping tool.

**Q: What's better than a persona?**
Explicit behavioral constraints. "Respond in under 150 words, use plain language, cite the section for every figure, decline account-specific questions" specifies exactly the behavior you want. "You are a world-class expert" specifies nothing actionable — it's aspirational rather than operational.

**Q: Where is role prompting genuinely useful?**
Register and scope. Register because the same facts delivered to a retail customer versus in an internal compliance memo should read differently, and a role communicates that efficiently. Scope because "decline questions outside retail banking products" is a boundary that's hard to express as cleanly any other way.

**Q: Are there risks?**
Two. Roleplay framing is a known jailbreak vector, so the role should be fixed in the system prompt and user attempts to reassign it ignored. And assigning a regulated professional identity — "you are a financial advisor" — can invite the model to produce advice the product isn't licensed to give. The role should describe the assistant's function, not a profession.

**Q: Can a role conflict with other instructions?**
Yes, and it's a common quality bug. "You are an expert who explains thoroughly" alongside "keep responses under fifty words," or "you are a financial advisor" alongside "never give financial advice." The model resolves the conflict arbitrarily, and the symptom looks like model unreliability rather than a prompt problem.

## 9. Common Mistakes

- Presenting role prompting as an accuracy technique.
- Vague aspirational personas instead of explicit constraints.
- Assigning a regulated professional identity.
- Roles that conflict with other system-prompt instructions.
- Treating the role as negotiable by the user.

## 10. What to Remember

- **It affects style and scope reliably; accuracy weakly at best.** Don't overclaim.
- **Explicit constraints beat aspirational personas** — specify behavior, not identity.
- **Scope definition is where it's load-bearing** — "decline questions outside X."
- **Roleplay is a jailbreak vector** — fix the role in the system prompt, non-negotiable.
- **Avoid regulated professional identities** that invite unlicensed advice.
