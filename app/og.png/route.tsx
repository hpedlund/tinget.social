import { ImageResponse } from "next/og";

import { OG_IMAGE } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site";

// A route handler (not opengraph-image.tsx) so the export writes og.png with
// an extension GitHub Pages can serve as image/png.
export const dynamic = "force-static";

// A raster image cannot read the theme's CSS variables; these match the light
// theme's foreground, muted foreground and background.
const FOREGROUND = "#0a0a0a";
const MUTED = "#525252";
const BACKGROUND = "#ffffff";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: BACKGROUND,
          color: FOREGROUND,
          borderBottom: `16px solid ${FOREGROUND}`,
        }}
      >
        <div style={{ fontSize: 40 }}>{SITE_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 88, lineHeight: 1.05 }}>Närvaro i riksdagen</div>
          <div style={{ fontSize: 40, color: MUTED, lineHeight: 1.3 }}>
            Vilka riksdagsledamöter är på plats och röstar — och vilka är det inte?
          </div>
        </div>
        <div style={{ fontSize: 28, color: MUTED }}>Källa: Sveriges riksdag</div>
      </div>
    ),
    { width: OG_IMAGE.width, height: OG_IMAGE.height },
  );
}
