const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="9" fill="#0f392b"/>
  <rect x="7" y="8" width="12" height="17" rx="2" fill="#d4a536" opacity=".48" transform="rotate(-9 7 8)"/>
  <rect x="13" y="7" width="12" height="18" rx="2" fill="#fffefa" stroke="#d7d2c6"/>
  <circle cx="19" cy="13" r="2.5" fill="#ad382f"/>
  <path d="M16.5 20h5" stroke="#174f3b" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
