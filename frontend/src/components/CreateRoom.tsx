type CreateRoomProps = {
  onCreate: () => void;
  disabled?: boolean;
};

export default function CreateRoom({ onCreate, disabled = false }: CreateRoomProps) {
  return (
    <button
      type="button"
      onClick={onCreate}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-2xl bg-linear-to-r from-rose-400 via-fuchsia-400 to-indigo-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-300/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-fuchsia-300/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        <span className="text-lg">♪</span>
        Create a new room
      </span>
      <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-white/0 via-white/25 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
    </button>
  );
}