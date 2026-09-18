# Function Calling

> **Phase 17 · AI AGENTS · Topic 08**

## 1. Definition

The model-side capability that produces structured, schema-conforming function invocations instead of free text. "Function calling" names the model feature; "tool calling" names the pattern built on it — in practice the terms are used interchangeably.

## 2. Simple Explanation

You give the model a JSON Schema describing a function. It returns arguments matching that schema.

The useful reframing: this is a **structured output** mechanism. It's the most reliable way to get well-formed JSON out of a model, and that's valuable even when there's no agent and nothing is being "called."

## 3. How It Works

```
Request:  messages + [function schemas]
Response: either text, or
          {name: "get_fee", arguments: {"txn_id": "TXN-9931"}}

The provider constrains decoding so the arguments conform to
the schema — it's not the model "trying" to produce valid JSON
and usually succeeding.
```

**Parallel function calling:** models can return several calls in one response when the tasks are independent. Executing those concurrently is a direct latency win, and it's frequently left on the table.

## 4. Practical Example

**Function calling as structured extraction — no agent involved:**

```python
schema = {
  "name": "record_complaint",
  "parameters": {
    "type": "object",
    "properties": {
      "category":  {"enum": ["fees", "transfers", "cards",
                             "access", "other"]},
      "sentiment": {"enum": ["angry", "frustrated", "neutral"]},
      "amount":    {"type": ["number", "null"]},
      "urgent":    {"type": "boolean"},
    },
    "required": ["category", "sentiment", "urgent"],
  },
}

result = llm(complaint_text, functions=[schema],
             function_call={"name": "record_complaint"})  # forced
```

**Nothing is executed.** The schema is used purely to get reliable structured output — enums constrain the category to valid values, types are enforced, and required fields are present. That's far more robust than asking for JSON in the prompt and parsing it.

**This reframing is the most useful thing to know here**, because it applies to classification, extraction, and routing across a whole system, not only to agents.

**Forcing a call:**

```
auto      model decides: text or a call         ← agents
none      text only
required  must call something
{name}    must call THIS function               ← extraction
```

**The schema does real work:**

```
enum          constrains to valid values — no invented categories
["number","null"]  explicit nullability beats an empty string
description   per-field guidance the model actually uses
required      guarantees presence

A tight schema removes a whole class of parsing and validation
code. A loose one puts it back.
```

## 5. Why It Matters

- **It's the reliable structured-output mechanism**, useful well beyond agents.
- **Parallel calls are free latency** and commonly unused.
- **Schema design reduces downstream validation code** substantially.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **Semantically wrong arguments** | Schema-valid but incorrect |
| **Hallucinated identifiers** | Well-formed, non-existent |
| **Loose schemas** | Free-text where an enum belonged |
| **Deeply nested schemas** | Accuracy degrades with complexity |
| **Provider differences** | Schema support varies across providers |
| **Parallel calls ignored** | Executed sequentially for no reason |

**On the limit of schema validation:** a schema guarantees *structure*, not *truth*. `{"transaction_id": "TXN-00000000"}` is perfectly valid and may not exist. Business validation and existence checks remain your responsibility, and conflating "schema-valid" with "correct" is the classic mistake here.

**On nesting:** accuracy drops as schemas get deeper. Two or three flat-ish fields work reliably; a five-level nested object with conditional requirements does not. Flattening the schema and doing the assembly in code is usually better than asking the model for a complex structure in one shot.

## 7. Interview Answer

> "Function calling is the model capability that produces structured, schema-conforming invocations instead of free text. You supply a JSON Schema, and the provider constrains decoding so the arguments conform — it's not the model attempting valid JSON and usually managing it. Function calling names the model feature and tool calling names the pattern built on it; in practice they're used interchangeably.
>
> The reframing I find most useful is that this is a structured output mechanism, and it's valuable even when nothing is being called. For classification or extraction — categorizing a complaint, pulling fields from a document — I'd define a schema with enums for the categories, explicit nullable types, and required fields, then force a call to that function. Nothing executes; I just get reliable structured output. That's far more robust than asking for JSON in the prompt and parsing it, and it applies across a whole system, not only to agents.
>
> Schema design does real work. An enum stops the model inventing a category. Explicit nullable types beat an empty string as a sentinel. Per-field descriptions get used. Required fields guarantee presence. A tight schema removes a class of parsing and validation code; a loose one puts it back.
>
> The limit worth naming: a schema guarantees structure, not truth. A transaction ID can be perfectly well-formed and not exist. So business validation and existence checks stay my responsibility, and conflating schema-valid with correct is the classic mistake.
>
> Two practical points. Models can return several calls in one response when the tasks are independent, and executing those concurrently is a direct latency win that's often left unused. And accuracy drops as schemas get deeper — two or three fairly flat fields work reliably, a five-level nested object with conditional requirements doesn't. Flattening the schema and assembling in code beats asking for a complex structure in one shot."

## 8. Likely Follow-ups

**Q: Is function calling only for agents?**
No — it's the most reliable structured-output mechanism available, so it's useful for classification, extraction, and routing where nothing is executed at all. Forcing a call to a schema with enums and required fields gives you validated structure without any parsing code.

**Q: How does it differ from asking for JSON in the prompt?**
The provider constrains decoding so the output conforms to the schema, rather than the model attempting valid JSON and usually succeeding. That difference matters at scale — prompt-requested JSON fails occasionally in ways that are annoying to handle, and schema-constrained output doesn't.

**Q: Does schema validation guarantee correctness?**
No, only structure. A well-formed transaction ID may not exist, and a valid enum value may be the wrong category. Business validation and existence checks remain the application's job — treating schema-valid as correct is the common mistake.

**Q: What makes a good schema?**
Enums instead of free text wherever the value set is known, explicit nullable types rather than sentinel strings, per-field descriptions, and required fields for anything you depend on. And keep it fairly flat — accuracy degrades with nesting depth, so assembling complex structures in code beats requesting them in one shot.

**Q: What are parallel function calls?**
A model returning several independent tool calls in a single response. Executing them concurrently rather than sequentially is a direct latency reduction with no downside, and it's commonly left unused because the implementation loops over the calls one at a time.

## 9. Common Mistakes

- Treating function calling as an agent-only feature.
- Assuming schema validity implies semantic correctness.
- Using free-text fields where an enum would constrain the output.
- Requesting deeply nested structures in a single call.
- Executing parallel tool calls sequentially.

## 10. What to Remember

- **Schema-constrained output**, not the model attempting valid JSON.
- **Useful without agents** — classification, extraction, routing.
- **Enums, nullable types, descriptions, required** — the schema does real work.
- **Valid structure ≠ correct content.** Existence checks stay yours.
- **Execute parallel calls concurrently**; keep schemas flat.
