import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexBrain",
  description: "Des problématiques aux projets réalisables — 5 agents IA pour explorer, imaginer, analyser, estimer et décider.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
