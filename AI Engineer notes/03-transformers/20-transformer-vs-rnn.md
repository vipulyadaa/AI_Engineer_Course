# Transformer vs. RNN

> **Phase 03 · TRANSFORMERS · Topic 20**

## 1. Definition

RNNs process sequences step by step, carrying a fixed-size hidden state forward. Transformers process all positions in parallel with attention connecting any two directly. The differences in parallelism, memory, and dependency handling explain why transformers replaced RNNs for language.

## 2. Simple Explanation

An RNN reads left to right, maintaining a running summary. Everything it knows about the past must fit in one fixed-size vector.

A transformer sees everything at once and lets any position attend to any other. Nothing is compressed into a bottleneck, and nothing has to survive a long chain of updates.

## 3. How It Works

| | RNN / LSTM | Transformer |
|---|---|---|
| **Processing** | Sequential, step by step | All positions in parallel |
| **Training parallelism** | **None across time** | Full |
| **Path between positions** | O(distance) steps | O(1) — one attention op |
| **Memory of the past** | Fixed-size hidden state | Full sequence, attended directly |
| **Compute per layer** | O(n·d²) | O(n²·d + n·d²) |
| **Memory at inference** | O(d) — constant | O(n) — KV cache grows |
| **Context limit** | Unbounded in principle, degrades in practice | Hard window, but no degradation within it |

**The two decisive rows:**

```
TRAINING PARALLELISM
  RNN step t needs step t−1's hidden state → strictly sequential.
  A 2048-token sequence is 2048 dependent steps.
  Transformer: one batched matmul over all 2048 positions.
  → This is what made trillion-token training possible.

PATH LENGTH
  RNN: information from position 1 to position 500 passes through
       499 update steps, being compressed and overwritten each time.
  Transformer: one attention operation, regardless of distance.
```

## 4. Practical Example

**The information bottleneck, concretely:**

```
LSTM with hidden size 1024 processing a 2000-token document.

Everything the model knows about those 2000 tokens must be
represented in 1024 numbers, updated 2000 times.

Each update partially overwrites. Early information is
systematically degraded by the time it's needed.

Transformer: all 2000 token representations remain available,
and any position can attend to any of them directly.
```

**The one place RNNs still win:**

```
INFERENCE MEMORY

  RNN:         O(d) state — constant regardless of sequence length
  Transformer: O(n) KV cache — grows with every generated token

For a very long generation, the transformer's cache can exceed
the model weights. The RNN's state never grows.

That's exactly the property state-space models (Mamba, RWKV)
target: recurrent-style constant inference memory with
parallelizable training.
```

**Where the field is now:**

```
Transformers remain dominant. State-space models are a real
research direction with a genuine advantage on inference memory
and long sequences, and hybrid architectures interleaving
attention and SSM layers exist.

The honest position: promising, not displacing. Attention's
ability to do exact retrieval from arbitrary positions is hard
to match with a compressed recurrent state.
```

## 5. Why It Matters

- **It's the cleanest way to explain what transformers actually solved.**
- **The parallelism point is the historically decisive one** and the one most often underweighted.
- **The RNN's constant inference memory** is the motivation for the current state-space model line of work.

## 6. Trade-offs / Failure Modes

| | RNN weakness | Transformer weakness |
|---|---|---|
| Training | Can't parallelize over time | Quadratic attention cost |
| Long range | Information degrades with distance | Hard context window |
| Inference | — | KV cache grows with sequence |
| Small data | Better — recency bias is a useful prior | Data-hungry |

**On the "vanishing gradient" framing:** LSTMs and GRUs were designed specifically to mitigate vanishing gradients through gating, and they largely succeeded at that. Their remaining limitation was the fixed-size state bottleneck and the inability to parallelize training — not gradients per se. Saying "LSTMs had vanishing gradients" is imprecise; saying "LSTMs fixed gradients but couldn't parallelize and still compressed everything into a fixed state" is accurate.

