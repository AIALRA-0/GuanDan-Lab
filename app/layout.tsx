import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "贯策 · 科学掼蛋训练系统";
const description =
  "高性能掼蛋对局、逐手解释、搭档推理、其他选择比较与专项训练平台";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const rawHost =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const host = rawHost.replace(/[^a-zA-Z0-9.:[\]-]/g, "") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "https" || !host.startsWith("localhost")
      ? "https"
      : "http";
  const image = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "zh_CN",
      images: [
        {
          url: image,
          width: 1727,
          height: 911,
          alt: "贯策科学掼蛋训练系统",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
