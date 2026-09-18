# "How Would You Convert It Into an Agent?"

> **Phase 32 · LANGGRAPH PROJECT DEEP DIVE · Topic 13**

## 1. Definition

A design question with a trap in it. The strongest answer explains what changes — control moving from the graph to the model — and then argues about whether that trade is worth making for this workflow.

## 2. Simple Explanation

In a workflow, you decide the steps. In an agent, the model decides them.

That buys flexibility on questions you didn't anticipate, and it costs predictability on the ones you did. For a banking FAQ system, most questions are anticipated.

## 3. How It Works

```
WHAT ACTUALLY CHANGES

WORKFLOW              AGENT
fixed graph           model picks the next action
you control order     the model controls order
bounded by edges      bounded by a step limit
predictable cost      variable cost per request
testable paths        a path space you can't enumerate
failure = a bad       failure = an unanticipated
  answer on a known     sequence you've never seen
  path

THE MECHANICAL CHANGE IS SMALL
  · define tools instead of nodes
  · one node that calls the model with the tool list
  · a conditional edge: tool call → execute → back
  · a step limit and a termination condition

THE CONSEQUENCES ARE NOT SMALL.
```

## 4. Practical Example

**The reliability arithmetic, which is the core argument:**

```
Agent reliability compounds MULTIPLICATIVELY.

  0.95 per step ^ 10 steps ≈ 0.60 end to end

A ten-step agent where every step is 95% reliable
completes correctly about sixty percent of the time.

A fixed workflow doesn't have this problem in the same
way, because the sequence is not a decision that can be
wrong — only the content of each step can be.

Which is why, for a task whose steps are known, a
workflow is more reliable than an agent doing the same
thing. Agency is worth paying for when the steps AREN'T
known.
```

**When an agent genuinely earns its place here:**

```
NOT for the main FAQ path — that sequence is known and
fixed, and making it agentic trades reliability for
flexibility nobody needs.

WHERE IT WOULD EARN IT:

  MULTI-PART QUESTIONS
    "What's the wire fee and how do I raise my daily
     limit?" — two retrievals over different topics,
    then a synthesis. The number of retrievals isn't
    known in advance.

  COMPARISONS
    "How do Premier and Private differ on international
     transfers?" — retrieve per tier, then compare.

  PROGRESSIVE NARROWING
    an ambiguous question where the right move is to
    retrieve, notice the ambiguity, and ask a
    clarifying question rather than guess.

The honest shape is HYBRID: keep the deterministic
pipeline as the default path, and route only the
questions that need variable steps into an agentic
subgraph. Most traffic stays predictable.
```

**What has to be built alongside the agency:**

```
STEP LIMIT           hard, with a defined outcome at the
                     limit — abstain, not error
TOKEN BUDGET         per run, checked in state
TOOL ALLOWLIST       narrow. Every tool added expands
                     what an injection can reach.
READ-ONLY            for a Q&A system there is no reason
                     for a write tool, and that single
                     constraint means the worst outcome
                     of a hijacked agent is a wrong
                     answer
LOOP DETECTION       models repeat failing tool calls;
                     detect a repeated call with
                     identical arguments and break
OBSERVABILITY        every tool call, argument, and
                     result traced — otherwise "why did
                     it do that" is unanswerable
```

**The security shift worth naming:** a workflow's retrieved content can only influence the answer. An agent's retrieved content can influence which tool gets called next — so indirect prompt injection goes from a content problem to a control problem. Keeping tools read-only is what keeps that bounded.

## 5. Why It Matters

- **Reliability compounds multiplicatively** — 0.95^10 ≈ 60%.
- **Agency is worth paying for when the steps aren't known**, not otherwise.
- **Injection becomes a control problem** once the model chooses actions.

## 6. Trade-offs / Failure Modes

| Mistake | Consequence |
|---|---|
| Converting the whole workflow | Trades reliability for unneeded flexibility |
| No step limit | Unbounded cost and latency |
| A broad tool set | Expands the injection blast radius |
| Any write capability in a Q&A system | A wrong answer becomes an action |
| No loop detection | The model repeats a failing call |
| Treating it as a small change | The mechanics are small; the consequences aren't |

**On testing:** a workflow has enumerable paths, so you can test them. An agent's path space isn't enumerable, which changes evaluation from path coverage to outcome-based testing over a scenario set — and that's a meaningfully harder and more expensive testing problem. It's a real reason not to convert without a reason.

