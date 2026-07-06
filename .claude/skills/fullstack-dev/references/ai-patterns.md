# Advanced AI Patterns

## RAG (Retrieval-Augmented Generation)

```bash
npm install @supabase/supabase-js openai  # for embeddings
```

```sql
-- Enable pgvector extension in Supabase
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  content text not null,
  embedding vector(1536),  -- OpenAI ada-002 dimensions
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Similarity search function
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_filter uuid
)
returns table (id uuid, content text, similarity float)
language sql stable
as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from documents
  where user_id = user_id_filter
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

```ts
// app/api/ai/rag/route.ts
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { query } = await req.json();
  const openai = new OpenAI();

  // 1. Embed the query
  const {
    data: [{ embedding }],
  } = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });

  // 2. Find similar documents
  const { data: docs } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5,
    user_id_filter: user.id,
  });

  // 3. Build context and query Claude
  const context = docs?.map((d) => d.content).join("\n\n") ?? "";
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}`,
      },
    ],
  });

  return Response.json({ answer: response.content[0].text });
}
```

---

## Tool Use / Function Calling

```ts
// Claude tool use example
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools: [
    {
      name: "get_user_data",
      description: "Fetch user-specific data from the database",
      input_schema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          filters: { type: "object" },
        },
        required: ["table"],
      },
    },
  ],
  messages: [{ role: "user", content: userMessage }],
});

// Handle tool calls in a loop
while (response.stop_reason === "tool_use") {
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const toolResult = await executeToolCall(toolUse);
  // Continue the conversation with the tool result...
}
```

---

## Structured Output

```ts
// Force JSON output from Claude
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system:
    "You are a data extractor. Always respond with valid JSON only, no markdown.",
  messages: [{ role: "user", content: `Extract: ${userInput}` }],
});

const parsed = JSON.parse(response.content[0].text);
```

---

## Streaming with Server-Sent Events

```ts
// app/api/ai/stream/route.ts
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const anthropic = new Anthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await anthropic.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages,
      });

      for await (const chunk of response) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`,
            ),
          );
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

---

## Saving Conversation History to Supabase

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users own their conversations" on conversations
  using (auth.uid() = user_id);
create policy "Users own their messages" on messages
  using (conversation_id in (select id from conversations where user_id = auth.uid()));
```
