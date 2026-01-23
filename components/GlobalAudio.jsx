"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from "react";

const AudioContextCtx = createContext(null);

export function GlobalAudioProvider({ children }) {
  const audioRef = useRef(null);

  // Web Audio
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);

  // Visualizer
  const visualizerRef = useRef(null);
  const isPlayingRef = useRef(false);

  const [currentKey, setCurrentKey] = useState(null);
  const [loop, setLoopState] = useState(false);

  /* ------------------------------
     INIT WEB AUDIO (ONCE)
  ------------------------------ */
  useEffect(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.fftSize);

    // ✅ CREATE MEDIA SOURCE ONCE — NEVER DISCONNECT
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;
  }, []);

  /* ------------------------------
     SAFARI / MOBILE RESUME FIX
     (handles tab switch, sleep, focus)
  ------------------------------ */
  async function ensureAudioContextRunning() {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn("[GlobalAudio] AudioContext resume failed:", err);
      }
    }
  }

  /* ------------------------------
     LOOP
  ------------------------------ */
  function setLoop(value) {
    const v = !!value;
    setLoopState(v);
    if (audioRef.current) {
      audioRef.current.loop = v;
    }
  }

  /* ------------------------------
     PLAY
  ------------------------------ */
  async function play(src, key) {
    if (!audioRef.current || !audioContextRef.current) return;

    const audio = audioRef.current;

    // Clean stop before replay
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}

    // Safari-safe src reset
    audio.src = "";
    audio.src = src;
    audio.loop = loop;

    // Ensure AudioContext is alive (Safari / iOS)
    await ensureAudioContextRunning();

    try {
      await audio.play();
      isPlayingRef.current = true;
      setCurrentKey(key);
    } catch (err) {
      console.warn("[GlobalAudio.play] failed:", err);
      isPlayingRef.current = false;
      setCurrentKey(null);
    }
  }

  /* ------------------------------
     STOP 
  ------------------------------ */
  function stop() {
  if (!audioRef.current) return;

  const audio = audioRef.current;

  audio.pause();

  try {
    audio.currentTime = 0;
  } catch {}

  // ✅ HARD STOP — REQUIRED FOR MP3
  audio.src = "";

  isPlayingRef.current = false;
  setCurrentKey(null);
}
  return (
    <AudioContextCtx.Provider
      value={{
        play,
        stop,
        currentKey,
        loop,
        setLoop,

        // 🔊 visualizer exports
        analyser: analyserRef,
        dataArray: dataArrayRef,
        audioContext: audioContextRef,
        visualizerRef,
        isPlayingRef,
      }}
    >
      {children}
      <audio ref={audioRef} />
    </AudioContextCtx.Provider>
  );
}

export function useGlobalAudio() {
  return useContext(AudioContextCtx);
}
