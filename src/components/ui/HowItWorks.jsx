import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./HowItWorks.css";

import submitImg from "../../assets/submit.png";
import analyzeImg from "../../assets/analyze.png";
import verifiedImg from "../../assets/verified.png";
import safetyImg from "../../assets/safety.png";

gsap.registerPlugin(ScrollTrigger);

/**
 * Drop your 4 images at these exact paths inside /public/images/
 * (create the folder if it doesn't exist yet):
 *
 *   /public/images/submit.png
 *   /public/images/analyze.png
 *   /public/images/verified.png
 *   /public/images/safety.png
 *
 * If your images already live in /src/assets instead, replace the
 * string paths below with `import` statements at the top of this
 * file and reference those imports in the `image` fields instead.
 */
const steps = [
  {
    id: 1,
    title: "Submit",
    description:
      "Paste the internship or job listing you want to verify. Our system takes the information and prepares it for a detailed check.",
    image: submitImg,
  },
  {
    id: 2,
    title: "Analyze",
    description:
      "Our system checks multiple risk signals, suspicious patterns, company information and other indicators of potentially fraudulent internships.",
    image: analyzeImg,
  },
  {
    id: 3,
    title: "Verify",
    description:
      "We compare the internship details against available company information and identify inconsistencies, missing information and red flags.",
    image: verifiedImg,
  },
  {
    id: 4,
    title: "Get Your Result",
    description:
      "Receive a clear result that helps you understand whether the internship looks trustworthy, suspicious or requires further investigation.",
    image: safetyImg,
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);

  const [activeCard, setActiveCard] = useState(null);

  useEffect(() => {
    const section = sectionRef.current;
    const eyebrow = eyebrowRef.current;
    const heading = headingRef.current;

    if (!section || !eyebrow || !heading) return;

    const ctx = gsap.context(() => {
      // Grey -> purple scroll-fill, applied to BOTH lines together
      gsap.fromTo(
        [eyebrow, heading],
        { backgroundSize: "0% 100%" },
        {
          backgroundSize: "100% 100%",
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "top 25%",
            scrub: true,
          },
        }
      );

      // Simple entrance for the cards
      gsap.fromTo(
        ".how-card",
        { opacity: 0, y: 70 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".how-cards",
            start: "top 85%",
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleCardInteract = (index) => {
    setActiveCard(index);
  };

  const handleCardLeave = () => {
    setActiveCard(null);
  };

  const handleCardClick = (index) => {
    // Primary control for touch devices (mobile has no hover).
    // On desktop this also lets a user "pin" a card by clicking it.
    setActiveCard((current) => (current === index ? null : index));
  };

  // NEW: tracks pointer position for the spotlight/shine effect.
  // Skips entirely on touch devices since there's no real "hover" pointer.
  const handleCardMouseMove = (e) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    card.style.setProperty("--x", `${x}%`);
    card.style.setProperty("--y", `${y}%`);
  };

  return (
    <section className="how-section" ref={sectionRef}>
      <div className="how-container">
        {/* HEADING */}
        <div className="how-heading-wrap">
          <span className="how-eyebrow" ref={eyebrowRef}>
            HOW IT WORKS
          </span>

          <h2 className="how-heading" ref={headingRef}>
            Stay one step ahead of scams.
          </h2>
        </div>

        {/* CARDS */}
        <div className="how-cards">
          {steps.map((step, index) => {
            const isActive = activeCard === index;

            return (
              <article
                key={step.id}
                className={`how-card ${isActive ? "is-active" : ""}`}
                onMouseEnter={() => handleCardInteract(index)}
                onMouseLeave={handleCardLeave}
                onMouseMove={handleCardMouseMove}
                onClick={() => handleCardClick(index)}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className="how-card-image"
                />

                <div className="how-card-overlay" />

                <div className="how-card-shine" />

                <div className="how-card-content">
                  <span className="how-card-pill">{step.title}</span>

                  <h3>{step.title}</h3>

                  <p>{step.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}