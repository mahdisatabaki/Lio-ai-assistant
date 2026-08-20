import { buildChatResponse } from "@/lib/conversation/respond";
import type { ChatErrorResponse } from "@/lib/conversation/types";
import { parseChatRequest } from "@/lib/conversation/validate";

/**
 * The single product endpoint (`docs/TECH.md` 22).
 *
 * BL-022 scope: validate, route deterministically, transition journey state,
 * and return a placeholder reply. No model call and no database — retrieval and
 * generation arrive in BL-040.
 */

function errorResponse(
  status: number,
  body: ChatErrorResponse["error"],
): Response {
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
    return Response.json(buildChatResponse(parsed.value, requestId));
  } catch {
    // Never surface an internal message or stack to the user (CLAUDE.md 15).
    return errorResponse(500, {
      code: "server_error",
      message: "یه مشکل موقتی پیش اومد. لطفاً دوباره تلاش کن.",
    });
  }
}
