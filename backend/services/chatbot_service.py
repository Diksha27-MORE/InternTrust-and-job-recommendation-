"""
backend/services/chatbot_service.py

Gemini-powered chatbot service for InternTrust.

This module is an EXPLANATION LAYER ONLY. It never re-scores,
re-evaluates, or overrides the risk analysis already produced by the
trained ML model in engine/risk_engine.py — it only turns that already
-final result into a short, friendly, plain-English explanation for the
student. app.py calls get_chatbot_answer() and nothing else from here.
"""

import os
import re
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# Load backend/.env directly so this module works even if it's ever
# imported before app.py's own load_dotenv() call runs.
BASE_DIR = Path(__file__).parent.parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# gemini-2.5-flash-lite: Google's low-latency "lite" tier — built for
# short, simple, high-volume requests exactly like this one, and GA
# (not preview) as of the current Gemini API lineup. Swap for
# "gemini-3.5-flash-lite" or "gemini-3.1-flash-lite" if you'd rather use
# a newer lite-tier model; both are drop-in replacements here. Avoid the
# full (non-lite) "flash" tiers for this endpoint — they're slower and
# costlier and buy you nothing for a 2-4 sentence explanation.
GEMINI_MODEL = "gemini-2.5-flash-lite"

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/"
    f"v1beta/models/{GEMINI_MODEL}:generateContent"
)

# Small on purpose: a 2-4 sentence answer doesn't need a big budget, and
# a smaller budget means a faster response. The retry only fires on the
# rare truncation case, so it doesn't cost the common case anything.
_PRIMARY_MAX_TOKENS = 350
_RETRY_MAX_TOKENS = 700

# Per-request timeout, as requested (10-15s). Two calls (primary + one
# retry) is the worst case, not the typical case.
_REQUEST_TIMEOUT_SECONDS = 12

# HTTP statuses Gemini uses for temporary, server-side problems (model
# overloaded, rate limited, etc.) rather than anything wrong with our
# request. These are worth one quick retry; "This model is currently
# experiencing high demand" (503 UNAVAILABLE) is the most common one.
_TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}
_TRANSIENT_RETRY_DELAY_SECONDS = 1.5

FALLBACK_MESSAGE = (
    "I'm having trouble responding right now. Please try again in a moment."
)

# Reused across calls (module-level) so repeated questions within the
# same analysis session don't pay a fresh TCP/TLS handshake every time.
_session = requests.Session()


# =========================================================
# ANSWER CLEANUP
# =========================================================

def _clean_chat_answer(text):
    """
    Strips markdown/list artifacts (headings, bullets, numbering,
    bold/italics) that would look out of place in a plain chat bubble,
    without touching the actual wording of the explanation.
    """

    cleaned = text.strip()

    cleaned = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*\d+[\.\)]\s+", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*[\-\*•]\s+", "", cleaned)
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"(?<!\w)\*(.*?)\*(?!\w)", r"\1", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    return cleaned.strip()


# =========================================================
# PROMPT
# =========================================================

