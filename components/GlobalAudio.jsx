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

    const ctx = new window.AudioContext();

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
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
     CONNECT SOURCE (SAFE)
  ------------------------------ */
  function connectSource() {
    if (
      !audioContextRef.current ||
      !audioRef.current ||
      sourceRef.current
    ) {
      return;
    }

    const source = audioContextRef.current.createMediaElementSource(
      audioRef.current
    );
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    sourceRef.current = source;
  }

  /* ------------------------------
     DISCONNECT SOURCE (CRITICAL)
  ------------------------------ */
  function disconnectSource() {
    if (!sourceRef.current) return;

    try {
      sourceRef.current.disconnect();
    } catch {
      // ignore — already disconnected
    }

    sourceRef.current = null;
  }

  /* ------------------------------
     PLAY
  ------------------------------ */
  async function play(src, key) {
    if (!audioRef.current || !audioContextRef.current) return;

    const audio = audioRef.current;

    // Ensure fully stopped state
    disconnectSource();
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}

    audio.src = src;
    audio.loop = loop;

    // Resume audio context (required by browsers)
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    // 🔴 MUST reconnect AFTER src is set
    connectSource();

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
     STOP (RESTORED BEHAVIOR)
  ------------------------------ */
  function stop() {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // 🔴 THIS IS THE FIX
    disconnectSource();

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}

    audio.removeAttribute("src");
    audio.load();

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
