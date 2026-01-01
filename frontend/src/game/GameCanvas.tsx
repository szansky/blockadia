import { useEffect, useRef } from "react";
import { createGame } from "./createGame";

const GameCanvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = createGame(containerRef.current.id);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div id="game-root" ref={containerRef} className="h-full w-full" />;
};

export default GameCanvas;
