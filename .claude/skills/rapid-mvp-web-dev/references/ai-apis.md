# AI API Integration Reference

## Table of Contents

1. [Provider Quick Pick](#provider-quick-pick)
2. [Anthropic Claude](#anthropic-claude)
3. [OpenAI](#openai)
4. [Image Generation](#image-generation)
5. [Embeddings & RAG](#embeddings--rag)
6. [Speech & Audio](#speech--audio)
7. [Streaming UI Patterns](#streaming-ui-patterns)
8. [Structured Output](#structured-output)
9. [Cost Control](#cost-control)

---

## Provider Quick Pick

| Use Case                   | Best Option                       | Why                         |
| -------------------------- | --------------------------------- | --------------------------- |
| Complex reasoning / coding | Anthropic Claude Sonnet           | Best quality/cost ratio     |
| High volume simple tasks   | OpenAI GPT-4o-mini                | Cheapest per token          |
| Image generation           | Replicate (Flux)                  | Best quality, pay-per-use   |
| Embeddings                 | OpenAI text-embedding-3-small     | Cheapest, excellent quality |
| Speech-to-text             | OpenAI Whisper                    | Best accuracy, simple API   |
| Text-to-speech             | ElevenLabs                        | Most natural voices         |
| Open source models         | Together AI or Fireworks          | Fast inference, many models |
| Multi-modal (vision)       | Anthropic Claude or OpenAI GPT-4o | Both excellent              |

---

## Anthropic Claude

### Setup

```bash
npm install @anthropic-ai/sdk
```

```typescript
// lib/ai.ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();
// Reads ANTHROPIC_API_KEY from env automatically
```

### Basic Completion

```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: "You are a helpful assistant for [your app context].",
  messages: [{ role: "user", content: prompt }],
});

const text = message.content[0].type === "text" ? message.content[0].text : "";
```

### Streaming (Server-Sent Events)

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, system } = await req.json();

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: system || "You are a helpful assistant.",
    messages,
  });

  return new Response(stream.toReadableStream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Tool Use / Function Calling

```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools: [
    {
      name: "get_weather",
      description: "Get current weather for a location",
      input_schema: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name" },
        },
        required: ["location"],
      },
    },
  ],
  messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
});

// Check for tool use in response
const toolUse = message.content.find((block) => block.type === "tool_use");
if (toolUse) {
  // Execute the tool, then send tool_result back
}
```

### Vision (Image Analysis)

```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "url", url: imageUrl },
          // OR base64: { type: 'base64', media_type: 'image/png', data: base64String }
        },
        { type: "text", text: "Describe this image." },
      ],
    },
  ],
});
```

---

## OpenAI

### Setup

```bash
npm install openai
```

```typescript
// lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI();
// Reads OPENAI_API_KEY from env
```

### Basic Completion

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: prompt },
  ],
});

const text = completion.choices[0].message.content;
```

### Streaming

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages,
  stream: true,
});

// Convert to ReadableStream for Response
const encoder = new TextEncoder();
const readable = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
        );
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});

return new Response(readable, {
  headers: { "Content-Type": "text/event-stream" },
});
```

---

## Image Generation

### Replicate (Flux — best quality)

```bash
npm install replicate
```

```typescript
import Replicate from "replicate";
const replicate = new Replicate(); // REPLICATE_API_TOKEN from env

const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
  input: {
    prompt: "A serene mountain landscape at sunset",
    aspect_ratio: "16:9",
  },
});
// output is a URL to the generated image
```

### OpenAI DALL-E

```typescript
const image = await openai.images.generate({
  model: "dall-e-3",
  prompt: "A serene mountain landscape at sunset",
  size: "1792x1024",
  quality: "hd",
});

const imageUrl = image.data[0].url;
```

---

## Embeddings & RAG

### Setup with Supabase pgvector

```sql
-- In Supabase SQL editor
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

### Generate & Store Embeddings

```typescript
import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

async function embedAndStore(
  content: string,
  metadata: Record<string, any> = {},
) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });

  const { error } = await supabase.from("documents").insert({
    content,
    embedding: embedding.data[0].embedding,
    metadata,
  });

  if (error) throw error;
}
```

### Semantic Search

```typescript
async function search(query: string, limit = 5) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: limit,
  });

  return data;
}
```

```sql
-- Supabase function for similarity search
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) returns table (id bigint, content text, similarity float)
language sql stable as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

## Speech & Audio

### Whisper (Speech-to-Text)

```typescript
const transcription = await openai.audio.transcriptions.create({
  file: audioFile, // File object or ReadStream
  model: "whisper-1",
  response_format: "text",
});
```

### ElevenLabs (Text-to-Speech)

```typescript
const response = await fetch(
  "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
  {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Hello, welcome to our app!",
      model_id: "eleven_turbo_v2_5",
    }),
  },
);

const audioBuffer = await response.arrayBuffer();
```

---

## Streaming UI Patterns

### React Hook for SSE Streaming

```typescript
// hooks/useChat.ts
"use client";
import { useState, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(
    async (content: string) => {
      const userMsg: Message = { role: "user", content };
      const newMessages = [...messages, userMsg];
      setMessages([...newMessages, { role: "assistant", content: "" }]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          assistantContent += text;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  return { messages, send, isLoading };
}
```

---

## Structured Output

### Anthropic — Tool Use for Structured Data

```typescript
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools: [
    {
      name: "extract_data",
      description: "Extract structured data from text",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative"],
          },
        },
        required: ["name", "email", "sentiment"],
      },
    },
  ],
  tool_choice: { type: "tool", name: "extract_data" },
  messages: [{ role: "user", content: `Extract info from: ${text}` }],
});

const toolBlock = message.content.find((b) => b.type === "tool_use");
const structured = toolBlock?.input; // { name, email, sentiment }
```

### OpenAI — JSON Mode

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  response_format: { type: "json_object" },
  messages: [
    {
      role: "system",
      content: "Return JSON with fields: name, email, sentiment",
    },
    { role: "user", content: text },
  ],
});

const structured = JSON.parse(completion.choices[0].message.content!);
```

---

## Cost Control

### Strategies

1. **Use the cheapest model that works**: GPT-4o-mini for simple tasks, Claude Sonnet for complex ones. Never default to the most expensive model.
2. **Cache responses**: Use Vercel KV or Upstash Redis to cache identical queries.
3. **Set max_tokens**: Always set a reasonable `max_tokens` to prevent runaway costs.
4. **Rate limit users**: `@upstash/ratelimit` — 2 lines of setup.
5. **Monitor spending**: Set billing alerts on every AI provider dashboard.
6. **Batch when possible**: Anthropic and OpenAI offer batch APIs at 50% discount for non-realtime tasks.

### Rate Limiting Pattern

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

// In your API route:
const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
const { success } = await ratelimit.limit(ip);
if (!success) return new Response("Too many requests", { status: 429 });
```
