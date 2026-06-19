"use client";

import { useState, useEffect, useRef } from "react";

const WORDS = ["expenses", "planned expenses", "vehicle expenses", "goals", "reminders"];
const HOLD_MS = 2000;
const DURATION = 0.5;
const BASE_SPEED = DURATION * 200;

export function AnimatedTextLoop() {
  const [text, setText] = useState("");
  const state = useRef({ wordIndex: 0, charIndex: 0, isDeleting: false });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function tick() {
      const s = state.current;
      const word = WORDS[s.wordIndex]!;
      let speed = BASE_SPEED;

      if (s.isDeleting) {
        setText(word.substring(0, s.charIndex - 1));
        s.charIndex--;
        speed = BASE_SPEED / 2;
      } else {
        setText(word.substring(0, s.charIndex + 1));
        s.charIndex++;
      }

      if (!s.isDeleting && s.charIndex === word.length) {
        s.isDeleting = true;
        speed = HOLD_MS;
      } else if (s.isDeleting && s.charIndex === 0) {
        s.isDeleting = false;
        s.wordIndex = (s.wordIndex + 1) % WORDS.length;
        speed = 300;
      }

      timeout = setTimeout(tick, speed);
    }

    timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .typewriter-cursor {
          display: inline-block;
          width: 2px;
          height: 0.85em;
          background-color: #16a34a;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: blink-cursor 1s step-end infinite;
        }
      `}</style>
      <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        <span className="text-foreground">Track your </span>
        <span className="whitespace-nowrap">
          <span className="text-emerald-600 dark:text-emerald-400">{text}</span>
          <span className="typewriter-cursor" aria-hidden />
        </span>
      </p>
    </>
  );
}
