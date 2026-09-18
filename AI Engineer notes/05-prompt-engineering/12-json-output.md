# JSON Output

> **Phase 05 · PROMPT ENGINEERING · Topic 12**

## 1. Definition

Getting an LLM to produce machine-parseable structured output. Modern providers support **constrained decoding** against a schema, which guarantees valid structure rather than merely requesting it.

## 2. Simple Explanation

Asking politely for JSON gets you JSON most of the time. "Most of the time" isn't good enough for a production parser.

Constrained decoding changes the mechanism: the provider masks the token distribution at each step so only tokens that keep the output schema-valid can be sampled. Invalid JSON becomes impossible rather than unlikely.

## 3. How It Works

**Three approaches, in increasing reliability:**

| Approach | Guarantee | Notes |
|---|---|---|
| **Prompt request** | None | "Respond in JSON" — mostly works, fails at the tail |
| **JSON mode** | Valid JSON | Syntactically valid, but not your schema |
| **Structured output / constrained decoding** | **Valid against your schema** | The right answer |

**How constrained decoding works:**

```
At each decoding step, the provider computes which tokens
could still lead to a schema-valid completion, masks the
rest to −∞, and samples only from what remains.

So the output is valid BY CONSTRUCTION, not by the model
happening to follow instructions.
```

**Function calling is the same mechanism** — you define a schema, the model emits arguments conforming to it. Whether it's called "structured output" or "function calling" depends on whether the result is returned to you or dispatched to a tool.

## 4. Practical Example

**A schema for a RAG response:**

```python
schema = {
  "type": "object",
  "properties": {
    "answer":     {"type": "string"},
    "citations":  {"type": "array", "items": {"type": "integer"}},
    "answered":   {"type": "boolean"},
    "confidence": {"type": "string", "enum": ["high","medium","low"]},
  },
  "required": ["answer", "citations", "answered", "confidence"],
  "additionalProperties": False,
}
```

**`enum` is the underused field.** Constraining `confidence` to three values means the model cannot emit "fairly high" or "moderate-to-high" — the tokens simply aren't available. Same for classification labels, which otherwise get invented.

**`additionalProperties: false`** prevents the model adding fields you don't expect, which keeps downstream parsing stable.

**The `answered` boolean makes abstention machine-readable:**

```
Instead of string-matching "I don't have information about that",
a boolean field makes abstention a structured signal you can
count, alert on, and route on.

That turns the abstention rate from something you'd have to
infer into a first-class metric.
```

**Still validate after parsing:**

```python
data = json.loads(response)
# Schema validity ≠ semantic validity
assert all(c in retrieved_ids for c in data["citations"])  # citations resolve
assert data["answered"] or data["answer"].startswith("I don't have")
```

Constrained decoding guarantees the *shape*, not that the contents make sense.

## 5. Why It Matters

- **It's the difference between a reliable integration and an occasionally-broken one** — parse failures at the tail are exactly what breaks in production.
- **Enums constrain classification outputs** at the decoding level, which prompting alone can't do.
- **A structured abstention flag** turns a key safety behavior into a measurable metric.

## 6. Trade-offs / Failure Modes

| Failure | Detail |
|---|---|
| **Prompt-requesting JSON** | Fails at the tail; parse errors under load |
| **JSON mode without a schema** | Valid JSON, wrong shape |
| **No enums on categorical fields** | Model invents values |
| **`additionalProperties` unset** | Unexpected fields break parsing |
| **Assuming schema validity means correctness** | Citations can be valid integers and still not resolve |
| **Over-complex schemas** | Deep nesting degrades quality |
| **Reasoning squeezed into a field** | Give reasoning its own field, before the answer |

**On ordering within the schema:** because generation is sequential, a field generated earlier conditions later ones. Putting a `reasoning` field *before* `answer` lets the model work through the problem before committing — the same mechanism as chain-of-thought, expressed in the schema. Putting reasoning after the answer is wasted.

**On schema complexity:** deeply nested schemas with many optional branches measurably degrade quality. Flatter is better, and splitting one complex extraction into two simpler calls often outperforms a single elaborate schema.

## 7. Interview Answer

> "Getting structured output has three levels. Asking for JSON in the prompt works most of the time and fails at the tail — which is exactly what breaks under production load. JSON mode guarantees syntactically valid JSON but not your shape. Structured output with constrained decoding guarantees validity against your schema.
>
> The mechanism is what makes it reliable. At each decoding step the provider computes which tokens could still lead to a schema-valid completion and masks the rest, so the output is valid by construction rather than by the model happening to follow instructions. Function calling is the same mechanism — you define a schema and the model emits conforming arguments.
>
> Two schema fields I'd emphasize. Enums, because constraining a field to three allowed values means the model *cannot* emit 'fairly high' — those tokens aren't available. That's the classification-label problem solved at the decoding level rather than by hoping. And `additionalProperties: false`, so the model can't add fields that break downstream parsing.
>
> A design choice I like in RAG: an explicit `answered` boolean. Instead of string-matching 'I don't have information about that,' abstention becomes a structured signal I can count, alert on, and route on — which turns the abstention rate from something I'd have to infer into a first-class metric.
>
> On ordering: because generation is sequential, fields generated earlier condition later ones. Putting a reasoning field *before* the answer field lets the model work through the problem before committing — the same mechanism as chain-of-thought, expressed in the schema. Reasoning placed after the answer is wasted.
>
> And I'd still validate semantically after parsing. Schema validity guarantees shape, not sense — citation IDs can be valid integers and still not correspond to retrieved chunks. So I'd check that citations resolve and that the abstention flag matches the answer text."

## 8. Likely Follow-ups

**Q: How does constrained decoding work?**
At each decoding step the provider computes which tokens could still lead to a schema-valid completion and masks the rest to negative infinity before sampling. So invalid output is impossible rather than unlikely — the structure is guaranteed by construction rather than by instruction-following.

**Q: What's the difference between JSON mode and structured output?**
JSON mode guarantees syntactically valid JSON — it'll parse. Structured output guarantees validity against *your* schema — the right fields, the right types, the allowed enum values. JSON mode still lets the model invent field names or omit required ones, so it solves parse errors without solving shape errors.

**Q: Why are enums important?**
Because they constrain categorical fields at the decoding level. Without an enum, a confidence field gets "fairly high" or a label field gets an invented category, and you're doing string normalization downstream. With an enum, those tokens aren't available to sample — the problem is solved rather than mitigated.

**Q: Does field order in the schema matter?**
Yes, because generation is sequential and earlier fields condition later ones. A reasoning field placed before the answer lets the model work through the problem before committing — the same mechanism as chain-of-thought. Placed after the answer, it's post-hoc rationalization and adds cost without improving the answer.

**Q: Is schema validity enough?**
No — it guarantees shape, not semantics. Citation IDs can be valid integers that don't correspond to any retrieved chunk. An `answered` flag can be true while the answer text says the model doesn't know. So I'd validate semantically after parsing: citations resolve, flags match content, figures appear in the cited chunks.

## 9. Common Mistakes

- Requesting JSON in the prompt instead of using constrained decoding.
- Using JSON mode without a schema.
- Omitting enums on categorical fields.
- Placing a reasoning field after the answer.
- Assuming schema validity implies semantic correctness.

## 10. What to Remember

- **Constrained decoding makes invalid output impossible**, not just unlikely.
- **Three levels:** prompt request (no guarantee) → JSON mode (valid JSON) → schema (valid shape).
- **Use enums** for categorical fields and **`additionalProperties: false`**.
- **Reasoning field goes before the answer** — sequential generation means order matters.
- **Validate semantically after parsing** — shape ≠ sense.
