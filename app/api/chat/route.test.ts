import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/chat/route";
import { config } from "@/lib/config";
import type { ChatResponse } from "@/lib/conversation/types";
import { JOURNEY_STEP_IDS } from "@/lib/conversation/types";

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function chat(message: string, state?: unknown): Promise<ChatResponse> {
  const response = await post({ message, recentMessages: [], state });
  expect(response.status).toBe(200);
  return (await response.json()) as ChatResponse;
}

describe("POST /api/chat", () => {
  it("rejects malformed JSON without throwing", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_request" },
    });
  });

  it("rejects an empty message", async () => {
    const response = await post({ message: "" });
    expect(response.status).toBe(400);
  });

  it("rejects an oversized message with 413", async () => {
    const response = await post({ message: "x".repeat(config.maxMessageChars + 1) });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "message_too_long" },
    });
  });

  it("routes an error paste to troubleshooting and records it in state", async () => {
    const body = await chat("npm ERR! code ECONNRESET\nnpm ERR! network failed\nnpm ERR! retry");
    expect(body.meta.intent).toBe("troubleshooting");
    expect(body.state.activeError).toContain("ECONNRESET");
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("starts the deployment journey", async () => {
    const body = await chat("می‌خوام پروژه‌م رو آنلاین کنم.");
    expect(body.meta.intent).toBe("deployment");
    expect(body.state.activeJourney).toBe("nextjs-deploy");
    expect(body.state.currentStep).toBe(JOURNEY_STEP_IDS[0]);
  });

  it("keeps the journey when an error interrupts it", async () => {
    const started = await chat("می‌خوام پروژه‌م رو آنلاین کنم.");
    const interrupted = await chat("خطا گرفتم موقع بیلد", started.state);

    expect(interrupted.meta.intent).toBe("troubleshooting");
    expect(interrupted.state.activeJourney).toBe("nextjs-deploy");
    expect(interrupted.state.currentStep).toBe(started.state.currentStep);
  });

  it("answers a side question without ending the journey", async () => {
    const started = await chat("می‌خوام پروژه‌م رو آنلاین کنم.");
    const aside = await chat("راستی آبجکت استوریج چیه؟", started.state);

    expect(aside.meta.intent).toBe("general");
    expect(aside.state.activeJourney).toBe("nextjs-deploy");
  });

  it("advances the journey when the user reports success", async () => {
    const started = await chat("می‌خوام پروژه‌م رو آنلاین کنم.");
    const advanced = await chat("انجام شد", started.state);

    expect(advanced.state.currentStep).toBe(JOURNEY_STEP_IDS[1]);
    expect(advanced.state.completedSteps).toContain(JOURNEY_STEP_IDS[0]);
  });

  it("asks one clarifying question on vague input", async () => {
    const body = await chat("سلام");
    expect(body.meta.intent).toBe("unknown");
  });

  it("returns a request id and offers next actions", async () => {
    const body = await chat("آبجکت استوریج لیارا برای چه کاری خوبه؟");
    expect(body.meta.requestId).toMatch(/[0-9a-f-]{36}/);
    expect(body.actions?.length).toBeGreaterThan(0);
  });

  it("does not invent a Liara answer while ungrounded", async () => {
    const body = await chat("پورت پیش‌فرض اپلیکیشن Next.js روی لیارا چنده؟");
    expect(body.sources ?? []).toEqual([]);
  });
});
