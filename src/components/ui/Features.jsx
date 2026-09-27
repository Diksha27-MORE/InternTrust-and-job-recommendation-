import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Features.css";

// ── Card background images ──
import feature01 from "../../assets/feature-01.png";
import feature02 from "../../assets/feature-02.png";
import feature03 from "../../assets/feature-03.png";
import feature04 from "../../assets/feature-04.png";

const CARD_IMAGES = [feature01, feature02, feature03, feature04];

gsap.registerPlugin(ScrollTrigger);

// Live viewport metrics, synced to actual .cts-sticky box
const vp = {
  w: typeof window !== "undefined" ? window.innerWidth : 1440,
  h: typeof window !== "undefined" ? window.innerHeight : 900,
};

// ── Layout constants (desktop only) ─────────────────────────────
const HERO_W = () => 780;
const HERO_H = () => 830;
const HERO_BR = () => 20;
const SMALL_W = () => 158;
const SMALL_H = () => Math.round(SMALL_W() / (780 / 830));
const SMALL_BR = () => 20;
const THUMB_W = () => 58;
const THUMB_H = () => Math.round(THUMB_W() / (780 / 830));
const THUMB_BR = () => 12;

const heroX = () => Math.round((vp.w - HERO_W()) / 2);
const heroY = () => Math.round((vp.h - HERO_H()) / 2);
const thumbX = () => Math.round((vp.w - THUMB_W()) / 2);
const thumbY = () => Math.round(vp.h * 0.72);

const TL_X = () => heroX() - 200;
const TL_Y = () => 40;

const DESC_GAP = 60;
const DESC_W_DESKTOP = 320;
const DESC_X_LEFT = () => heroX() - (DESC_W_DESKTOP + DESC_GAP);
const DESC_X_RIGHT = () => heroX() + HERO_W() + DESC_GAP;
const DESC_Y = () => heroY() + Math.round(HERO_H() * 0.30);

const BR_X = () => heroX() + HERO_W() + DESC_GAP + 35;
const BR_Y = () => DESC_Y() + 450;

// ── Timeline pacing constants ────────────────────────────────────
const HOLD0_DUR = 1.5;
const HEADLINE_EXIT_DUR = 0.8;
const CARD_GROW_DUR = 1.5;
const LABEL_IN_DELAY = 0.9;
const LABEL_IN_DUR = 0.6;
const LABEL_OUT_DUR = 0.3;
const TYPE_START_DELAY = 1.5;
const TYPE_DURS = [1.2, 1.2, 1.2, 1.2];
const POST_TYPE_PAUSE = 0.3;
const DESC_FADE_IN_DUR = 0.5;
const DESC_FADE_OUT_DUR = 0.4;
const SECTION_IN_DUR = 0.6;
const SECTION_OUT_DUR = 0.5;
const SECTION_HOLD_DUR = 1.8;
const HOLD_AFTER_SECTIONS = 0.6;
const NEXT_PREVIEW_DELAY = 0.6;
const NEXT_PREVIEW_DUR = 0.65;
const TL_SHRINK_DUR = 1.5;
const GRANDPARENT_FADE_DUR = 0.4;
const FINAL_HOLD_DUR = 1.0;
const FINAL_PAUSE_DUR = 1.2;
const SECTION_HEIGHT = "900vh";

const CARDS = [
  {
    num: "01",
    title: "URL\nVERIFICATION",
    desc: [
      {
        heading: "URL Verification",
        body: "Check suspicious job and internship links before opening them. Verify the website domain, secure connection, and authenticity to avoid fake recruitment portals and phishing websites.",
      },
    ],
  },
  {
    num: "02",
    title: "EMAIL\nANALYSIS",
    desc: [
      {
        heading: "Email Analysis",
        body: "Analyze recruitment emails for suspicious signals such as unusual sender addresses, misleading messages, suspicious links, and unexpected attachments before responding or sharing personal information.",
      },
    ],
  },
  {
    num: "03",
    title: "RISK\nDETECTION",
    desc: [
      {
        heading: "Risk Detection",
        body: "Identify potential scam indicators by analyzing job details, company information, communication patterns, and other warning signs. Get a clear risk level to make safer decisions.",
      },
    ],
  },
  {
    num: "04",
    title: "JOB\nRECOMMENDATIONS",
    desc: [
      {
        heading: "Job Recommendations",
        body: "Discover relevant job and internship opportunities based on your skills, interests, and career goals. Get personalized recommendations that help you focus on opportunities suited to your profile.",
      },
    ],
  },
];

