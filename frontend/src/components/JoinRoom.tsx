import { useState } from "react";

type JoinRoomProps = {
  onJoin: (code: string) => void;
};

export default function JoinRoom({ onJoin }: JoinRoomProps) {
  const [joinCode, setJoinCode] = useState("");

  const submit = () => {
    onJoin(joinCode);
  };

  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-200 to-sky-200 text-indigo-600">
          ⋯
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Join a room</h2>
          <p className="text-sm text-slate-500">Enter the code a friend shared</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="e.g. aB3xY9zQ"
          className="flex-1 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-2xl bg-linear-to-r from-indigo-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:scale-[1.02] active:scale-[0.99]"
        >
          Join
        </button>
      </div>
    </section>
  );
}