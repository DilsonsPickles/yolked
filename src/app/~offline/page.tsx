export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-black tracking-tight">YOLKED</h1>
      <p className="mt-4 text-lg text-zinc-400">You are currently offline</p>
      <p className="mt-2 text-sm text-zinc-600">
        Check your connection and try again
      </p>
    </div>
  );
}
