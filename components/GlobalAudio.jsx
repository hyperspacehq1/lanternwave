"use client";

import { createContext, useContext, useRef, useState, useEffect } from "react";

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

  // ✅ Cancels stale async play() calls (fixes STOP not sticking)
  const playTokenRef = useRef(0);

  /* ------------------------------
     INIT WEB AUDIO (ONCE)
  ------------------------------ */
  useEffect(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const ctx = new window.AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    dataArrayRef.current = new Uint8Array(analyser.fftSize);
  }, []);

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
     PLAY (CANCEL-SAFE)
  ------------------------------ */
  async function play(src, key) {
    if (!audioRef.current) return;

    // New play op id
    const token = ++playTokenRef.current;

    const audio = audioRef.current;

    try {
      // Clean slate
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Some streams can throw on currentTime writes; ignore safely
      }

      audio.src = src;
      audio.loop = loop;

      // Resume context (required for analyser + playback in many browsers)
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Attempt to play
      await audio.play();

      // If STOP happened while we were awaiting play(), ignore stale completion
      if (token !== playTokenRef.current) return;

      isPlayingRef.current = true;
      setCurrentKey(key);
    } catch (err) {
      // If STOP happened, browsers often throw AbortError — treat as non-fatal
      if (token !== playTokenRef.current) return;

      // Ensure state is consistent on real errors
      isPlayingRef.current = false;
      setCurrentKey(null);

      // Optional: console noise control (leave minimal)
      console.warn("[GlobalAudio.play] failed:", err);
    }
  }

  /* ------------------------------
     STOP (AUTHORITATIVE)
  ------------------------------ */
  function stop() {
    if (!audioRef.current) return;

    // ✅ Invalidate any pending play() immediately
    playTokenRef.current++;

    const audio = audioRef.current;

    // Hard stop the media element
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore for non-seekable streams
    }

    // Fully detach the resource
    audio.src = "";
    audio.load();

    isPlayingRef.current = false;
    setCurrentKey(null);

    // NOTE: We intentionally do NOT suspend the AudioContext here.
    // Suspending doesn't reliably stop MediaElementSource and can cause weirdness.
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