def _build_prompt(question, analysis):

    raw_reasons = analysis.get("reasons", [])

    if isinstance(raw_reasons, list) and raw_reasons:
        reasons_text = "; ".join(str(reason) for reason in raw_reasons)
    elif raw_reasons:
        reasons_text = str(raw_reasons)
    else:
        reasons_text = "No specific reasons were listed."

    confidence = analysis.get("confidence", None)
    confidence_text = (
        f"{confidence}%" if confidence not in (None, "") else "N/A"
    )

    return f"""
You are the InternTrust Assistant — a friendly, knowledgeable friend
helping a student understand a job/internship risk-verification result.

THE STUDENT'S QUESTION IS YOUR PRIMARY INSTRUCTION.
Read "{question}" carefully and answer THAT specific question. The
InternTrust analysis below is factual context you're allowed to draw
from — it is NOT a fixed summary template to repeat every time. Two
different questions about the same analysis should produce two
noticeably different answers, not a copy-pasted restatement of the
score, level, and recommendation. Only bring in the score, level, or
recommendation when the question actually calls for it.

HOW TO HANDLE COMMON TYPES OF QUESTIONS:
- "Is it safe?" / "so there's no risk, right?" / similar reassurance-
  seeking questions: answer directly, and if the risk level below is
  Low, make clear that Low is not the same as zero risk — it means the
  checks didn't turn up the red flags the system looks for, not that
  there's a guarantee. Reflect the recommendation's own tone (e.g. if
  it says to stay alert, say so).
- "How was this figured out?" / "explain how" / "why is it
  [level] risk?": explain USING THE ACTUAL REASONS LISTED BELOW, if
  any are listed — don't just restate the score. If no reasons are
  listed (common for a Low-risk result), say plainly that the checks
  didn't turn up any of the specific red flags the system looks for,
  instead of naming specific checks that aren't listed below.
- "Why is it flagged red / high risk?" when the actual risk level
  below is NOT High: gently correct this — state what the actual risk
  level is instead of playing along with the wrong premise.
- "What should I do?" / "what's next?": lead with the recommendation,
  put in your own words rather than quoted verbatim.
- Anything else: use your judgment, but always answer what was
  actually asked first.

STRICT RULES (never break these, no matter what the student asks):
- The result below was already produced by InternTrust's ML system. Treat
  it as final. You must NEVER change it, recalculate it, second-guess it,
  or give your own separate verdict on whether the opportunity is safe.
- Only talk about the reasons that are literally listed below in
  "Reasons the system flagged." Refer to them specifically (what they
  actually say), never with vague filler like "hit several red flags",
  "several warning signs", "almost every major recruitment scam pattern",
  or "several major issues". If only one or two reasons are listed,
  only talk about those one or two — don't imply there were more. If
  none are listed, don't invent any.
- Do not invent facts, statistics, company details, specific checks the
  system ran, or reasons that are not listed below.
- Only say something like "so the recommendation is to not proceed" if
  the "Recommendation" field below actually says that. Never add stock
  closing lines such as "because of this" or "definitely not to proceed"
  unless that is genuinely what the recommendation says.
- If you do state the risk score, always state it exactly as given
  below, in full — every digit and decimal place. Never round it,
  shorten it, or cut it off (e.g. if it is 99.81, write "99.81/100",
  not "99" or "99.8").
- Never ask the student for passwords, OTPs, bank details, or any other
  sensitive personal information.
- Stay focused on this analysis and general recruitment-scam safety —
  don't wander into unrelated topics.

HOW TO TALK:
- Sound like a smart, friendly senior explaining this over chat — warm,
  direct, and human. Not like a formal report or an AI-generated summary.
- Write in flowing plain sentences only.
- NEVER use numbered lists, bullet points, headings, bold text, or any
  markdown symbols (no "1.", no "-", no "*", no "#").
- Weave any reasons you mention into natural sentences instead of
  listing them.
- Keep it SHORT: 2 to 4 sentences, no more (roughly 60-100 words). Say
  less, but finish every sentence you start — never cut off mid-word or
  mid-sentence.

InternTrust's analysis of this opportunity:
- Risk score: {analysis.get("risk_score", "N/A")}/100
- Risk level: {analysis.get("risk_level", "N/A")}
- Verdict: {analysis.get("prediction", "N/A")}
- Model confidence: {confidence_text}
- Reasons the system flagged: {reasons_text}
- Recommendation: {analysis.get("recommendation", "N/A")}

The student asked: "{question}"

Answer that question directly and specifically, using only the
information above, and make sure your reply ends on a complete sentence.
"""


# =========================================================
# LOCAL FALLBACK (used only when Gemini is unavailable)
# =========================================================

def _join_naturally(items):
    """'a' / 'a and b' / 'a, b, and c' — for weaving reasons into prose."""

    items = list(items)

    if len(items) == 1:
        return items[0]

    if len(items) == 2:
        return f"{items[0]} and {items[1]}"

    return ", ".join(items[:-1]) + f", and {items[-1]}"


def _classify_intent(question):
    """
    Lightweight keyword classification of what the student is actually
    asking, used only by the local (non-AI) fallback so it can still
    answer differently per question when Gemini is unavailable. This is
    intentionally simple — Gemini's own prompt (see _build_prompt) does
    the real intent understanding when it's reachable.
    """

    q = (question or "").lower()

    if any(p in q for p in (
        "what should i do", "what do i do", "next step", "what now",
        "should i proceed", "should i apply",
    )):
        return "next_steps"

    if any(p in q for p in (
        "flagged red", "flag red", "why is it high", "why high risk",
        "why red",
    )):
        return "red_flag_check"

    if any(p in q for p in (
        "how was", "how did", "explain how", "explain me how",
        "why is it low", "why low risk", "why is it medium",
        "why medium risk", "why is it high", "why high risk", "how come",
    )):
        return "how_and_why"

    if any(p in q for p in (
        "is it safe", "is this safe", "safe?",
    )):
        return "safety_check"

    if any(p in q for p in (
        "trustworthy", "can i trust", "should i trust", "trust it",
        "trust this",
    )):
        return "trust_check"

    if any(p in q for p in (
        "no risk", "not having risk", "not risky", "zero risk",
        "right?", "correct?", "no danger",
    )):
        return "risk_denial_check"

    return "general"


