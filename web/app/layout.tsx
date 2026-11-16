import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "../components/site/Nav";
import { AUTHOR, DATA_SOURCES, REPO, SITE } from "../lib/sections";
import "./globals.css";

// One webfont, the Latin subset of JetBrains Mono's variable file (OFL, fonts/OFL-JetBrainsMono.txt)
// committed in this repo, so the build needs no network and no page asks a font CDN; it is
// preloaded and counts against the 400,000 B page budgets. It sets the headings, eyebrows, labels,
// nav, buttons, figures and code of every page (P12, P13); paragraphs stay on the system stack.
const mono = localFont({
  src: "./fonts/JetBrainsMono-latin-variable.woff2",
  weight: "100 800",
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Pitch & Parquet",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header surface-neon">
          <div className="wrap site-header-row">
            <Link href="/" className="wordmark">
              pitch<span>parquet</span>
              <span className="wordmark-caret" aria-hidden="true">
                _
              </span>
            </Link>
            <Nav />
          </div>
        </header>
        {children}
        <footer className="site-footer surface-neon">
          <div className="wrap site-footer-grid">
            <p className="wordmark">
              pitch<span>parquet</span>
            </p>
            <div>
              <p className="site-footer-label">data</p>
              <p>
                SkillCorner&apos;s open data, published under the MIT license in{" "}
                {DATA_SOURCES.map((s, i) => (
                  <span key={s.href}>
                    {i === 0 ? "" : i === DATA_SOURCES.length - 1 ? " and " : ", "}
                    <a href={s.href}>{s.name}</a> ({s.what})
                  </span>
                ))}
                . Credit for the tracking, event and body pose data goes to SkillCorner.
              </p>
              <p className="site-footer-note">Not affiliated with SkillCorner.</p>
            </div>
            <div>
              <p className="site-footer-label">code</p>
              <ul className="site-footer-links">
                <li>
                  <a href={REPO}>Code on GitHub, MIT license</a>
                </li>
              </ul>
            </div>
            {/* P20, task 171: who made it and what it is not, on every route. */}
            <div className="site-footer-author" data-footer-author>
              <p>
                A personal learning project by {AUTHOR.name}:{" "}
                <Link href="/about" prefetch={false}>
                  About
                </Link>
                , <a href={AUTHOR.linkedin}>LinkedIn</a>, <a href={REPO}>GitHub</a>.
              </p>
              <p className="site-footer-note">
                Non-commercial, built for learning; not affiliated with SkillCorner. More in{" "}
                <Link href="/about" prefetch={false}>
                  /about
                </Link>
                .
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
