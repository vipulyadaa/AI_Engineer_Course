# Structured Output

> **Phase 19 · GOOGLE GEMINI · Topic 09**

## 1. Definition

Constraining Gemini's response to a JSON schema, so the output conforms by construction rather than by the model complying with an instruction and your code parsing the result.

## 2. Simple Explanation

You provide a schema. The response is JSON matching it.

The difference from asking for JSON in the prompt is that decoding is constrained — it isn't the model usually producing valid JSON, it's the output conforming by construction.

## 3. How It Works

```python
response = model.generate_content(
    contents,
    generation_config=GenerationConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "answer":     {"type": "string"},
                "fee_amount": {"type": ["number", "null"]},
                "citations":  {"type": "array",
                               "items": {"type": "string"}},
                "confidence": {"type": "string",
                               "enum": ["high", "medium", "low"]},
            },
            "required": ["answer", "citations"],
        },
    ),
)
data = json.loads(response.text)
```

**Two fields do the work:** `response_mime_type` set to JSON, and `response_schema` describing the shape.

## 4. Practical Example

**Where it earns its place beyond agents:**

```
CLASSIFICATION      enum-constrained categories — the model
                    can't invent a new one
EXTRACTION          fixed fields with explicit nullable types
ROUTING             a constrained decision value
GRADING             structured evaluation output for evals
CITATIONS           an array, so citation handling isn't
                    string parsing
```

**Schema design is where the quality is:**

```
enum                 the model cannot produce an invalid
                     category. Removes a whole error class.
["number", "null"]   explicit nullability beats an empty
                     string or a sentinel like -1
required             guarantees the field exists
description          per-field guidance the model uses
flat over nested     accuracy degrades with nesting depth
```

**The `enum` point is the most valuable.** A classification that can only return one of five declared values removes the "the model invented a sixth category" failure entirely, rather than handling it downstream.

**The limit to state clearly:**

```
{"fee_amount": 25.00, "citations": ["policy-v4.2-§3.1"]}

Schema-valid. Says nothing about whether $25 is correct, or
whether that citation actually supports it.

Structural validation ≠ semantic validation. Business
checks and grounding verification remain yours, and
conflating the two is the standard mistake.
```

**Streaming interaction:** partial JSON isn't parseable mid-stream, so structured output and token streaming conflict. For a chat interface I'd stream the prose answer as text and return structured metadata separately, rather than forcing the whole response into a schema and losing streaming.

## 5. Why It Matters

- **Constrained decoding, not hopeful parsing** — the core distinction.
- **Enums remove an entire error class** rather than handling it downstream.
- **Schema validity isn't correctness**, which is the standard confusion.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Assuming schema validity means correctness** | Wrong values pass |
| **Deep nesting** | Accuracy degrades with complexity |
| **Free-text where an enum belonged** | Invented categories |
| **No nullable types** | Sentinels or empty strings instead of null |
| **Conflicts with streaming** | Partial JSON isn't parseable |
| **Over-constraining** | A schema that can't express a real answer |

**On over-constraining:** a schema requiring `fee_amount` as a non-nullable number forces the model to produce a number even when the answer is "it depends on your tier." Nullable fields plus an explicit `unable_to_determine` array are what let the model express uncertainty rather than fabricating a value to satisfy the schema.

**That's a subtle and important point** — a rigid schema can *cause* hallucination by leaving no valid way to say "I don't know."

## 7. Interview Answer

> "Structured output constrains the response to a JSON schema, set through response_mime_type and response_schema in the generation config. The difference from asking for JSON in the prompt is that decoding is constrained — the output conforms by construction rather than the model complying and my code parsing hopefully.
>
> It's useful well beyond agents: classification with enum-constrained categories, extraction with fixed fields, routing decisions, structured grading output for evaluations, and citations as an array so citation handling isn't string parsing.
>
> Schema design is where the quality is. Enums are the most valuable element — a classification that can only return one of five declared values removes the invented-category failure entirely, rather than handling it downstream. Explicit nullable types beat sentinels like empty strings or minus one. Required fields guarantee presence. Per-field descriptions get used. And I'd keep schemas flat, because accuracy degrades with nesting depth — assembling complex structures in code beats requesting them in one shot.
>
> The limit I'd state clearly: schema validity isn't correctness. A response with fee_amount of twenty-five and a citation is perfectly schema-valid and says nothing about whether twenty-five is right or whether that citation supports it. Business validation and grounding verification remain mine.
>
> The subtle failure I'd raise is over-constraining. A schema requiring fee_amount as a non-nullable number forces the model to produce a number even when the honest answer is 'it depends on your tier.' A rigid schema can actually *cause* hallucination by leaving no valid way to say I don't know. So nullable fields plus an explicit unable-to-determine array are what let the model express uncertainty rather than fabricating a value to satisfy the structure.
>
> And one practical conflict: structured output and token streaming don't work together, because partial JSON isn't parseable mid-stream. For a chat interface I'd stream the prose answer as text and return structured metadata separately, rather than forcing everything into a schema and losing streaming — which is the biggest perceived-latency win available."

## 8. Likely Follow-ups

**Q: How is this different from asking for JSON in the prompt?**
Decoding is constrained to the schema, so the output conforms by construction. Prompt-requested JSON is the model usually complying, which fails occasionally in ways that are annoying to handle at scale. The difference is between enforcement and hope.

**Q: What makes a good schema?**
Enums wherever the value set is known, explicit nullable types instead of sentinels, required fields for anything you depend on, per-field descriptions, and a flat structure. Enums in particular eliminate the invented-category failure rather than requiring downstream handling.

**Q: Does a valid schema mean a correct answer?**
No — only correct structure. A schema-valid response can contain the wrong fee and a citation that doesn't support it. Business validation and grounding checks remain the application's responsibility, and conflating structural with semantic validity is the standard mistake.

**Q: Can a schema cause problems?**
Yes — over-constraining can cause hallucination. A required non-nullable number field forces a value even when the honest answer is uncertain. Nullable fields and an explicit unable-to-determine array give the model a valid way to express not knowing, rather than fabricating to satisfy the structure.

**Q: How does it interact with streaming?**
Poorly — partial JSON isn't parseable until complete, so you lose streaming. For chat interfaces I'd stream the prose answer as text and return structured metadata separately, since streaming is the largest perceived-latency improvement available and worth preserving.

## 9. Common Mistakes

- Treating schema validity as semantic correctness.
- Using free-text fields where an enum would constrain the output.
- Over-constraining so the model must fabricate a value.
- Requesting deeply nested structures in one call.
- Losing streaming by forcing the whole response into a schema.

## 10. What to Remember

- **Constrained decoding**, set via `response_mime_type` and `response_schema`.
- **Enums remove the invented-value failure** entirely.
- **Valid structure ≠ correct content** — business checks stay yours.
- **Over-constraining causes hallucination** — allow nulls and "unable to determine."
- **Stream prose separately** rather than losing streaming to a schema.