def _local_fallback_answer(question, analysis):
    """
    Deterministic, non-AI explanation built directly from the
    InternTrust analysis already on hand (risk_score, risk_level,
    prediction, reasons, recommendation). Used ONLY when Gemini is
    unavailable after a retry, so a Gemini outage never leaves the
    student with a dead-end "I'm having trouble" message.

    Answers are chosen by _classify_intent() so different questions
    about the same analysis get meaningfully different responses
    instead of one fixed template. Uses ONLY fields already present in
    `analysis` — never invents a reason, a specific check, or restates
    the score/level differently than InternTrust's own result.
    """

    score = analysis.get(
        "risk_score",
        analysis.get("final_risk_score")
    )

    level = analysis.get("risk_level")
    level_lower = (level or "").lower()
    prediction = analysis.get("prediction")
    recommendation = analysis.get("recommendation")

    raw_reasons = analysis.get("reasons", [])

    if isinstance(raw_reasons, list):
        reasons = [
            str(r).strip() for r in raw_reasons if str(r).strip()
        ]
    elif raw_reasons:
        reasons = [str(raw_reasons).strip()]
    else:
        reasons = []

    # Nothing in the analysis to explain from — no data to work with,
    # so there's nothing honest to say beyond the generic message.
    if score is None and not level and not reasons:
        return FALLBACK_MESSAGE

    # Lower-case the first letter of each reason (unless it's an
    # acronym) so it reads naturally in the middle of a sentence
    # instead of like a standalone list item.
    reason_phrases = [
        (r[0].lower() + r[1:]) if r and r[0].isupper() and not r.isupper() else r
        for r in reasons
    ]

    score_text = f"{score}/100" if score is not None else None
    intent = _classify_intent(question)

    # -----------------------------------------------------
    # "Why flagged red?" when it isn't actually High risk —
    # correct the premise first.
    # -----------------------------------------------------
    if intent == "red_flag_check" and level and level_lower != "high":
        parts = [
            f"This wasn't actually flagged red — InternTrust classified "
            f"it as {level} risk"
            + (f", with a score of {score_text}." if score_text else ".")
        ]
        if reasons:
            parts.append(
                f"The checks did note that {_join_naturally(reason_phrases)}."
            )
        elif level_lower == "low":
            parts.append(
                "The checks didn't turn up any of the specific red flags "
                "the system looks for."
            )
        if recommendation:
            parts.append(recommendation)
        return " ".join(parts)

    # -----------------------------------------------------
    # "Is it safe?" — direct answer + Low-risk ≠ zero-risk nuance.
    # -----------------------------------------------------
    if intent == "safety_check":
        if level_lower == "low":
            parts = [
                f"Based on the checks, this came back {level} risk"
                + (f" ({score_text})" if score_text else "")
                + ", which is a good sign, but Low doesn't mean zero risk —"
                " it just means the checks didn't turn up any of the red "
                "flags the system looks for."
            ]
        elif level:
            parts = [
                f"InternTrust classified this as {level} risk"
                + (f" ({score_text})" if score_text else "")
                + ", so it's not considered safe to treat as a sure thing."
            ]
            if reasons:
                parts.append(f"Specifically, {_join_naturally(reason_phrases)}.")
        else:
            parts = ["Here's what the analysis found:"]
        if recommendation:
            parts.append(recommendation)
        return " ".join(parts)

    # -----------------------------------------------------
    # "Should I trust it?" — distinct from "is it safe?": frames
    # around InternTrust's own verdict/recommendation rather than
    # the safe/not-safe framing.
    # -----------------------------------------------------
    if intent == "trust_check":
        if level_lower == "low":
            parts = [
                f"InternTrust's checks didn't find anything concerning here — "
                f"it came back {level} risk"
                + (f" ({score_text})" if score_text else "")
                + ", so there's reasonable grounds to trust it, though it's "
                "still worth doing your own basic checks before committing."
            ]
        elif level:
            parts = [
                f"Based on what InternTrust found, this isn't one to take on "
                f"trust — it's classified as {level} risk"
                + (f" ({score_text})" if score_text else "")
                + "."
            ]
            if reasons:
                parts.append(f"That's because {_join_naturally(reason_phrases)}.")
        else:
            parts = []
        if recommendation:
            parts.append(recommendation)
        return " ".join(parts) if parts else FALLBACK_MESSAGE

    # -----------------------------------------------------
    # "So there's no risk, right?" — same nuance, framed as a
    # gentle correction rather than a flat yes/no.
    # -----------------------------------------------------
    if intent == "risk_denial_check":
        if level_lower == "low":
            parts = [
                f"Not quite zero risk — the score here is {score_text or 'low'}, "
                f"which puts it in the {level} category, meaning the checks "
                "didn't find any red flags, but that's not the same as a "
                "guarantee."
            ]
        elif level:
            parts = [
                f"There is real risk here — InternTrust classified this as "
                f"{level} risk"
                + (f" ({score_text})" if score_text else "")
                + "."
            ]
            if reasons:
                parts.append(f"That's because {_join_naturally(reason_phrases)}.")
        else:
            parts = []
        if recommendation:
            parts.append(recommendation)
        return " ".join(parts) if parts else FALLBACK_MESSAGE

    # -----------------------------------------------------
    # "How/why" — explain using the actual reasons, or explain the
    # absence of reasons for a clean Low-risk result. Never invent
    # specific checks that aren't in the analysis.
    # -----------------------------------------------------
    if intent == "how_and_why":
        if reasons:
            parts = [
                f"It came back {level or 'this'} risk because the checks "
                f"found that {_join_naturally(reason_phrases)}."
            ]
            if score_text:
                parts.append(f"That combination is what produced the {score_text} score.")
        elif level_lower == "low":
            parts = [
                "The checks didn't turn up any of the specific red flags "
                "the system looks for in the listing, sender, or website"
                + (f", which is why it scored {score_text}." if score_text else ".")
            ]
        elif level:
            parts = [
                f"InternTrust classified it as {level} risk"
                + (f" with a score of {score_text}" if score_text else "")
                + ", though no individual reasons were listed for this result."
            ]
        else:
            parts = []
        if parts and recommendation:
            parts.append(recommendation)
        return " ".join(parts) if parts else FALLBACK_MESSAGE

    # -----------------------------------------------------
    # "What should I do next?" — lead with the recommendation.
    # -----------------------------------------------------
    if intent == "next_steps":
        parts = []
        if recommendation:
            parts.append(recommendation)
        elif prediction:
            parts.append(f"Overall, this opportunity is considered {prediction.lower()}.")
        if reasons:
            parts.append(f"That's based on the checks finding that {_join_naturally(reason_phrases)}.")
        return " ".join(parts) if parts else FALLBACK_MESSAGE

    # -----------------------------------------------------
    # General / unmatched question — the original concise summary.
    # -----------------------------------------------------
    sentences = []

    if reasons:
        sentences.append(
            f"This was flagged because the analysis found that "
            f"{_join_naturally(reason_phrases)}."
        )

    if score_text and level:
        sentences.append(
            f"That gave it a risk score of {score_text}, which puts it "
            f"in the {level} risk category."
        )
    elif level:
        sentences.append(f"That puts it in the {level} risk category.")

    if recommendation:
        sentences.append(f"The recommendation is: {recommendation}")
    elif prediction:
        sentences.append(f"Overall, this opportunity is considered {prediction.lower()}.")

    if not sentences:
        return FALLBACK_MESSAGE

    return " ".join(sentences)


