import { buildChatResponse, productionDeps } from "@/lib/conversation/respond";
import type { ChatErrorResponse } from "@/lib/conversation/types";
import { parseChatRequest } from "@/lib/conversation/validate";

/**
 * The single product endpoint (`docs/TECH.md` 22).
 *
 * Validates, routes deterministically, and for RAG paths retrieves evidence and
 * generates one grounded answer. Deterministic paths — guided steps, service
 * planning — make no model call at all.
 */

function errorResponse(status: number, body: ChatErrorResponse["error"]): Response {
  return Response.json({ error: body } satisfies ChatErrorResponse, { status });
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_request",
      message: "درخواست معتبر نیست.",
    });
  }

  const parsed = parseChatRequest(payload);
  if (!parsed.ok) {
    return errorResponse(parsed.code === "message_too_long" ? 413 : 400, {
      code: parsed.code,
      message: parsed.message,
    });
  }

  try {
    const deps = await productionDeps();
    return Response.json(await buildChatResponse(parsed.value, requestId, deps));
  } catch (error) {
    // Retrieval and generation failures are already handled as safe answers
    // inside buildChatResponse. Reaching here means something unexpected broke,
    // so log a code and return nothing internal (CLAUDE.md 15).
    console.error(
      JSON.stringify({
        event: "chat_unhandled_error",
        request_id: requestId,
        error_type: error instanceof Error ? error.name : typeof error,
      }),
    );

    return errorResponse(500, {
      code: "server_error",
      message: "یه مشکل موقتی پیش اومد. لطفاً دوباره تلاش کن.",
    });
  }
}
