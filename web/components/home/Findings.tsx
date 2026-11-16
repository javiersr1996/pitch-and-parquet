import Link from "next/link";
import type { ReactNode } from "react";
import { GRAVITY_HOOK, GRAVITY_MATCHES } from "../../lib/learn/gravity-data";
import { lessonFigures } from "../../lib/learn/lesson-figures";
import { PLATFORM } from "../../lib/platform";

// What the site found (P20, task 175): one claim per card, its figure large, in the words of the
// page the card opens, never stronger. Every figure is read here at build time through the loaders
// those pages use (quality.json's gravity rows, platform.json); none is typed.
// `data-finding` names the card for the e2e, which compare each figure with its file.
// The gravity card counts matches, not one shot (P34): a single flight read as a claim about physics.
const GRAVITY = lessonFigures(GRAVITY_HOOK, GRAVITY_MATCHES);
const FLIGHTS = GRAVITY_MATCHES.reduce((n, m) => n + m.flights, 0);

interface Finding {
  key: string;
  href: string;
  value: ReactNode;
  vs: ReactNode;
  title: string;
  about: ReactNode;
}

function findings(): Finding[] {
  return [
    {
      key: "gravity",
      href: "/learn/gravity",
      value: (
        <>
          <span data-fig="medians_below">{GRAVITY.medians_below}</span> of <span data-fig="sign_n">{GRAVITY.sign_n}</span>
        </>
      ),
      vs: (
        <>
          matches whose median g is below standard gravity, <span data-fig="g_real">{GRAVITY_HOOK.g_real}</span> m/s²
        </>
      ),
      title: "Most flights in every match curve less than gravity says they should",
      about: (
        <>
          The median g of <span data-fig="flights">{FLIGHTS}</span> accepted flights, match by match, in SkillCorner&apos;s
          open basketball tracking. The lesson rules some causes out and leaves the rest open.
        </>
      ),
    },
    {
      key: "bytes",
      href: "/engineering",
      value: (
        <span data-fig="title" data-platform-title>
          {PLATFORM.title}
        </span>
      ),
      vs: <span data-fig="subtitle">{PLATFORM.subtitle}</span>,
      title: `One pipeline run, ${PLATFORM.layers.length} layers`,
      about: "What the latest build read from SkillCorner and what it published from it, as the build itself measured them.",
    },
  ];
}

export function Findings() {
  return (
    <ul className="findings">
      {findings().map((f) => (
        <li key={f.key} className="finding" data-finding={f.key}>
          <p className="finding-value">{f.value}</p>
          <p className="finding-vs">{f.vs}</p>
          <h3>
            <Link href={f.href} prefetch={false}>
              {f.title}
            </Link>
          </h3>
          <p className="finding-about">{f.about}</p>
          <p className="finding-tag" aria-hidden="true">
            {f.href} →
          </p>
        </li>
      ))}
    </ul>
  );
}
