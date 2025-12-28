"use client";

import { createContext, useContext, useRef, useState } from "react";

const AudioContext = createContext(null);

export function GlobalAudioProvider({ children }) {
  const audioRef = useRef(null);
  const [currentKey, setCurrentKey] = useState(null);
  const [loop, setLoopState] = useState(false);

  function setLoop(value) {
    const v = !!value;
    setLoopState(v);
    // ✅ CRITICAL: update the real audio element immediately
    if (audioRef.current) {
      audioRef.current.loop = v;
    }
  }

  function play(src, key) {
    if (!audioRef.current) return;
    audioRef.current.src = src;
    // ✅ ensure current loop mode is applied at start
    audioRef.current.loop = loop;
    audioRef.current.play();
    setCurrentKey(key);
  }

  function stop() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.removeAttribute("src");
    audioRef.current.load();
    setCurrentKey(null);
  }

  return (
    <AudioContext.Provider value={{ play, stop, currentKey, loop, setLoop }}>
      {children}
      <audio ref={audioRef} />
    </AudioContext.Provider>
  );
}

export function useGlobalAudio() {
  return useContext(AudioContext);
}
