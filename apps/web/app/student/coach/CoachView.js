"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BotMessageSquare,
  Loader2,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const TOKEN_KEY = "cb_token";

// useMicVAD — wraps MicVAD from vad-web (vad-react not installed)
function useMicVAD(options) {
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [errored, setErrored] = useState(false);
  const instanceRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let destroyed = false;
    import("@ricky0123/vad-web").then(({ MicVAD }) => {
      MicVAD.new({
        startOnLoad: false,
        baseAssetPath: optionsRef.current.baseAssetPath,
        onnxWASMBasePath: optionsRef.current.onnxWASMBasePath,
        modelURL: optionsRef.current.modelURL,
        workletURL: optionsRef.current.workletURL,
        onSpeechStart: () => {
          setUserSpeaking(true);
          optionsRef.current.onSpeechStart?.();
        },
        onSpeechEnd: (audio) => {
          setUserSpeaking(false);
          optionsRef.current.onSpeechEnd?.(audio);
        },
        onVADMisfire: () => {
          setUserSpeaking(false);
          optionsRef.current.onVADMisfire?.();
        },
        positiveSpeechThreshold: optionsRef.current.positiveSpeechThreshold,
        negativeSpeechThreshold: optionsRef.current.negativeSpeechThreshold,
        preSpeechPadFrames: optionsRef.current.preSpeechPadFrames,
        redemptionFrames: optionsRef.current.redemptionFrames,
      }).then((inst) => {
        if (!destroyed) instanceRef.current = inst;
      }).catch(() => {
        if (!destroyed) setErrored(true);
      });
    }).catch(() => {
      if (!destroyed) setErrored(true);
    });

    return () => {
      destroyed = true;
      instanceRef.current?.destroy?.();
      instanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    start: () => instanceRef.current?.start(),
    pause: () => instanceRef.current?.pause(),
    userSpeaking,
    errored,
  };
}

// ── WAV encoding ──────────────────────────────────────────────────────────────
function float32ToWav(samples, sampleRate = 16000) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const write = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  const pcm = new Int16Array(buf, 44);
  for (let i = 0; i < samples.length; i++) {
    pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  }
  return new Blob([buf], { type: "audio/wav" });
}

function authToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ role, content, streaming, ttsEnabled, playing, loading, onPlay }) {
  const isUser = role === "user";
  const showPlay = !isUser && !streaming && content.trim().length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <BotMessageSquare size={14} />
        </div>
      )}
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-card text-foreground shadow-sm ring-1 ring-black/5"
        }`}
      >
        {content}
        {streaming && (
          <span className="ml-1 inline-block h-3 w-0.5 animate-pulse rounded-full bg-current opacity-60" />
        )}
        {showPlay && (
          <button
            type="button"
            onClick={onPlay}
            disabled={!ttsEnabled}
            title={
              !ttsEnabled
                ? "Voice replies are muted"
                : playing
                ? "Stop"
                : "Listen to this reply"
            }
            className={`mt-2 flex items-center gap-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              playing ? "text-blue-600" : "text-muted-foreground hover:text-blue-600"
            }`}
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : playing ? (
              <Square size={12} className="fill-current" />
            ) : (
              <Volume2 size={13} />
            )}
            {loading ? "Loading…" : playing ? "Stop" : "Listen"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Voice state overlay ───────────────────────────────────────────────────────
const VAD_LABELS = {
  idle: "Listening…",
  speech_start: "Hearing you…",
  transcribing: "Transcribing…",
  generating: "Thinking…",
  speaking: "Speaking…",
};

function VoiceStateOverlay({ state, userSpeaking }) {
  const label = userSpeaking ? VAD_LABELS.speech_start : (VAD_LABELS[state] ?? "Listening…");
  const pulsing = state === "idle" || state === "speech_start" || userSpeaking;
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        {pulsing && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500/20"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${
            userSpeaking ? "bg-blue-600" : "bg-muted"
          } transition-colors`}
        >
          <Mic size={18} className={userSpeaking ? "text-white" : "text-muted-foreground"} />
        </div>
      </div>
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Main coach view ───────────────────────────────────────────────────────────
export default function CoachView() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [vadState, setVadState] = useState("idle");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  // Which assistant message is currently playing aloud, and whether its audio
  // is still being fetched ("loading") vs actively playing.
  const [playingId, setPlayingId] = useState(null);
  const [playingLoading, setPlayingLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const currentAudioRef = useRef(null);
  const voiceModeRef = useRef(false);
  const conversationIdRef = useRef(null);
  // Keep a ref to vad so callbacks never have stale closures
  const vadRef = useRef(null);

  // Sync refs with state
  voiceModeRef.current = voiceMode;
  conversationIdRef.current = conversationId;

  // ── scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── load conversation history on mount ──
  useEffect(() => {
    async function init() {
      try {
        const convs = await api("/students/me/coach/conversations");
        if (convs.length > 0) {
          const latest = convs[0];
          setConversationId(latest.id);
          conversationIdRef.current = latest.id;
          const msgs = await api(
            `/students/me/coach/conversations/${latest.id}/messages`
          );
          setMessages(
            msgs.map((m) => ({ id: m.id, role: m.role, content: m.content, streaming: false }))
          );
        }
      } catch {
        /* First visit — conversation created lazily on first send */
      }
    }
    init();
  }, []);

  // ── ensure conversation ──
  const ensureConversation = useCallback(async () => {
    if (conversationIdRef.current) return conversationIdRef.current;
    const { id } = await api("/students/me/coach/conversations", { method: "POST" });
    setConversationId(id);
    conversationIdRef.current = id;
    return id;
  }, []);

  // ── stop TTS ──
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  // ── play TTS ──
  // onAudioReady fires once the audio actually starts (used to flip a
  // per-message button from "Loading…" to "Stop").
  const playTTS = useCallback(
    async (text, onAudioReady) => {
      if (!ttsEnabled || !text.trim()) return;
      stopAudio();
      setVadState("speaking");
      try {
        const res = await fetch(`${API_BASE}/students/me/coach/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken()}`,
          },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        await new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          // ended/error end playback naturally; pause fires when stopAudio()
          // pauses the element (e.g. user clicked Stop) — without this the
          // promise would hang forever on a manual stop.
          audio.onended = finish;
          audio.onerror = finish;
          audio.onpause = finish;
          audio.onplaying = () => onAudioReady?.();
          audio.play().catch(finish);
        });
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
      } finally {
        setVadState("idle");
        if (voiceModeRef.current) vadRef.current?.start();
      }
    },
    [ttsEnabled, stopAudio]
  );

  // ── play a single message on demand (per-bubble Listen button) ──
  const playMessage = useCallback(
    async (id, text) => {
      if (!ttsEnabled || !text.trim()) return;
      // Clicking the message that's already playing → stop it.
      if (playingId === id) {
        stopAudio();
        setPlayingId(null);
        setPlayingLoading(false);
        setVadState("idle");
        return;
      }
      setPlayingId(id);
      setPlayingLoading(true);
      try {
        await playTTS(text, () => setPlayingLoading(false));
      } finally {
        setPlayingId((cur) => (cur === id ? null : cur));
        setPlayingLoading(false);
      }
    },
    [ttsEnabled, playingId, stopAudio, playTTS]
  );

  // ── mute toggle (bottom speaker button) ──
  const toggleTts = useCallback(() => {
    if (ttsEnabled) {
      // Muting: silence anything currently playing.
      stopAudio();
      setPlayingId(null);
      setPlayingLoading(false);
      setVadState("idle");
    }
    setTtsEnabled((v) => !v);
  }, [ttsEnabled, stopAudio]);

  // ── send message via SSE ──
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || sending) return;
      setSending(true);

      const userMsgId = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: text, streaming: false },
      ]);
      const asstMsgId = userMsgId + 1;
      setMessages((prev) => [
        ...prev,
        { id: asstMsgId, role: "assistant", content: "", streaming: true },
      ]);

      let fullReply = "";
      try {
        const convId = await ensureConversation();
        const res = await fetch(
          `${API_BASE}/students/me/coach/conversations/${convId}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken()}`,
            },
            body: JSON.stringify({ message: text }),
          }
        );
        if (!res.ok) throw new Error(`${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const raw = part.slice(6);
            if (raw === "[DONE]") continue;
            try {
              const { chunk } = JSON.parse(raw);
              fullReply += chunk;
              setMessages((prev) =>
                prev.map((m) => (m.id === asstMsgId ? { ...m, content: fullReply } : m))
              );
            } catch {}
          }
        }
      } catch {
        fullReply = "Sorry, I couldn't respond right now. Please try again.";
        setMessages((prev) =>
          prev.map((m) => (m.id === asstMsgId ? { ...m, content: fullReply } : m))
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === asstMsgId ? { ...m, streaming: false } : m))
        );
        setSending(false);
        setVadState("idle");
      }

      if (voiceModeRef.current && fullReply) {
        await playTTS(fullReply);
      } else if (voiceModeRef.current) {
        vadRef.current?.start();
      }
    },
    [sending, ensureConversation, playTTS]
  );

  // ── transcribe audio blob and send ──
  const transcribeAndSend = useCallback(
    async (audioFloat32) => {
      setVadState("transcribing");
      const wavBlob = float32ToWav(audioFloat32);
      const form = new FormData();
      form.append("audio", wavBlob, "speech.wav");
      try {
        const res = await fetch(`${API_BASE}/students/me/coach/transcribe`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken()}` },
          body: form,
        });
        if (!res.ok) { setVadState("idle"); return; }
        const { text } = await res.json();
        if (text?.trim()) {
          setVadState("generating");
          await sendMessage(text.trim());
        } else {
          setVadState("idle");
          vadRef.current?.start();
        }
      } catch {
        setVadState("idle");
        if (voiceModeRef.current) vadRef.current?.start();
      }
    },
    [sendMessage]
  );

  // ── VAD (always called; controlled via start/pause) ──
  // Asset paths are pinned to "/" because the Dockerfile copies
  // silero_vad_legacy.onnx, vad.worklet.bundle.min.js, and ort-wasm*.wasm into
  // /public. vad-web derives the model filename from baseAssetPath + the model
  // name (default "legacy" → /silero_vad_legacy.onnx), so modelURL is omitted.
  const vad = useMicVAD({
    startOnLoad: false,
    baseAssetPath: "/",
    onnxWASMBasePath: "/",
    workletURL: "/vad.worklet.bundle.min.js",
    onSpeechStart: () => setVadState("speech_start"),
    onSpeechEnd: (audio) => {
      vadRef.current?.pause();
      transcribeAndSend(audio);
    },
    onVADMisfire: () => setVadState("idle"),
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    preSpeechPadFrames: 5,
    redemptionFrames: 8,
  });

  // Keep vadRef current so other callbacks always reach the live vad object
  vadRef.current = vad;

  // ── toggle voice mode ──
  const toggleVoiceMode = useCallback(() => {
    const next = !voiceModeRef.current;
    setVoiceMode(next);
    if (next) {
      stopAudio();
      setVadState("idle");
      vadRef.current?.start();
    } else {
      vadRef.current?.pause();
      stopAudio();
      setVadState("idle");
    }
  }, [stopAudio]);

  // ── text submit ──
  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      if (!input.trim()) return;
      const text = input;
      setInput("");
      sendMessage(text);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[480px] flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <BotMessageSquare size={22} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">
                Meet Aisha, your career coach
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ask about jobs, skills, resume tips, or anything about your career path.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {[
                "What career paths suit me?",
                "How can I improve my resume?",
                "What skills should I learn next?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-pill border border-border px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-blue-300 hover:text-blue-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              streaming={m.streaming}
              ttsEnabled={ttsEnabled}
              playing={playingId === m.id}
              loading={playingId === m.id && playingLoading}
              onPlay={() => playMessage(m.id, m.content)}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Voice overlay */}
      <AnimatePresence>
        {voiceMode && (
          <motion.div
            key="voice-overlay"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-muted/40"
          >
            <VoiceStateOverlay state={vadState} userSpeaking={vad?.userSpeaking} />
            {vad?.errored && (
              <p className="pb-2 text-center text-[12px] text-red-500">
                Microphone unavailable — using text input
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            className="input-base flex-1 resize-none"
            rows={1}
            placeholder={voiceMode ? "Or type here…" : "Ask Aisha anything…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{ minHeight: 44, maxHeight: 120 }}
          />

          {/* TTS mute */}
          <button
            type="button"
            onClick={toggleTts}
            title={ttsEnabled ? "Mute voice replies" : "Unmute voice replies"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Voice toggle */}
          <button
            type="button"
            onClick={toggleVoiceMode}
            disabled={!!vad?.errored}
            title={voiceMode ? "Stop voice mode" : "Start voice mode"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
              voiceMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {voiceMode ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Send */}
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
