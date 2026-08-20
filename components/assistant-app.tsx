"use client";

import { useCallback, useRef, useState } from "react";

import { config } from "@/lib/config";
import { createInitialState } from "@/lib/conversation/state";
import type {
  ChatResponse,
  ConversationMessage,
  ConversationState,
  DeploymentPlan,
  NextAction,
  Role,
  SourceReference,
} from "@/lib/conversation/types";

import { ConversationView } from "./conversation-view";
import { HomeScreen } from "./home-screen";

export type UiMessage = {
  id: string;
  role: Role;
  content: string;
  sources?: SourceReference[];
  actions?: NextAction[];
  plan?: DeploymentPlan;
};

const GENERIC_FAILURE =
  "ارتباط برقرار نشد. اتصالت رو بررسی کن و دوباره تلاش کن.";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Owns the whole session: visible messages plus the state the server returns.
 *
 * Session-local by design (`docs/TECH.md` 6.3) — no storage, no history. A
 * refresh starts over, which is accepted MVP behavior.
 */
export function AssistantApp() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [state, setState] = useState<ConversationState>(createInitialState);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kept out of state so a retry cannot race a re-render.
  const pendingRef = useRef<{ text: string; state: ConversationState } | null>(null);

  const send = useCallback(
    async (text: string, priorState: ConversationState, history: UiMessage[]) => {
      setIsSending(true);
      setError(null);

      const recentMessages: ConversationMessage[] = history
        .slice(-config.maxRecentMessages)
        .map(({ id, role, content }) => ({ id, role, content }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, recentMessages, state: priorState }),
        });

        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof (body as { error: { message?: unknown } }).error?.message === "string"
              ? (body as { error: { message: string } }).error.message
              : GENERIC_FAILURE;
          setError(message);
          return;
        }

        const payload = body as ChatResponse;

        setMessages((current) => [
          ...current,
          {
            id: newId(),
            role: "assistant",
            content: payload.message,
            sources: payload.sources,
            actions: payload.actions,
            plan: payload.plan,
          },
        ]);
        // The server owns state; adopting its version keeps journey progress.
        setState(payload.state);
        pendingRef.current = null;
      } catch {
        setError(GENERIC_FAILURE);
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  const submit = useCallback(
    (text: string) => {
      if (isSending) return;

      const userMessage: UiMessage = { id: newId(), role: "user", content: text };
      const history = [...messages, userMessage];

      setMessages(history);
      // Retry replays against the state from before this turn, so a failure
      // never advances or resets the journey.
      pendingRef.current = { text, state };

      void send(text, state, history);
    },
    [isSending, messages, send, state],
  );

  const retry = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending || isSending) return;
    void send(pending.text, pending.state, messages);
  }, [isSending, messages, send]);

  const reset = useCallback(() => {
    pendingRef.current = null;
    setMessages([]);
    setState(createInitialState());
    setError(null);
  }, []);

  if (messages.length === 0) {
    return <HomeScreen onSubmit={submit} />;
  }

  return (
    <ConversationView
      messages={messages}
      state={state}
      isSending={isSending}
      error={error}
      onSubmit={submit}
      onRetry={retry}
      onReset={reset}
    />
  );
}