**On attention over RNNs:** attention was originally introduced as an *addition* to RNN encoder-decoders (Bahdanau, 2014). The 2017 contribution was removing the recurrence entirely — hence the title.

## 7. Interview Answer

> "RNNs process sequences step by step, carrying a fixed-size hidden state. Transformers process all positions in parallel with attention connecting any two directly.
>
> Two differences are decisive. First, training parallelism. An RNN's step t depends on step t minus one, so training is strictly sequential over the sequence — a two-thousand-token sequence is two thousand dependent steps. A transformer computes all positions in one batched matrix multiply. That's what made training on trillions of tokens feasible, and it's the historically decisive reason.
>
> Second, path length. In an RNN, information from position one reaches position five hundred by passing through four hundred and ninety-nine update steps, being compressed and partially overwritten each time. In a transformer it's one attention operation regardless of distance.
>
> I'd be precise about one thing: it's imprecise to say LSTMs suffered from vanishing gradients. LSTMs were specifically designed to mitigate that through gating, and they largely succeeded. Their remaining limitations were the fixed-size state bottleneck — everything the model knows compressed into one vector — and the inability to parallelize training.
>
> There's one place RNNs still win: inference memory. An RNN's state is constant regardless of sequence length, while a transformer's KV cache grows with every generated token and can exceed the model weights on long generations. That's exactly the property state-space models like Mamba target — recurrent-style constant inference memory with parallelizable training. My honest read is that they're promising rather than displacing; attention's ability to do exact retrieval from arbitrary positions is hard to match with a compressed recurrent state.
>
> One historical note: attention was originally introduced as an addition to RNN encoder-decoders in 2014. The 2017 contribution was removing the recurrence entirely — hence 'attention is all you need.'"

## 8. Likely Follow-ups

**Q: What's the single biggest advantage of transformers?**
Training parallelism. The modeling advantages are real, but the decisive factor is that all positions compute simultaneously, making trillion-token training feasible. RNNs couldn't be scaled that way regardless of quality, so the architecture that could be trained at scale won.

**Q: Didn't LSTMs solve the vanishing gradient problem?**
Largely, yes — gating was designed for exactly that and it worked. Their remaining limitations were different: everything the model knows about the past has to fit in a fixed-size hidden state, and training can't be parallelized across time. Attributing their replacement to vanishing gradients is a common imprecision.

**Q: Do RNNs have any advantage left?**
Inference memory. An RNN's state is constant regardless of sequence length, while a transformer's KV cache grows with every token and can exceed the model weights on long generations. That's the property state-space models are built around, and it's a genuine advantage for very long sequences.

**Q: What are state-space models?**
Architectures like Mamba and RWKV that aim to combine recurrent-style constant inference memory with parallelizable training. They're a real research direction with genuine advantages on long sequences and memory. My read is promising rather than displacing — attention's ability to retrieve exactly from arbitrary positions is hard to match with a compressed state.

**Q: When was attention introduced?**
As an addition to RNN encoder-decoders in 2014, by Bahdanau and colleagues, to address the bottleneck of compressing an entire source sentence into one vector. The 2017 transformer paper's contribution was removing recurrence altogether and showing attention alone was sufficient — which is what the title says.

## 9. Common Mistakes

- Attributing the replacement of LSTMs to vanishing gradients.
- Citing long-range dependencies without mentioning parallelism.
- Claiming RNNs have no remaining advantages — inference memory is real.
- Thinking attention originated with the 2017 paper.
- Overstating state-space models as having displaced transformers.

## 10. What to Remember

- **Two decisive differences:** training parallelism and O(1) path length between positions.
- **Parallelism is the historically decisive one** — it enabled trillion-token training.
- **LSTMs fixed gradients**; their limits were the fixed-state bottleneck and sequential training.
- **RNNs still win on inference memory** — constant state vs. a growing KV cache.
- **Attention predates 2017** as an RNN addition; the 2017 contribution was removing recurrence.
