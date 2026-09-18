# Prompt Templates

> **Phase 05 · PROMPT ENGINEERING · Topic 14**

## 1. Definition

Parameterized prompt structures with variable slots, stored as versioned artifacts rather than string literals in code. They're what makes prompts reviewable, diffable, testable, and attributable.

## 2. Simple Explanation

A prompt scattered through application code as f-strings can't be reviewed, diffed meaningfully, or rolled back independently of a deploy.

A template is a named, versioned artifact with explicit variables. That's the difference between a prompt you can operate and one you can only edit.

## 3. How It Works

```yaml
# prompts/banking_rag/v7.yaml
name: banking_rag
version: 7
model: gemini-2.5-pro-002
temperature: 0
max_output_tokens: 500

system: |
  You are a support assistant for {{bank_name}} retail customers.
  Answer using ONLY the information in <context>.
  If the context does not contain the answer, respond exactly:
  "{{abstention_message}}"
  Cite the source number for every factual claim.

user: |
  <context>
  {{#each chunks}}
  [{{id}}] {{section}} (effective {{effective_date}})
  {{text}}
  {{/each}}
  </context>

  Question: {{question}}
```

**What versioning the template as an artifact buys:**

| Capability | Why it needs a template |
|---|---|
| Meaningful diffs in review | Structure is explicit, not embedded in code |
| Rollback without a deploy | Version is data, not code |
| A/B testing two versions | Both can be loaded simultaneously |
| Attributing a quality change | Log the template version with each request |
| Consistency across call sites | One definition, many callers |

## 4. Practical Example

**Log the template version with every request:**

```python
response = llm.generate(rendered_prompt)
log({
    "prompt_name": "banking_rag",
    "prompt_version": 7,
    "model_version": "gemini-2.5-pro-002",
    "config_version": "rag-v4.2.1",
    ...
})
```

**Without that, a quality change is unattributable.** Several things ship in a week; you can't tell which caused a metric shift.

**Rendering safety — the detail that matters:**

```python
# ❌ Naive string formatting
prompt = f"<context>{chunk_text}</context>\n{question}"
# chunk_text can contain "</context><instructions>..."

# ✅ Escape variables destined for structural positions
prompt = template.render(
    chunks=[escape_delimiters(c) for c in chunks],
    question=escape_delimiters(question),
)
```

Template engines generally don't escape by default the way HTML templating does, so this has to be explicit.

**Where the template ends and the code begins:**

```
IN the template:  instructions, structure, formatting, variable slots
IN code:          which chunks are selected, how they're ordered,
                  what's deduplicated, budget enforcement

Retrieval and assembly logic belongs in code. Putting it in
the template makes it untestable.
```

## 5. Why It Matters

- **It's what converts prompt editing into prompt engineering** — reviewable, diffable, attributable.
- **Version logging** is what makes quality changes traceable to a specific revision.
- **Escaping variables in structural positions** is a concrete injection mitigation.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Prompts as f-strings in code** | Unreviewable, undiffable, requires a deploy to change |
| **No version logging** | Quality changes unattributable |
| **Unescaped variables** | Injection via forged delimiters |
| **Retrieval logic in the template** | Untestable; mixes concerns |
| **Over-templating** | Excessive parameterization makes the prompt unreadable |
| **No eval run on template changes** | A prompt change ships untested |
| **Template drift across environments** | Different versions in staging and production |

**On treating prompt changes as code changes:** a prompt edit can change system behavior as much as a code change, so it deserves the same rigor — review, an eval run against the held-out set, and a versioned deploy. Teams that treat prompts as configuration to be tweaked casually get quality regressions they can't explain.

**On hot-reloading:** storing templates outside the application binary allows changing them without a deploy, which is genuinely useful for rapid iteration. The risk is that it bypasses code review, so it should still go through a gated process with an eval run — the speed benefit shouldn't cost the discipline.

## 7. Interview Answer

> "A prompt template is a parameterized prompt structure with variable slots, stored as a versioned artifact rather than as string literals in code. That distinction is what converts prompt editing into prompt engineering.
>
> Concretely: an f-string scattered through application code can't be reviewed meaningfully, can't be diffed in a way that shows what actually changed, and requires a deploy to modify. A named versioned template can be diffed, reviewed, rolled back independently, A/B tested against another version, and — critically — logged with each request so a quality change is attributable to a specific revision.
>
> That last part matters a lot operationally. Several things ship in a week; without a prompt version in the request log you can't tell which one moved a metric.
>
> One safety detail: template engines generally don't escape variables by default the way HTML templating does, so retrieved text substituted into a structural position can contain a forged closing delimiter. I'd escape variables destined for those positions explicitly.
>
> And I'd be clear about the boundary between template and code. Instructions, structure, and formatting go in the template. Which chunks are selected, how they're ordered, what's deduplicated, and budget enforcement go in code — putting retrieval logic in the template makes it untestable.
>
> The discipline point I'd make is that a prompt change can alter system behavior as much as a code change, so it deserves the same rigor: review, an eval run against a held-out set, and a versioned deploy. Teams that treat prompts as casual configuration get quality regressions they can't explain.
>
> Hot-reloading templates without a deploy is genuinely useful for iteration speed, but it shouldn't bypass the eval gate — the speed benefit shouldn't cost the discipline."

## 8. Likely Follow-ups

**Q: Why not just use f-strings in code?**
Because you lose reviewability, meaningful diffs, independent rollback, and A/B capability. And you can't log a prompt version with each request, which means quality changes become unattributable when several things ship in the same week.

**Q: What goes in the template versus in code?**
Instructions, structure, and formatting go in the template. Chunk selection, ordering, deduplication, and context-budget enforcement go in code. Retrieval logic embedded in a template is untestable and mixes concerns — the template should render what code decided.

**Q: How do you handle escaping?**
Explicitly, because template engines generally don't escape by default the way HTML templating does. Retrieved text substituted into a structural position can contain a forged closing delimiter, so I'd escape or strip delimiter-like sequences from any variable going into a structural slot.

**Q: Should prompt changes go through code review?**
Yes. A prompt change can alter system behavior as much as a code change, so it deserves review, an eval run against the held-out set, and a versioned deploy. Treating prompts as casual configuration is how teams get quality regressions they can't explain.

**Q: Is hot-reloading templates a good idea?**
It's genuinely useful for iteration speed, since you can change behavior without a deploy. The risk is bypassing review and the eval gate. I'd keep the ability but route changes through a gated process — versioned, reviewed, eval-checked — so speed doesn't cost discipline.

## 9. Common Mistakes

- Prompts as f-strings scattered through application code.
- Not logging the prompt version with requests.
- Failing to escape variables in structural positions.
- Putting retrieval or selection logic in the template.
- Shipping prompt changes without an eval run.

## 10. What to Remember

- **A named, versioned artifact** — not a string literal in code.
- **Log the prompt version with every request** or changes are unattributable.
- **Escape variables in structural positions** — engines don't do it by default.
- **Instructions and structure in the template; selection logic in code.**
- **Treat a prompt change like a code change** — review, eval run, versioned deploy.
