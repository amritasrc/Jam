import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import RoomInfo from "./components/RoomInfo";
import NowPlaying from "./components/NowPlaying";
import TrackLibrary from "./components/TrackLibrary";
import ChatPanel from "./components/ChatPanel";
import { useJamSocket } from "./hooks/useJamSocket";

function App() {
  const jam = useJamSocket();
  const inRoom = Boolean(jam.roomId);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb orb--a" />
      <div className="orb orb--b" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-white/60 px-4 py-1.5 text-xs font-medium text-indigo-500 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Listen in sync
          </div>
          <h1 className="gradient-text text-5xl font-bold tracking-tight sm:text-6xl">
            Jam
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Listen together, wherever you are.
          </p>
        </header>

        {!inRoom ? (
          <div className="mx-auto w-full max-w-md space-y-4">
            <section className="glass rounded-3xl p-6 space-y-4">
              <CreateRoom onCreate={jam.createRoom} />
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or join an existing room
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <JoinRoom onJoin={jam.joinRoom} />
            </section>

            {jam.message && (
              <p className="text-center text-sm text-indigo-500">{jam.message}</p>
            )}

            <ul className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              <li className="rounded-2xl bg-white/50 p-3 text-center">
                Create a room in one tap
              </li>
              <li className="rounded-2xl bg-white/50 p-3 text-center">
                Share an 8-char code
              </li>
              <li className="rounded-2xl bg-white/50 p-3 text-center">
                Playback stays in sync
              </li>
            </ul>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <RoomInfo roomId={jam.roomId} members={jam.members} />
                <NowPlaying
                  title={jam.roomState.currentSong?.title ?? null}
                  videoId={jam.roomState.currentSong?.videoId ?? null}
                  thumbnail={jam.roomState.currentSong?.thumbnail ?? null}
                  isPlaying={jam.roomState.isPlaying}
                  currentTime={jam.roomState.currentTime}
                  isHost={jam.isHost}
                  onToggle={jam.togglePlayback}
                  duration={jam.roomState.currentSong?.duration ?? null}
                />

                {jam.message && (
                  <p className="text-sm text-indigo-500">{jam.message}</p>
                )}

                <TrackLibrary
                  isHost={jam.isHost}
                  currentSong={jam.roomState.currentSong}
                  onSelect={jam.selectSong}
                />
              </div>

              <div className="lg:row-span-2">
                <ChatPanel messages={jam.messages} onSend={jam.sendMessage} />
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={jam.leaveRoom}
                className="rounded-2xl bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-800"
              >
                Leave room
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
