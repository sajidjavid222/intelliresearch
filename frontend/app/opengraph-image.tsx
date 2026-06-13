import { ImageResponse } from "next/og";

export const alt = "IntelliResearch — Autonomous AI Research Assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card rendered at build time. No external fonts so the
// Docker build stays hermetic.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #022c22 0%, #08966d 55%, #6d28d9 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "10px 22px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.25)",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "1px",
          }}
        >
          AI RESEARCH ASSISTANT
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          IntelliResearch
        </div>

        <div style={{ marginTop: 28, fontSize: 40, color: "rgba(255,255,255,0.9)", maxWidth: 900 }}>
          Ten AI agents discover papers, datasets, grants, code and collaborators,
          then synthesize a cited literature review.
        </div>

        <div style={{ display: "flex", gap: "28px", marginTop: 48, fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>
          <span>200M+ papers</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>12 sources</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>10 agents</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
