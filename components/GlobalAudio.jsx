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
     PLAY
  ------------------------------ */
  async function play(src, key) {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Ensure clean state before play (prevents overlap)
    audio.pause();
    audio.currentTime = 0;

    audio.src = src;
    audio.loop = loop;

    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }

    await audio.play();

    isPlayingRef.current = true;
    setCurrentKey(key);
  }

  /* ------------------------------
     STOP (FIXED FOR MP3)
  ------------------------------ */
  function stop() {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // HARD STOP media element (required for MP3)
    audio.pause();
    audio.currentTime = 0;

    // Clear source safely
    audio.src = "";
    audio.load();

    isPlayingRef.current = false;
    setCurrentKey(null);

    // ❌ DO NOT suspend AudioContext here
    // Suspending does NOT reliably stop MediaElementSource
    // and causes MP3 playback to continue in some browsers
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
