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

  // Visualizer / state
  const visualizerRef = useRef(null);
  const isPlayingRef = useRef(false);

  // 🔒 play-cancellation token
  const playTokenRef = useRef(0);

  const [currentKey, setCurrentKey] = useState(null);
  const [loop, setLoopState] = useState(false);

  /* ------------------------------
     INIT WEB AUDIO
  ------------------------------ */
  useEffect(() => {
    console.log("[GlobalAudio] useEffect init");

    if (!audioRef.current || audioContextRef.current) {
      console.log("[GlobalAudio] init skipped", {
        hasAudio: !!audioRef.current,
        hasCtx: !!audioContextRef.current,
      });
      return;
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.fftSize);

    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    sourceRef.current = source;

    console.log("[GlobalAudio] WebAudio initialized", {
      state: ctx.state,
    });
  }, []);

  /* ------------------------------
     SAFARI / MOBILE RESUME FIX
  ------------------------------ */
  async function ensureAudioContextRunning() {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      console.log("[GlobalAudio] resuming AudioContext");
      try {
        await ctx.resume();
        console.log("[GlobalAudio] AudioContext resumed");
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
    console.log("[GlobalAudio] setLoop", v);

    setLoopState(v);
    if (audioRef.current) {
      audioRef.current.loop = v;
    }
  }

  /* ------------------------------
     PLAY (FULL DEBUG)
  ------------------------------ */
  async function play(src, key) {
    if (!audioRef.current || !audioContextRef.current) {
      console.warn("[GlobalAudio.play] aborted — missing refs");
      return;
    }

    const audio = audioRef.current;

    const token = ++playTokenRef.current;

    console.log("[GlobalAudio.play] START", {
      token,
      key,
      src,
      currentSrc: audio.currentSrc,
      paused: audio.paused,
      time: audio.currentTime,
    });

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}

    audio.src = "";
    audio.src = src;
    audio.loop = loop;

    await ensureAudioContextRunning();

    try {
      await audio.play();

      console.log("[GlobalAudio.play] play() resolved", {
        token,
        paused: audio.paused,
        currentSrc: audio.currentSrc,
      });

      if (token !== playTokenRef.current) {
        console.warn("[GlobalAudio.play] STALE play() ignored", {
          token,
          current: playTokenRef.current,
        });
        return;
      }

      isPlayingRef.current = true;
      setCurrentKey(key);
    } catch (err) {
      console.error("[GlobalAudio.play] FAILED", err);
      if (token === playTokenRef.current) {
        isPlayingRef.current = false;
        setCurrentKey(null);
      }
    }
  }

  /* ------------------------------
     STOP (FULL DEBUG + HARD RESET)
  ------------------------------ */
  function stop() {
    if (!audioRef.current) {
      console.warn("[GlobalAudio.stop] no audioRef");
      return;
    }

    const audio = audioRef.current;

    playTokenRef.current++;

    console.log("[GlobalAudio.stop] BEFORE", {
      key: currentKey,
      currentSrc: audio.currentSrc,
      paused: audio.paused,
      time: audio.currentTime,
      token: playTokenRef.current,
    });

    audio.pause();

    try {
      audio.currentTime = 0;
    } catch {}

    // 🔥 HARD RESET (stronger than src="")
    audio.removeAttribute("src");
    try {
      audio.load();
    } catch {}

    isPlayingRef.current = false;
    setCurrentKey(null);

    console.log("[GlobalAudio.stop] AFTER", {
      currentSrc: audio.currentSrc,
      paused: audio.paused,
      time: audio.currentTime,
    });

    // 🔍 Detect duplicate audio elements
    if (typeof document !== "undefined") {
      const audios = Array.from(document.querySelectorAll("audio")).map(
        (a, i) => ({
          i,
          currentSrc: a.currentSrc,
          paused: a.paused,
          time: a.currentTime,
        })
      );

      console.log("[GlobalAudio.stop] AUDIO ELEMENTS ON PAGE:", audios);
    }
  }

  return (
    <AudioContextCtx.Provider
      value={{
        play,
        stop,
        currentKey,
        loop,
        setLoop,
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
