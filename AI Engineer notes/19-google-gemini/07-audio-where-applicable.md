# Audio

> **Phase 19 · GOOGLE GEMINI · Topic 07**

## 1. Definition

Gemini's audio understanding — accepting audio files directly and answering about what was said, without a separate transcription step. Distinct from Speech-to-Text, which produces a transcript as its output.

## 2. Simple Explanation

You can send an audio file and ask a question about it. Gemini processes the audio directly rather than requiring you to transcribe first.

For banking that's mostly call recordings, and the design question is whether you want an *answer* about the audio or a *transcript* of it — because those point at different services.

## 3. How It Works

```python
response = model.generate_content([
    Part.from_uri("gs://calls/2026-03-03.mp3", mime_type="audio/mp3"),
    "Did the adviser state the international transfer fee before "
    "the customer agreed? Quote the relevant exchange and give "
    "the approximate timestamp.",
])
```

**Direct audio understanding means no transcription step**, which avoids transcription errors compounding into answer errors.

**Speech-to-Text produces a transcript** with word-level timestamps, speaker diarization, and confidence scores — a different output serving a different purpose.

## 4. Practical Example

**Choosing between them:**

```
SPEECH-TO-TEXT when you need a TRANSCRIPT
  · a durable record to store, search, and cite
  · speaker diarization — who said what
  · word-level timestamps and confidence
  · an artifact that can be reviewed and retained

GEMINI AUDIO when you need an ANSWER
  · ad-hoc questions about one recording
  · no transcript needed as an artifact
  · reasoning over tone and content together

THE COMBINATION, which is usually right for banking:
  Speech-to-Text at ingestion → transcript with speakers
  and timestamps → embed and index → text RAG

One transcription pass, cheap queries forever, a durable
citable record, and speaker attribution. That last point
matters: "the adviser said X" requires diarization, and
a direct audio answer doesn't reliably give you that.
```

**The diarization argument is the strongest reason** to transcribe rather than query audio directly for compliance use.

**Compliance considerations that come first:**

```
· consent for recording may not extend to AI analysis
· voice is biometric data in some jurisdictions
· recordings are personal data with retention limits
· cross-border processing may be restricted

In a bank these are answered before any engineering. And
they're a reason the Vertex AI path matters — processing
stays in-region and in-project.
```

**Emotion and tone:** the model can comment on apparent tone, but I'd treat that as unreliable for any consequential purpose. Inferring customer distress or adviser intent from audio is exactly the kind of inference that shouldn't drive a decision about a person.

## 5. Why It Matters

- **Speaker diarization** is the practical reason to transcribe rather than query audio directly.
- **Transcribe once at ingestion, then text RAG** — the same pattern as video.
- **Consent and biometric rules** are answered before the engineering.

## 6. Trade-offs / Failure Modes

| Issue | Detail |
|---|---|
| **No reliable speaker attribution** | Direct audio Q&A can't reliably say who spoke |
| **No durable artifact** | An answer isn't a record |
| **Token cost scales with duration** | Long calls are expensive |
| **Querying audio per request** | Repeats an expensive operation |
| **Tone inference** | Unreliable, and inappropriate for decisions |
| **Consent scope** | Recording consent ≠ AI analysis consent |

**On the durable artifact:** for compliance, what's needed is a record that can be stored, reviewed, retained under policy, and produced on request. An LLM answer about a recording isn't that — the transcript is. So even where direct audio Q&A would work, the compliance requirement often mandates transcription anyway.

**On accent and quality:** transcription and audio understanding both degrade on heavy accents, poor line quality, and background noise — and degrade unevenly across speaker groups, which is a fairness concern in a customer-facing context. That should be measured per segment rather than reported as an aggregate accuracy figure.

## 7. Interview Answer

> "Gemini can take audio directly and answer questions about it, without a separate transcription step. That's distinct from Speech-to-Text, which produces a transcript as its output.
>
> The design question is whether you want an answer about the audio or a transcript of it, because those point at different services. Speech-to-Text gives a durable record with speaker diarization, word-level timestamps, and confidence scores. Gemini audio gives an answer.
>
> For banking, the combination is usually right: Speech-to-Text at ingestion produces a transcript with speakers and timestamps, that gets embedded and indexed, and queries run as normal text RAG. One transcription pass, cheap queries afterwards, and a durable citable record.
>
> The strongest argument for that is diarization. A compliance question like 'did the adviser state the fee before the customer agreed' requires knowing who said what — and direct audio Q&A doesn't reliably give speaker attribution. That alone decides it for compliance use.
>
> The other argument is the artifact. For compliance you need a record that can be stored, reviewed, retained under policy, and produced on request. An LLM answer about a recording isn't that; the transcript is. So even where direct audio Q&A would work, the compliance requirement often mandates transcription anyway.
>
> Before any of the engineering, though: consent for recording may not extend to AI analysis, voice is biometric data in some jurisdictions, recordings are personal data with retention limits, and cross-border processing may be restricted. In a bank those get answered first, and they're another reason the Vertex AI path matters — processing stays in-region and in-project.
>
> Two things I'd flag. Transcription and audio understanding both degrade on heavy accents, poor line quality, and background noise — and they degrade unevenly across speaker groups, which is a fairness issue in a customer-facing system. I'd measure accuracy per segment rather than report an aggregate figure that hides it.
>
> And I'd avoid tone or emotion inference for anything consequential. The model will comment on apparent tone, but inferring customer distress or adviser intent from audio is exactly the kind of inference that shouldn't drive a decision about a person."

## 8. Likely Follow-ups

**Q: Gemini audio or Speech-to-Text?**
Speech-to-Text when you need a transcript — a durable record with speaker diarization, timestamps, and confidence. Gemini when you need an ad-hoc answer about a single recording. For banking compliance the combination is usually right: transcribe at ingestion, then text RAG.

**Q: Why does diarization matter so much?**
Because compliance questions are about who said what. "Did the adviser state the fee before the customer agreed" can't be answered without speaker attribution, and direct audio Q&A doesn't reliably provide it. That alone decides the tool choice for compliance use.

**Q: What comes before the engineering?**
Consent scope, since recording consent may not extend to AI analysis. Biometric data rules, since voice qualifies in some jurisdictions. Retention limits on recordings. And restrictions on cross-border processing. Those can rule out the use case regardless of technical feasibility.

**Q: Is there a fairness concern?**
Yes. Transcription and audio understanding degrade on heavy accents, poor line quality, and background noise — and unevenly across speaker groups. In a customer-facing system that means unequal service quality, so accuracy should be measured per segment rather than reported in aggregate.

**Q: Can you use tone or emotion detection?**
I wouldn't for anything consequential. The model will comment on apparent tone, but inferring customer distress or adviser intent from audio is unreliable and it's exactly the kind of inference that shouldn't drive a decision affecting a person.

## 9. Common Mistakes

- Querying audio per request rather than transcribing once at ingestion.
- Using direct audio Q&A where speaker attribution is required.
- Producing an answer where a durable transcript is the compliance requirement.
- Reporting aggregate transcription accuracy that hides per-segment disparity.
- Using inferred tone or emotion in a consequential decision.

## 10. What to Remember

- **Speech-to-Text for a transcript; Gemini for an answer.**
- **Diarization decides it** for compliance — direct audio Q&A can't attribute speakers.
- **Transcribe once at ingestion**, then text RAG.
- **Consent, biometric status, and retention** come before the engineering.
- **Measure accuracy per speaker segment**; don't infer emotion for decisions.
