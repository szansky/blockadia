import GameCanvas from "./game/GameCanvas";

const App = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-wide">Blockadia</h1>
        <p className="text-sm text-slate-400">
          Prototyp: mapa, kamera, podświetlanie pól.
        </p>
      </header>
      <main className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="aspect-[16/10] w-full">
            <GameCanvas />
          </div>
        </section>
        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div>
            <h2 className="text-lg font-semibold">Panel Panstwa</h2>
            <p className="text-sm text-slate-400">
              Tu beda zasoby, terytoria i dyplomacja.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="text-sm font-semibold text-slate-200">Zasoby</h3>
            <ul className="mt-2 text-sm text-slate-400">
              <li>Drewno: 120</li>
              <li>Kamien: 80</li>
              <li>Zloto: 45</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="text-sm font-semibold text-slate-200">Akcje</h3>
            <p className="mt-2 text-sm text-slate-400">
              Kliknij pole na mapie, aby sprawdzic teren.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;
