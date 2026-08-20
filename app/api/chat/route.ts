import { buildChatResponse, productionDeps } from "@/lib/conversation/respond";
import type { ChatErrorResponse } from "@/lib/conversation/types";
import { parseChatRequest } from "@/lib/conversation/validate";
import { logChat } from "@/lib/server/logging";
import { checkRateLimit, clientKey } from "@/lib/server/rate-limit";

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
  const startedAt = Date.now();

  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    logChat({ request_id: requestId, status: "rejected", error_code: "rate_limited" });
    return Response.json(
      {
        error: {
          code: "rate_limited",
          message:
            "یه کم سریع پشت‌سرهم پیام فرستادی. چند لحظه صبر کن و دوباره بفرست.",
        },
      } satisfies ChatErrorResponse,
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

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
    logChat({ request_id: requestId, status: "rejected", error_code: parsed.code });
    return errorResponse(parsed.code === "message_too_long" ? 413 : 400, {
      code: parsed.code,
      message: parsed.message,
    });
  }

  try {
    const deps = await productionDeps();
    const response = await buildChatResponse(parsed.value, requestId, deps);

    logChat({
      request_id: requestId,
      intent: response.meta.intent,
      active_journey: response.state.activeJourney,
      current_step: response.state.currentStep,
      latency_ms: Date.now() - startedAt,
      retrieval_count: response.sources?.length ?? 0,
      input_size: parsed.value.message.length,
      output_size: response.message.length,
      status: "ok",
    });

    return Response.json(response);
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

    logChat({
      request_id: requestId,
      latency_ms: Date.now() - startedAt,
      status: "error",
      error_code: "server_error",
    });

    return errorResponse(500, {
      code: "server_error",
      message: "یه مشکل موقتی پیش اومد. لطفاً دوباره تلاش کن.",
    });
  }
}