# =========================================================
# GEMINI CALL
# =========================================================

def _call_gemini(prompt, max_output_tokens):

    return _session.post(

        GEMINI_URL,

        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },

        json={

            "contents": [
                {"parts": [{"text": prompt}]}
            ],

            "generationConfig": {

                # Slightly above the previous 0.3: still focused and
                # factual, but enough variation that the model doesn't
                # default to the exact same boilerplate phrasing for
                # every question asked about the same analysis.
                "temperature": 0.5,

                "maxOutputTokens": max_output_tokens,

                # Gemini 3.x-generation models can default to spending
                # most of the token budget on hidden reasoning before
                # writing any reply text. This is a short, simple
                # explanation task, so keep thinking minimal and leave
                # the budget for the actual answer. (Lite-tier models
                # mostly no-op this field, which is fine.)
                "thinkingConfig": {
                    "thinkingLevel": "low"
                },

            }
        },

        timeout=_REQUEST_TIMEOUT_SECONDS,
    )


def _call_gemini_with_transient_retry(prompt, max_output_tokens):
    """
    Calls Gemini, retrying once if Gemini itself reports a transient,
    server-side problem (503 "high demand"/overloaded, 429 rate
    limited, 500/502/504) — these are common, well-documented,
    temporary Gemini-side states, not something wrong with our request
    or API key, so a single short-delay retry is enough to ride most
    of them out. A network-level exception (timeout, DNS, connection
    refused) is NOT retried here — it propagates to the caller, since
    that usually means the network itself is unreachable, and retrying
    it instantly rarely helps.
    """

    response = _call_gemini(prompt, max_output_tokens)

    if response.status_code in _TRANSIENT_STATUS_CODES:
        print(
            f"⚠️ Chatbot: Gemini returned HTTP {response.status_code} "
            "(transient) — retrying once."
        )
        time.sleep(_TRANSIENT_RETRY_DELAY_SECONDS)
        response = _call_gemini(prompt, max_output_tokens)

    return response