**On cost predictability:** a fixed workflow costs roughly the same per request. An agent's cost varies with how many steps it decides to take, which makes capacity planning and per-request budgeting harder. For a high-volume FAQ system that variability has real operational weight.

## 7. Interview Answer

> "The mechanical change is small and the consequences aren't, so I'd separate those.
>
> Mechanically: define tools instead of fixed nodes, have one node that calls the model with the tool list, a conditional edge that routes to tool execution and back, and a step limit with a termination condition. That's not much work.
>
> What changes is who controls the order. In a workflow I decide the sequence; in an agent the model does. That buys flexibility on questions I didn't anticipate and costs predictability on the ones I did.
>
> And the argument I'd make is that reliability compounds multiplicatively. A ten-step agent where each step is ninety-five percent reliable completes correctly about sixty percent of the time. A fixed workflow doesn't have that problem in the same shape, because the sequence isn't a decision that can be wrong — only the content of each step is.
>
> Which leads to the actual answer: for the main FAQ path I wouldn't convert it. That sequence is known and fixed, and making it agentic trades reliability for flexibility nobody needs.
>
> Where agency genuinely earns its place is where the number of steps isn't known in advance. Multi-part questions — what's the wire fee and how do I raise my daily limit — which need two retrievals over different topics and then a synthesis. Comparisons across product tiers. And progressive narrowing, where the right move is to retrieve, notice the question is ambiguous, and ask a clarifying question rather than guess.
>
> So the shape I'd build is hybrid: keep the deterministic pipeline as the default path, and route only the questions that need variable steps into an agentic subgraph. Most traffic stays predictable, and the agency is scoped to where it pays.
>
> Alongside the agency I'd need several things that a fixed workflow gets for free. A hard step limit with a defined outcome at the limit — abstain, not error. A token budget per run checked in state. Loop detection, because models repeat failing tool calls, so a repeated call with identical arguments should break the loop. And full tracing of every tool call, argument, and result, because otherwise 'why did it do that' is unanswerable.
>
> And a narrow, read-only tool set. This is the security point I'd emphasize: in a workflow, retrieved content can only influence the answer. In an agent, retrieved content can influence which tool gets called next — so indirect prompt injection goes from a content problem to a control problem. Keeping every tool read-only means the worst outcome of a hijacked agent is still just a wrong answer, and that single constraint does more than any filter.
>
> Two other costs worth naming. Testing changes shape — a workflow has enumerable paths you can cover, and an agent's path space isn't enumerable, so evaluation becomes outcome-based over a scenario set, which is harder and more expensive. And cost stops being predictable per request, which matters for capacity planning on a high-volume FAQ system.
>
> So my answer is: yes for a scoped subset, no for the main path, and the hybrid is the design."

## 8. Likely Follow-ups

**Q: Why not make the whole thing an agent?**
Because reliability compounds multiplicatively — ten steps at 95% each is about 60% end to end — and the main FAQ sequence is already known. Agency buys flexibility the known path doesn't need.

**Q: Where would an agent actually help?**
Where the number of steps isn't known in advance: multi-part questions, cross-tier comparisons, and progressive narrowing on ambiguous questions. Those need a variable number of retrievals, which a fixed graph can't express cleanly.

**Q: What changes about security?**
Retrieved content stops being only content. In an agent it can influence which tool gets called, so injection becomes a control problem rather than a content one — which is why the tool set stays narrow and read-only.

**Q: What has to be added?**
A hard step limit with abstention at the limit, a per-run token budget, loop detection for repeated identical tool calls, a narrow read-only tool allowlist, and full tracing of every call and result.

**Q: How does testing change?**
From path coverage to outcome-based evaluation over scenarios, because the path space stops being enumerable. That's meaningfully harder and more expensive, and it's a real reason not to convert without a need.

## 9. Common Mistakes

- Converting the whole workflow because agents sound more capable.
- No step limit or token budget.
- A broad tool set, or any write capability.
- Ignoring that injection becomes a control problem.
- Treating cost as still predictable per request.

## 10. What to Remember

- **0.95^10 ≈ 60%** — reliability compounds multiplicatively.
- **Agency pays when the steps aren't known**, not otherwise.
- **Hybrid**: deterministic default path, agentic subgraph for the rest.
- **Read-only tools** keep a hijacked agent bounded to a wrong answer.
- **Path space stops being enumerable** — testing gets harder.
