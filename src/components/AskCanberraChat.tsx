import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cityName, citySlug, siteName } from "@/lib/city";

const STORAGE_KEY = `tdc-ask-${citySlug()}-v1`;

function loadStored(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

const transport = new DefaultChatTransport({ api: "/api/chat" });

// Built per render (not at module load) so cityName() resolves against the
// active request's city instead of the boot-time fallback.
function suggestions(): string[] {
  return [
    `What's on in ${cityName()} this weekend?`,
    "Where's the best brunch?",
    "Where can I take the dog?",
    "What's the latest in federal politics?",
  ];
}

export function AskCanberraChat({ embedded = false }: { embedded?: boolean }) {
  const [initial] = useState<UIMessage[]>(() => loadStored());
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: `ask-${citySlug()}-single`,
    messages: initial,
    transport,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* quota */
    }
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  function reset() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  return (
    <div
      className={
        embedded
          ? "flex flex-col h-full"
          : "flex flex-col h-[calc(100dvh-140px)] max-h-[800px] border border-[var(--hairline)] bg-background"
      }
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-10 max-w-md mx-auto">
            <p className="kicker">Ask {cityName()}</p>
            <h2 className="serif text-2xl mt-2">Ask anything about {cityName()}</h2>
            <p className="meta mt-2">
              Trained on {siteName()} newsroom: articles, events and the Best of directory.
            </p>
            <div className="mt-6 grid gap-2">
              {suggestions().map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="text-left text-sm px-3 py-2 border border-[var(--hairline)] hover:bg-[var(--surface)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={isUser ? "flex justify-end" : ""}>
                <div
                  className={
                    isUser
                      ? "max-w-[80%] px-3 py-2 bg-[var(--ink)] text-background text-sm"
                      : "max-w-[90%] text-[15px] leading-relaxed prose prose-sm dark:prose-invert prose-a:text-[var(--ink-red)] prose-a:no-underline hover:prose-a:underline"
                  }
                >
                  {isUser ? (
                    text
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                  )}
                </div>
              </div>
            );
          })
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" ? (
          <p className="meta animate-pulse">Thinking</p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-700">
            {error.message.includes("402")
              ? "AI credits exhausted. Top up in Workspace settings."
              : error.message.includes("429")
                ? "Rate limit hit. Try again in a minute."
                : "Something went wrong. Try again."}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={submit}
        className="border-t border-[var(--hairline)] p-3 flex items-end gap-2 bg-[var(--surface)]"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={`Ask anything about ${cityName()}`}
          rows={1}
          className="field flex-1 resize-none min-h-[40px] max-h-32"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()} className="btn-primary">
          {isLoading ? "Sending" : "Send"}
        </button>
      </form>
      {messages.length > 0 ? (
        <div className="border-t border-[var(--hairline)] px-3 py-1 text-right">
          <button
            onClick={reset}
            className="meta uppercase tracking-widest text-xs opacity-70 hover:opacity-100"
          >
            New conversation
          </button>
        </div>
      ) : null}
    </div>
  );
}