def _extract_answer(payload):
    """
    Robust extraction: never assumes a field is present. Always returns
    (text, finish_reason) — text is "" on anything missing/odd, so a
    malformed or empty Gemini response can never crash the request.
    """

    try:

        candidates = payload.get("candidates") or []

        if not candidates:
            block_reason = (
                payload.get("promptFeedback", {}) or {}
            ).get("blockReason", "")
            return "", (block_reason or "no_candidates")

        candidate = candidates[0] or {}

        parts = (
            (candidate.get("content") or {}).get("parts") or []
        )

        text = "".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict)
        ).strip()

        finish_reason = candidate.get("finishReason", "")

        return text, finish_reason

    except (AttributeError, TypeError, IndexError):

        return "", "malformed_response"


# =========================================================
# PUBLIC ENTRY POINT
# =========================================================

def get_chatbot_answer(question, analysis):
    """
    Returns a short, student-friendly explanation string.

    Never raises and never leaks the API key, Gemini's raw error body,
    or any other technical detail to the caller.

    - If Gemini succeeds -> returns Gemini's explanation.
    - If Gemini returns a transient error (503/429/etc.) -> retries once.
    - If Gemini is still unavailable after that -> falls back to a
      deterministic explanation built directly from the InternTrust
      analysis data already on hand (see _local_fallback_answer), so a
      Gemini outage never dead-ends the student. FALLBACK_MESSAGE is
      only used if there's truly no analysis data to explain from.
    """

    if not GEMINI_API_KEY:
        # Server misconfiguration — log for the developer only, never
        # surface this (or the fact that a key is missing) to the client.
        print("❌ Chatbot: GEMINI_API_KEY is not configured.")
        return _local_fallback_answer(question, analysis)

    prompt = _build_prompt(question, analysis)

    try:
        response = _call_gemini_with_transient_retry(
            prompt, _PRIMARY_MAX_TOKENS
        )

    except requests.exceptions.RequestException as exc:
        print(f"❌ Chatbot: Gemini request failed ({type(exc).__name__}).")
        return _local_fallback_answer(question, analysis)

    if not response.ok:
        # Log status only — never echo Gemini's raw error body (which
        # can include quota/billing/internal details) back to the client.
        print(f"❌ Chatbot: Gemini returned HTTP {response.status_code}.")
        return _local_fallback_answer(question, analysis)

    try:
        data = response.json()

    except ValueError:
        print("❌ Chatbot: Gemini response was not valid JSON.")
        return _local_fallback_answer(question, analysis)

    answer, finish_reason = _extract_answer(data)

    # Only retry the one case worth retrying here: the model ran out of
    # its token budget mid-answer. (Transient 503/429-style errors are
    # already handled by _call_gemini_with_transient_retry above.)
    if finish_reason == "MAX_TOKENS":

        try:
            retry_response = _call_gemini(prompt, _RETRY_MAX_TOKENS)

            if retry_response.ok:
                answer, finish_reason = _extract_answer(
                    retry_response.json()
                )

        except requests.exceptions.RequestException as exc:
            print(f"❌ Chatbot: Gemini retry failed ({type(exc).__name__}).")

        except ValueError:
            print("❌ Chatbot: Gemini retry response was not valid JSON.")

    if not answer:
        print(
            "❌ Chatbot: empty/unusable answer from Gemini "
            f"(finishReason={finish_reason!r}) — using local fallback."
        )
        return _local_fallback_answer(question, analysis)

    return _clean_chat_answer(answer)