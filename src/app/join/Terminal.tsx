"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../_components/auth-context";

interface TerminalProps {
  onApply?: () => void;
}

interface Line {
  id: number;
  text: string;
  variant?: "prompt" | "output" | "error";
}

const BOOT_SEQUENCE = [
  "booting recruitment shell v1.0.0 ...",
  "mounting /dev/pesu-auth ... ok",
  "loading domains: marketing, media, design, tech, events ... ok",
  "type 'help' to see available commands",
];

const FILES: Record<string, string> = {
  "readme.txt":
    "the club is looking for builders, designers, organizers and\nbreakers of things. we run five domains: marketing, media,\ndesign, tech and events. pick up to two.",
  "domains.txt": "marketing · media · design · tech · events",
  "recruitment.log": "status: applications open\ncloses: rolling admissions",
};

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return idCounter;
}

export default function Terminal({ onApply }: TerminalProps) {
  const { user, profile } = useAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [booted, setBooted] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion.current) {
      setLines(
        BOOT_SEQUENCE.map((text) => ({ id: nextId(), text, variant: "output" }))
      );
      setBooted(true);
      return;
    }

    let cancelled = false;
    (async () => {
      for (const text of BOOT_SEQUENCE) {
        await new Promise((r) => setTimeout(r, 260));
        if (cancelled) return;
        setLines((prev) => [...prev, { id: nextId(), text, variant: "output" }]);
      }
      if (!cancelled) setBooted(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  function print(text: string, variant: Line["variant"] = "output") {
    setLines((prev) => [...prev, { id: nextId(), text, variant }]);
  }

  function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    print(`$ ${cmd}`, "prompt");

    const [name, ...args] = cmd.split(/\s+/);

    switch (name.toLowerCase()) {
      case "help":
        print(
          [
            "available commands:",
            "  help          show this list",
            "  ls            list files",
            "  cat <file>    read a file",
            "  whoami        show current session",
            "  apply         jump to the application form",
            "  clear         clear the screen",
          ].join("\n")
        );
        break;

      case "ls":
        print(Object.keys(FILES).join("  "));
        break;

      case "cat": {
        const file = args[0];
        if (!file) {
          print("usage: cat <file>", "error");
          break;
        }
        if (FILES[file]) {
          print(FILES[file]);
        } else {
          print(`cat: ${file}: no such file`, "error");
        }
        break;
      }

      case "whoami":
        if (user) {
          print(
            `srn: ${user.srn}\nname: ${user.name}\nrole: ${user.role}\nbranch: ${
              user.branch || profile?.branch || "n/a"
            }`
          );
        } else {
          print("not authenticated. run the login flow at /login first.", "error");
        }
        break;

      case "apply":
        print("scrolling to application form ...");
        onApply?.();
        break;

      case "clear":
        setLines([]);
        return;

      default:
        print(`command not found: ${name}`, "error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runCommand(input);
    setInput("");
  }

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      <div className="term-bar">
        <div className="term-dots">
          <span className="term-dot" />
          <span className="term-dot" />
          <span className="term-dot" />
        </div>
        <span className="term-title">guest@pesu-club:~$</span>
      </div>

      <div className="term-body" ref={bodyRef}>
        {lines.map((line) => (
          <div
            key={line.id}
            className="term-line"
            style={{
              color:
                line.variant === "error"
                  ? "var(--danger)"
                  : line.variant === "prompt"
                  ? "var(--accent)"
                  : "var(--fg-dim)",
            }}
          >
            {line.text}
          </div>
        ))}
        {booted && <span className="term-cursor" />}
      </div>

      <form className="term-input-row" onSubmit={handleSubmit}>
        <span className="term-prompt">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={booted ? "type a command..." : ""}
          disabled={!booted}
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
