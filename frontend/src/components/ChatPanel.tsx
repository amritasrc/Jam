import { useState } from "react";

type ChatPanelProps = {
  messages: string[];
  onSend: (text: string) => void;
};

export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <section className="glass flex h-full flex-col rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200 to-emerald-200 text-sky-600">
          💬
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Room chat</h2>
          <p className="text-sm text-slate-500">Say hi to your listeners</p>
        </div>
      </div>

      <div className="mb-4 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white/40 p-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            No messages yet — start the conversation.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700"
            >
              {m}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-2xl border border-white/70 bg-white/70 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-200/50 transition hover:scale-[1.02] active:scale-[0.99]"
        >
          Send
        </button>
      </div>
    </section>
  );
}