const CARD_LINES = CARDS.map((c) => (c.title || "").split("\n"));
const sideForIndex = (si) => (si % 2 === 0 ? "left" : "right");

export default function Features() {
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const headlineRef = useRef(null);
  const cardRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const descLeftRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const descRightRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const titleRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const labelRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const lineRefs = [
    [useRef(null), useRef(null)],
    [useRef(null), useRef(null)],
    [useRef(null), useRef(null)],
    [useRef(null), useRef(null)],
  ];
  const descSectionRefs = useRef([[], [], [], []]);
  const setDescSectionRef = (cardIdx, secIdx) => (el) => {
    descSectionRefs.current[cardIdx][secIdx] = el;
  };

  useEffect(() => {
    const section = sectionRef.current;
    const E_OUT = "power3.out";
    const E_IN = "power2.in";
    const E_INOUT = "power3.inOut";

    const ctx = gsap.context(() => {
      const syncViewportMetrics = () => {
        const rect = stickyRef.current?.getBoundingClientRect();
        vp.w = rect && rect.width > 0 ? rect.width : window.innerWidth;
        vp.h = rect && rect.height > 0 ? rect.height : window.innerHeight;
      };

      const renderTyped = (cardIdx, p) => {
        const [l0, l1] = lineRefs[cardIdx];
        if (!l0.current || !l1.current) return;
        const [t0, t1] = CARD_LINES[cardIdx];
        const total = t0.length + t1.length;
        const shown = Math.round(gsap.utils.clamp(0, 1, p) * total);
        l0.current.textContent = t0.slice(0, Math.min(shown, t0.length));
        l1.current.textContent = shown > t0.length ? t1.slice(0, shown - t0.length) : "";
      };

      const applyInitialState = () => {
        syncViewportMetrics();
        gsap.set(headlineRef.current, { opacity: 1, y: 0 });

        gsap.set(cardRefs[0].current, {
          x: thumbX(), y: thumbY(),
          width: THUMB_W(), height: THUMB_H(),
          opacity: 1, zIndex: 10, borderRadius: THUMB_BR(),
        });
        gsap.set(cardRefs[1].current, {
          x: BR_X(), y: BR_Y() + 80,
          width: SMALL_W(), height: SMALL_H(),
          opacity: 0, zIndex: 6, borderRadius: SMALL_BR(),
        });
        gsap.set(cardRefs[2].current, {
          x: BR_X(), y: BR_Y() + 80,
          width: SMALL_W(), height: SMALL_H(),
          opacity: 0, zIndex: 4, borderRadius: SMALL_BR(),
        });
        gsap.set(cardRefs[3].current, {
          x: BR_X(), y: BR_Y() + 80,
          width: SMALL_W(), height: SMALL_H(),
          opacity: 0, zIndex: 2, borderRadius: SMALL_BR(),
        });

        descLeftRefs.forEach((r) => {
          if (r.current) gsap.set(r.current, { x: DESC_X_LEFT(), y: DESC_Y(), opacity: 0 });
        });
        descRightRefs.forEach((r) => {
          if (r.current) gsap.set(r.current, { x: DESC_X_RIGHT(), y: DESC_Y(), opacity: 0 });
        });

        descSectionRefs.current.forEach((cardSections) => {
          cardSections.forEach((el, si) => {
            if (!el) return;
            const fromX = sideForIndex(si) === "left" ? -30 : 30;
            gsap.set(el, { opacity: 0, x: fromX, y: 0 });
          });
        });

        gsap.set(titleRefs.filter((r) => r.current).map((r) => r.current), { opacity: 0 });
        gsap.set(labelRefs.filter((r) => r.current).map((r) => r.current), { opacity: 0 });

        CARDS.forEach((_, i) => renderTyped(i, 0));
      };

      applyInitialState();

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 2,
          pin: stickyRef.current,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const typeText = (cardIdx, atTime, dur) => {
        const proxy = { p: 0 };
        tl.to(
          proxy,
          {
            p: 1,
            duration: dur,
            ease: "none",
            onUpdate: () => renderTyped(cardIdx, proxy.p),
          },
          atTime,
        );
      };

      const cycleSubSections = (cardIdx, startTime, perSectionDur) => {
        const sections = descSectionRefs.current[cardIdx]
          .map((el, si) => ({ el, si }))
          .filter((x) => x.el);
        if (sections.length === 0) return 0;
        sections.forEach(({ el, si }, i) => {
          const slotStart = startTime + i * perSectionDur;
          tl.to(el, { opacity: 1, x: 0, y: 0, ease: E_OUT, duration: SECTION_IN_DUR }, slotStart);
          if (i < sections.length - 1) {
            const outX = sideForIndex(si) === "left" ? -20 : 20;
            const outAt = slotStart + perSectionDur - SECTION_OUT_DUR;
            tl.to(el, { opacity: 0, x: outX, y: 0, ease: E_IN, duration: SECTION_OUT_DUR }, outAt);
          }
        });
        return sections.length * perSectionDur;
      };

      const descPair = (i) => [descLeftRefs[i].current, descRightRefs[i].current].filter(Boolean);

      let t = 0;
      tl.addLabel("hold0", t);
      t += HOLD0_DUR;

      CARDS.forEach((card, i) => {
        const growAt = t;
        tl.addLabel(`grow${i}`, growAt);

        if (i === 0) {
          tl.to(headlineRef.current, {
            y: "-120%", opacity: 0, ease: E_INOUT, duration: HEADLINE_EXIT_DUR,
          }, growAt);
        } else {
          tl.to(cardRefs[i - 1].current, {
            x: () => TL_X(), y: () => TL_Y(),
            width: () => SMALL_W(), height: () => SMALL_H(),
            borderRadius: () => SMALL_BR(),
            opacity: 1,
            ease: E_INOUT, duration: TL_SHRINK_DUR,
          }, growAt);

          if (i - 2 >= 0) {
            tl.to(cardRefs[i - 2].current, {
              x: () => TL_X() - 24, opacity: 0, ease: E_IN, duration: GRANDPARENT_FADE_DUR,
            }, growAt);
          }

          tl.to(descPair(i - 1), { opacity: 0, ease: E_IN, duration: DESC_FADE_OUT_DUR }, growAt);
          tl.to(labelRefs[i - 1].current, { opacity: 0, ease: E_IN, duration: LABEL_OUT_DUR }, growAt);
          tl.to(titleRefs[i - 1].current, { opacity: 0, ease: E_IN, duration: LABEL_OUT_DUR }, growAt);
          tl.call(() => renderTyped(i - 1, 0), null, growAt + 0.3);
        }

        tl.to(cardRefs[i].current, {
          x: () => heroX(), y: () => heroY(),
          width: () => HERO_W(), height: () => HERO_H(),
          borderRadius: () => HERO_BR(),
          opacity: 1, zIndex: 10,
          ease: E_INOUT, duration: CARD_GROW_DUR,
        }, growAt);

        tl.to(labelRefs[i].current, { opacity: 1, ease: E_OUT, duration: LABEL_IN_DUR }, growAt + LABEL_IN_DELAY);
        tl.to(titleRefs[i].current, { opacity: 1, ease: E_OUT, duration: LABEL_IN_DUR }, growAt + LABEL_IN_DELAY);

        const typeStart = growAt + TYPE_START_DELAY;
        const typeDur = TYPE_DURS[i];
        typeText(i, typeStart, typeDur);

        const sectionsStart = typeStart + typeDur + POST_TYPE_PAUSE;
        tl.to(descPair(i), { opacity: 1, ease: E_OUT, duration: DESC_FADE_IN_DUR }, sectionsStart);
        const sectionsDuration = cycleSubSections(i, sectionsStart, SECTION_HOLD_DUR);

        if (i + 1 < CARDS.length) {
          tl.to(cardRefs[i + 1].current, {
            x: () => BR_X(), y: () => BR_Y(),
            width: () => SMALL_W(), height: () => SMALL_H(),
            borderRadius: () => SMALL_BR(),
            opacity: 1,
            ease: E_OUT, duration: NEXT_PREVIEW_DUR,
          }, sectionsStart + NEXT_PREVIEW_DELAY);
        }

        const holdEnd = sectionsStart + sectionsDuration + HOLD_AFTER_SECTIONS;

        if (i === CARDS.length - 1) {
          tl.to({}, { duration: FINAL_HOLD_DUR }, holdEnd);
          tl.to(descPair(i), { opacity: 0, ease: E_IN, duration: DESC_FADE_OUT_DUR }, holdEnd + FINAL_HOLD_DUR);
          tl.to({}, { duration: FINAL_PAUSE_DUR }, holdEnd + FINAL_HOLD_DUR);
          t = holdEnd + FINAL_HOLD_DUR + FINAL_PAUSE_DUR;
        } else {
          t = holdEnd;
        }
      });

      ScrollTrigger.addEventListener("refreshInit", applyInitialState);

      let lastW = vp.w;
      let lastH = vp.h;
      const handleResize = () => {
        syncViewportMetrics();
        if (vp.w === lastW && vp.h === lastH) return;
        lastW = vp.w;
        lastH = vp.h;
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);
      window.visualViewport?.addEventListener("resize", handleResize);

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", applyInitialState);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="cts-section"
      style={{ height: SECTION_HEIGHT }}
    >
      <div ref={stickyRef} className="cts-sticky">
        <h1 ref={headlineRef} className="cts-headline">
          What You Get.!
        </h1>

        {CARDS.map((card, i) => (
          <div
            key={card.num}
            ref={cardRefs[i]}
            className={`cts-card cts-card--${i + 1}`}
            style={{
              backgroundImage: `url(${CARD_IMAGES[i]})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="cts-card__topleft">
              <span className="cts-card__num">{card.num}</span>
              <div ref={labelRefs[i]} className="cts-card__label">
                {(card.title || "").split("\n").map((line, li) => (
                  <span key={li} className="cts-card__label-line">{line}</span>
                ))}
              </div>
            </div>
            <h2 ref={titleRefs[i]} className="cts-card__title">
              {(card.title || "").split("\n").map((line, li) => (
                <span
                  key={li}
                  ref={lineRefs[i][li]}
                  className="cts-card__title-line"
                >
                  {line}
                </span>
              ))}
            </h2>
          </div>
        ))}

        {CARDS.map((card, i) => {
          const leftItems = card.desc
            .map((s, si) => ({ s, si }))
            .filter(({ si }) => sideForIndex(si) === "left");
          const rightItems = card.desc
            .map((s, si) => ({ s, si }))
            .filter(({ si }) => sideForIndex(si) === "right");
          return (
            <div key={`desc-${card.num}`} className="cts-desc-group">
              <div ref={descLeftRefs[i]} className="cts-desc cts-desc--left">
                <div className="cts-desc__sections">
                  {leftItems.map(({ s, si }) => (
                    <div
                      key={si}
                      ref={setDescSectionRef(i, si)}
                      className="cts-desc__section cts-desc__section--left"
                    >
                      <h3 className="cts-desc__heading">{s.heading}</h3>
                      <p className="cts-desc__body">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div ref={descRightRefs[i]} className="cts-desc cts-desc--right">
                <div className="cts-desc__sections">
                  {rightItems.map(({ s, si }) => (
                    <div
                      key={si}
                      ref={setDescSectionRef(i, si)}
                      className="cts-desc__section cts-desc__section--right"
                    >
                      <h3 className="cts-desc__heading">{s.heading}</h3>
                      <p className="cts-desc__body">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}