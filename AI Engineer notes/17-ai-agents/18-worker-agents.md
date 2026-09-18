# Worker Agents

> **Phase 17 · AI AGENTS · Topic 18**

## 1. Definition

Specialist agents that execute a delegated sub-task within a narrow scope — a limited tool set, focused instructions, and no visibility into the wider conversation.

## 2. Simple Explanation

A worker agent does one kind of job well. It receives a self-contained task, uses its small set of tools, and returns a result.

The narrowness is the point: fewer tools means better selection, and a focused prompt means better behaviour on that specific domain.

## 3. How It Works

```
INPUT     a self-contained task + relevant verified facts
SCOPE     3-7 tools in one domain
PROMPT    instructions for that domain only
OUTPUT    a structured result the supervisor can use
BOUNDARY  cannot delegate further; cannot see the conversation
```

**The structured output requirement matters more than it looks:**

```python
{
  "status": "success" | "partial" | "failed",
  "result": {...},                    # domain-specific
  "facts_established": {...},         # for the supervisor's state
  "unable_to_determine": ["..."],     # explicit gaps
  "citations": ["..."],
}
```

**Free-text results force the supervisor to parse prose** and re-derive what happened. A structured result — especially `facts_established` and `unable_to_determine` — lets the supervisor update state directly and know precisely what's missing.

## 4. Practical Example

**A worker's scope, concretely:**

```
ACCOUNTS WORKER
  tools:   get_balance, get_tier, get_transactions,
           get_statement
  prompt:  "You answer account information questions.
            Read-only. If asked about payments or disputes,
            return status=failed with a note — do not
            improvise."
  cannot:  initiate payments, modify anything, call other agents
```

**The "do not improvise" instruction is load-bearing.** A worker asked something outside its scope will otherwise attempt an answer using the tools it has, producing a plausible wrong result that the supervisor may accept. Explicit refusal is far safer than best-effort.

**Why narrow scope actually improves quality:**

```
Fewer tools        → better selection accuracy
Focused prompt     → domain-specific instructions fit in
                     a reasonable prompt
Smaller context    → the task stays salient
Clear boundary     → out-of-scope requests refused rather
                     than fudged
```

**And the security argument, which is the strongest one in banking:**

```
A read-only worker CANNOT cause damage regardless of what
the supervisor asks it to do — or what a prompt injection
in retrieved content tries to make it do.

Scope is enforced by the TOOLS AVAILABLE, not by the prompt.
That's a real containment boundary, and it's why permission
separation is the best justification for multi-agent design.
```

## 5. Why It Matters

- **Narrow scope measurably improves tool selection** and task focus.
- **Tool availability is a real containment boundary**, unlike prompt instructions.
- **Structured output** is what lets a supervisor update state rather than parse prose.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Missing context** | The worker wasn't told what it needed |
| **Scope creep** | Workers accumulating tools until they're general |
| **Out-of-scope improvisation** | Plausible wrong answers instead of refusal |
| **Unstructured results** | The supervisor must parse prose |
| **No partial-result reporting** | All-or-nothing hides what was achieved |
| **Duplicated work** | Two workers fetching the same fact |

**On partial results:** a worker that establishes two of three requested facts should say so — `status: partial`, with what it found and what it couldn't. Returning only failure discards real work and forces the supervisor to retry from scratch.

**On scope creep:** workers tend to accumulate tools as edge cases appear, until each is a general agent and the decomposition's benefit is gone. Treating the tool list as a reviewed interface — changes need justification — is what keeps the design intact over time.

## 7. Interview Answer

> "A worker agent executes a delegated sub-task within a narrow scope — a limited tool set, focused instructions, and no visibility into the wider conversation.
>
> The narrowness is the point. Fewer tools means better selection accuracy, a focused prompt means domain-specific instructions actually fit, and a smaller context keeps the task salient. So an accounts worker has four read-only tools and a prompt about account questions, and nothing else.
>
> The instruction I'd make sure is there is 'if asked something outside your scope, return failed with a note — do not improvise'. Without that, a worker asked about payments will attempt an answer using the tools it has and produce a plausible wrong result the supervisor may well accept. Explicit refusal is much safer than best effort.
>
> The security argument is the strongest one in a banking context. A read-only worker cannot cause damage regardless of what the supervisor asks it to do — or what a prompt injection in retrieved content tries to make it do. Scope is enforced by which tools exist, not by prompt instructions, so it's a real containment boundary rather than a request. That's why permission separation is the best justification for multi-agent design generally.
>
> On the interface, I'd require structured output: status of success, partial, or failed; the result; facts established; what it couldn't determine; and citations. Free text forces the supervisor to parse prose and re-derive what happened. A structured result lets it update state directly and know exactly what's missing.
>
> Partial results matter specifically. A worker that establishes two of three requested facts should say so rather than returning failure — otherwise real work is discarded and the supervisor retries from scratch.
>
> And the thing that degrades these designs over time is scope creep. Workers accumulate tools as edge cases appear until each is a general agent and the benefit is gone. Treating the tool list as a reviewed interface, where changes need justification, is what keeps it intact."

## 8. Likely Follow-ups

**Q: Why does narrow scope help?**
Fewer tools improves selection accuracy, a focused prompt lets domain-specific instructions fit without bloat, a smaller context keeps the task salient, and a clear boundary means out-of-scope requests get refused rather than fudged. It's a measurable quality improvement, not just organization.

**Q: What should a worker return?**
Structured output — status of success, partial, or failed; the result; facts established for the supervisor's state; what it couldn't determine; and citations. Free-text results force the supervisor to parse prose and guess what happened, which reintroduces exactly the ambiguity the structure removes.

**Q: What happens if a worker is asked something out of scope?**
It should explicitly refuse with a failure status and a note. Left to itself it will improvise with whatever tools it has and produce a plausible wrong answer the supervisor may accept, which is far worse than a clean refusal the supervisor can route elsewhere.

**Q: Why is scope a security control?**
Because it's enforced by which tools exist, not by prompt instructions. A read-only worker cannot cause damage no matter what it's asked or what a prompt injection tries to make it do. That makes it a genuine containment boundary rather than a request the model may ignore.

**Q: How do these designs degrade?**
Scope creep. Workers accumulate tools as edge cases come up, until each one is effectively a general agent and the decomposition benefit is gone. Treating the tool list as a reviewed interface where additions need justification is what prevents it.

## 9. Common Mistakes

- Letting workers improvise outside their scope.
- Returning free text instead of structured results.
- Reporting total failure when partial results exist.
- Allowing tool lists to grow unreviewed.
- Relying on the prompt rather than tool availability to bound a worker.

## 10. What to Remember

- **Narrow scope improves selection, focus, and safety.**
- **Explicitly instruct refusal** for out-of-scope requests.
- **Tool availability is the real boundary** — prompts aren't.
- **Structured output** with facts established and explicit gaps.
- **Report partial results**; guard the tool list against creep.
