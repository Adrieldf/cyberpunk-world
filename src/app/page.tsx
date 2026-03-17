import { Scene } from "@/components/Scene";

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>
    </main>
  );
}
