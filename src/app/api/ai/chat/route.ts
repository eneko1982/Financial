import { NextRequest, NextResponse } from "next/server";
import { anthropic, ADVISOR_MODEL, buildSystemPrompt } from "@/lib/claude";
import { getFinancialContext } from "@/lib/financial-context";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { messages, conversationId } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-api-key-here") {
    return NextResponse.json({ data: null, error: "ANTHROPIC_API_KEY no configurada. Añádela en .env.local" }, { status: 400 });
  }

  const context = await getFinancialContext();
  const systemPrompt = buildSystemPrompt(context);

  // Keep last 10 message pairs max
  const recentMessages = messages.slice(-20);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const response = await anthropic.messages.stream({
          model: ADVISOR_MODEL,
          max_tokens: 1500,
          system: systemPrompt,
          messages: recentMessages,
        });

        for await (const chunk of response) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            fullText += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

        // Persist conversation
        try {
          let convId = conversationId;
          if (!convId) {
            const conv = await prisma.aIConversation.create({ data: { title: messages[0]?.content?.slice(0, 60) } });
            convId = conv.id;
          }
          const lastUser = messages[messages.length - 1];
          await prisma.aIMessage.createMany({
            data: [
              { conversationId: convId, role: lastUser.role, content: lastUser.content },
              { conversationId: convId, role: "assistant", content: fullText },
            ],
          });
        } catch { /* non-critical */ }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error del servidor";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
