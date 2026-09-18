# Tool Selection

> **Phase 17 · AI AGENTS · Topic 09**

## 1. Definition

The model choosing which tool to invoke for a given situation. Accuracy depends far more on how tools are described and organized than on model capability.

## 2. Simple Explanation

The model sees a list of tool names, descriptions, and parameter schemas, and picks one. It has nothing else to go on.

So selection failures are usually caused by descriptions that don't distinguish tools clearly, or by there being too many tools to choose between.

## 3. How It Works

**What the model actually sees:**

```
Tool: get_fee_schedule
  "Get the standard fee rates for a product and tier."
Tool: get_transaction_fee
  "Get the fee charged on a specific transaction."
Tool: get_fee_waiver_status
  "Check remaining fee waivers for a customer this month."
```

**The failure these three invite:** a question like "what's my transfer fee?" is genuinely ambiguous between the first two. The model will pick one, and whichever it picks will be right half the time — because the *question* was ambiguous, not because the model was weak.

**The fix is in the descriptions:**

```
get_fee_schedule
  "Standard published rates by product and tier. Use for
   'what IS the fee'. NOT for what a customer was actually
   charged — use get_transaction_fee for that."
```

## 4. Practical Example

**Three patterns for keeping selection accurate at scale:**

```
1. CONSOLIDATE
   Instead of get_balance / get_transactions / get_tier:
     get_account_info(account_id, fields=[...])
   Three selection decisions become one.

2. HIERARCHICAL SELECTION
   First: choose a domain — accounts | payments | disputes
   Then:  choose a tool within that domain
   Keeps the visible tool set small at each decision.

3. DYNAMIC TOOL SETS
   Offer only tools relevant to the detected intent.
   A fee question doesn't need dispute-filing tools in scope.
```

**Consolidation is the one I'd reach for first** — it reduces the decision count rather than restructuring the decision, and it's a smaller change.

**Diagnosing a selection failure:**

```
Read the agent's REASONING for the wrong call.

  "The customer mentioned a fee, so I'll check the fee
   schedule"           → the description didn't distinguish
                          schedule from charged. FIX: description.

  "I need the transaction fee but no tool provides it"
                       → the tool exists but wasn't recognized.
                          FIX: description or naming.

  "I'll try get_account_info and see what comes back"
                       → too many options, guessing.
                          FIX: consolidate or reduce.

Different fixes. Reading the reasoning is what tells them apart.
```

## 5. Why It Matters

- **It's the main determinant of agent correctness** — a wrong tool poisons everything after it.
- **Descriptions are the lever**, not model choice, which is where people look first.
- **The reasoning trace diagnoses the cause**, and the fixes differ substantially.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Overlapping tools** | Genuine ambiguity in the description space |
| **Too many tools** | Accuracy degrades past ~15–20 |
| **Names that don't match descriptions** | Confusing signal |
| **No negative guidance** | "NOT for X" is highly effective and rare |
| **Missing tool** | The model improvises with the wrong one |
| **Wrong tool + no verification** | Errors compound down the path |

**On negative guidance:** telling the model what a tool is *not* for is disproportionately effective and rarely done. "Use for published rates, NOT for what was actually charged" resolves the exact confusion that the positive description leaves open.

**On evaluating selection:** build a set of representative queries with the correct tool labelled, run them, and measure selection accuracy directly. That isolates the problem from the rest of the agent — if selection is 70%, no amount of prompt tuning elsewhere will make the agent reliable, and you know precisely what to fix.

## 7. Interview Answer

> "Tool selection is the model choosing which tool to call, and accuracy depends much more on how tools are described and organized than on model capability.
>
> The model only sees names, descriptions, and parameter schemas. So if two tools are genuinely ambiguous from those descriptions — a fee schedule lookup and a transaction fee lookup, say — the model picks one and is right about half the time. That isn't a weak model, it's an under-specified description.
>
> The single most effective fix is negative guidance, which is rarely used. 'Standard published rates by product and tier — use for what the fee IS. NOT for what a customer was actually charged; use get_transaction_fee for that.' Telling the model what a tool isn't for resolves exactly the confusion the positive description leaves open.
>
> At scale there are three patterns. Consolidate — instead of separate balance, transactions, and tier tools, one get_account_info with a fields parameter, turning three decisions into one. Hierarchical selection — pick a domain first, then a tool within it, keeping the visible set small at each step. And dynamic tool sets — only expose tools relevant to the detected intent, so a fee question doesn't have dispute-filing tools in scope. I'd reach for consolidation first because it reduces the number of decisions rather than restructuring them.
>
> To diagnose a specific failure I'd read the agent's reasoning for the wrong call. If it says 'the customer mentioned a fee so I'll check the fee schedule', the description didn't distinguish schedule from charged — that's a description fix. If it says 'no tool provides this' when one does, that's a naming or description fix. If it says 'I'll try this and see', it's guessing among too many options — consolidate. Different causes, different fixes, and the reasoning is what tells them apart.
>
> And I'd measure it directly: a set of representative queries with the correct tool labelled, run and scored for selection accuracy. That isolates it from everything else — if selection is seventy percent, no amount of prompt tuning elsewhere makes the agent reliable, and you know exactly what to work on."

## 8. Likely Follow-ups

**Q: Why does an agent pick the wrong tool?**
Usually because the descriptions don't distinguish the candidates. The model sees only names, descriptions, and schemas, so if two tools are ambiguous from those it picks roughly at random. That's a description problem rather than a model capability problem, and people debug the wrong layer.

**Q: What's the most effective fix?**
Negative guidance in the description — saying explicitly what a tool is not for and naming the alternative. It resolves the exact confusion the positive description leaves open, and it's disproportionately effective for how rarely it's used.

**Q: How do you handle many tools?**
Consolidate related operations into one tool with a parameter, use hierarchical selection where the agent picks a domain first, or expose only tools relevant to the detected intent. Consolidation first, since it reduces the number of decisions rather than restructuring how they're made.

**Q: How do you diagnose a selection failure?**
Read the reasoning attached to the wrong call. It distinguishes a description that failed to disambiguate, a tool the model didn't recognize as relevant, and outright guessing among too many options — three different causes with three different fixes.

**Q: How would you measure selection accuracy?**
A labelled set of representative queries with the correct tool for each, run and scored in isolation from the rest of the agent. If selection is at seventy percent, nothing else in the system will make the agent reliable, so measuring it separately tells you where the work actually is.

## 9. Common Mistakes

- Blaming the model when descriptions are ambiguous.
- Omitting negative guidance about what a tool is not for.
- Exposing every tool on every request.
- Not reading the reasoning before attempting a fix.
- Never measuring selection accuracy in isolation.

## 10. What to Remember

- **The model sees only names, descriptions, and schemas** — that's the lever.
- **Negative guidance ("NOT for X") is the highest-value addition.**
- **Consolidate, then go hierarchical, then scope dynamically.**
- **The reasoning trace tells you which fix applies.**
- **Measure selection accuracy in isolation** on a labelled query set.
