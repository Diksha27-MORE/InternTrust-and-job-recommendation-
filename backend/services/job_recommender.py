# services/job_recommender.py

import re
import html

import requests


REMOTIVE_URL = "https://remotive.com/api/remote-jobs"

REQUEST_TIMEOUT = 15


# =========================================================
# GENERIC / STOP WORDS
# These must never be treated as a skill or a role token.
# =========================================================

STOP_WORDS = {
    "and", "the", "to", "of", "a", "an", "in", "on", "for",
    "with", "or", "at", "by", "as", "is", "are", "be", "been",
    "from", "that", "this", "it", "you", "your", "we", "our",
    "us", "will", "can", "may", "must", "should", "has", "have",
    "had", "do", "does", "did", "not", "but", "if", "so", "than",
    "then", "them", "they", "he", "she", "his", "her", "their",
    "about", "into", "over", "under", "more", "most", "other",
    "such", "some", "any", "all", "each", "per", "via", "etc",
    "job", "jobs", "role", "roles", "work", "working", "team",
    "teams", "company", "companies", "experience", "years",
    "year", "new", "good", "great", "strong", "ability", "skills",
    "skill", "knowledge", "required", "requirements", "plus",
    "remote", "full", "time", "part", "time", "position",
}


# =========================================================
# SKILL ALIASES
# Used so "ML" in a posting still matches "Machine Learning".
# =========================================================

SKILL_ALIASES = {
    "machine learning": ["machine learning", "ml", "machine-learning"],
    "deep learning": ["deep learning", "dl", "neural networks"],
    "artificial intelligence": ["artificial intelligence", "ai"],
    "natural language processing": ["natural language processing", "nlp"],
    "computer vision": ["computer vision", "cv", "opencv"],
    "data science": ["data science", "data scientist"],
    "data analysis": ["data analysis", "data analyst", "data analytics"],
    "data visualization": [
        "data visualization",
        "data visualisation",
        "dataviz",
        "tableau",
        "power bi",
        "matplotlib",
    ],
    "statistics": ["statistics", "statistical", "stats"],
    "javascript": ["javascript", "js", "es6"],
    "typescript": ["typescript", "ts"],
    "react": ["react", "react.js", "reactjs"],
    "node.js": ["node.js", "nodejs", "node"],
    "next.js": ["next.js", "nextjs"],
    "express.js": ["express.js", "expressjs", "express"],
    "python": ["python"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite"],
    "nosql": ["nosql", "mongodb", "dynamodb"],
    "scikit-learn": ["scikit-learn", "scikit learn", "sklearn"],
    "tensorflow": ["tensorflow", "tf", "keras"],
    "pytorch": ["pytorch", "torch"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "power bi": ["power bi", "powerbi"],
    "aws": ["aws", "amazon web services"],
    "gcp": ["gcp", "google cloud"],
    "azure": ["azure", "microsoft azure"],
    "ci/cd": ["ci/cd", "cicd", "continuous integration"],
    "rest api": ["rest api", "restful", "rest apis", "api"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "c sharp", "csharp", ".net"],
}


# =========================================================
# LOCATION SUPPORT
#
# ROOT CAUSE OF THE "0 RESULTS" BUG:
# Remotive almost never tags a posting's candidate_required_location
# with an actual city ("Mumbai") or even just "India" — most remote
# roles are tagged "Worldwide", and many ship that field blank.
# Requiring the city/state/India to literally appear in that field
# (the previous approach) discarded nearly every real result.
#
# FIX: the selected city is now built directly into the Remotive
# SEARCH QUERY ("<role> <city> India"), so the job source itself
# does the city-aware matching. The location field is only used
# afterward as a light guard to drop postings explicitly locked to
# a single OTHER country (USA-only, UK-only, Europe-only, etc.).
# Worldwide / blank / India-tagged results are kept, since rejecting
# those again reproduces the zero-result bug on real Remotive data.
# =========================================================

# Values the user can pick that mean "do not restrict by city".
GLOBAL_LOCATION_CHOICES = {
    "",
    "worldwide",
    "anywhere",
    "global",
    "remote",
    "any",
}

# City -> its state, for a richer search query and a wider net
# when checking the returned location field.
CITY_REGION_HINTS = {
    "mumbai": "maharashtra",
    "pune": "maharashtra",
    "bengaluru": "karnataka",
    "bangalore": "karnataka",
    "delhi": "delhi ncr",
    "new delhi": "delhi ncr",
    "hyderabad": "telangana",
    "chennai": "tamil nadu",
    "ahmedabad": "gujarat",
    "kolkata": "west bengal",
}

# A posting explicitly locked to one of these single countries is
# not a valid result for an Indian city, regardless of the search
# query that surfaced it.
NEGATIVE_LOCATION_TOKENS = (
    "usa only",
    "us only",
    "u.s. only",
    "united states only",
    "us citizens only",
    "uk only",
    "united kingdom only",
    "canada only",
    "europe only",
    "eu only",
    "emea only",
    "australia only",
    "nz only",
    "latam only",
    "apac only excluding india",
)


def is_global_location_choice(location):
    """True when the user asked for worldwide / remote results."""

    return str(location or "").strip().lower() in GLOBAL_LOCATION_CHOICES


def location_search_terms(location):
    """'Mumbai' -> ['Mumbai', 'Maharashtra'] for the search query."""

    city = str(location or "").strip()

    if not city:
        return []

    terms = [city]

    state = CITY_REGION_HINTS.get(city.lower())

    if state and state.lower() not in [t.lower() for t in terms]:
        terms.append(state.title())

    return terms


def job_allowed_for_location(job_result, location):
    """
    Light guard, run AFTER the city-aware search query already did
    the real work. Only rejects postings explicitly locked to a
    single other country. Worldwide / blank / India-tagged results
    pass, because the search query is what targeted this city.
    """

    if is_global_location_choice(location):
        return True

    job_location = normalize_text(job_result.get("location", ""))

    if not job_location:
        return True

    if any(token in job_location for token in NEGATIVE_LOCATION_TOKENS):
        return False

    return True


# =========================================================
# TEXT HELPERS
# =========================================================

def strip_html(text):
    """Remotive returns HTML in `description`. Flatten it."""

    if not text:
        return ""

    text = str(text)

    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.S | re.I)

    text = re.sub(r"<[^>]+>", " ", text)

    text = html.unescape(text)

    return text


def normalize_text(text):

    if not text:
        return ""

    text = strip_html(text).lower()

    text = text.replace("&", " and ")

    text = re.sub(r"[^a-z0-9+#./\- ]", " ", text)

    text = re.sub(r"\s+", " ", text)

    return text.strip()


def meaningful_words(text):
    """Split into content words. Drops stop words like and/the/to/of."""

    return [
        word
        for word in normalize_text(text).split()
        if len(word) > 2 and word not in STOP_WORDS
    ]


def clean_skill_list(skills):
    """Accepts a list or a comma string. Always returns a clean list."""

    if isinstance(skills, str):
        skills = skills.split(",")

    if not isinstance(skills, list):
        return []

    cleaned = []
    seen = set()

    for skill in skills:

        label = str(skill).strip()

        if not label:
            continue

        key = normalize_text(label)

        if not key or key in STOP_WORDS:
            continue

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(label)

    return cleaned


# =========================================================
# SKILL MATCHING
# =========================================================

def skill_variants(skill):

    key = normalize_text(skill)

    if not key:
        return []

    variants = SKILL_ALIASES.get(key)

    if variants:
        return [normalize_text(v) for v in variants if normalize_text(v)]

    return [key]


def skill_matches(skill, job_text):
    """Word-boundary aware match so 'c' never matches 'cloud'."""

    job_text = normalize_text(job_text)

    for variant in skill_variants(skill):

        pattern = (
            r"(?<![a-z0-9])"
            + re.escape(variant)
            + r"(?![a-z0-9])"
        )

        if re.search(pattern, job_text):
            return True

    return False


# =========================================================
# CALCULATE JOB MATCH  (fully dynamic, never fixed)
# =========================================================

def calculate_match(target_role, user_skills, job):

    role_norm = normalize_text(target_role)

    title = normalize_text(job.get("title", ""))

    description = normalize_text(job.get("description", ""))

    requirements = normalize_text(job.get("requirements", ""))

    category = normalize_text(job.get("category", ""))

    tags = normalize_text(" ".join(job.get("tags", []) or []))

    job_text = " ".join([title, category, tags, description, requirements])

    # -----------------------------------------------------
    # ROLE MATCH  (max 40)
    # -----------------------------------------------------

    role_score = 0

    role_words = meaningful_words(role_norm)

    if role_words:

        if role_norm and role_norm in title:
            role_score = 40

        elif all(word in title for word in role_words):
            role_score = 35

        else:

            hits_in_title = sum(1 for word in role_words if word in title)

            hits_in_text = sum(1 for word in role_words if word in job_text)

            if hits_in_title:
                role_score = round(
                    15 + (hits_in_title / len(role_words)) * 15
                )

            elif hits_in_text:
                role_score = round(
                    (hits_in_text / len(role_words)) * 14
                )

    # -----------------------------------------------------
    # SKILL MATCH  (max 45)
    # -----------------------------------------------------

    matched_skills = []

    for skill in user_skills:

        if skill_matches(skill, job_text):
            matched_skills.append(skill)

    if user_skills:
        skill_score = (len(matched_skills) / len(user_skills)) * 45
    else:
        skill_score = 0

    # -----------------------------------------------------
    # LOCATION MATCH  (max 15)
    # -----------------------------------------------------

    requested_location = normalize_text(job.get("_requested_location", ""))

    job_location = normalize_text(job.get("candidate_required_location", ""))

    open_to_anywhere = any(
        token in job_location
        for token in ("worldwide", "anywhere", "global")
    )

    if not requested_location:
        location_score = 8

    elif requested_location and requested_location in job_location:
        location_score = 15

    elif open_to_anywhere:
        location_score = 11

    elif not job_location:
        location_score = 8

    else:
        location_score = 3

    # -----------------------------------------------------
    # FINAL
    # -----------------------------------------------------

    final_score = round(min(role_score + skill_score + location_score, 100))

    return final_score, matched_skills


# =========================================================
# REMOTIVE FETCH  (progressive fallback queries)
# =========================================================

def fetch_remotive(search_term, limit=50):

    params = {"limit": limit}

    if search_term:
        params["search"] = search_term

    try:

        response = requests.get(
            REMOTIVE_URL,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )

        response.raise_for_status()

        payload = response.json()

        return payload.get("jobs", []) or []

    except Exception as exc:

        print("Remotive API error for query", repr(search_term), ":", exc)

        return []


def build_queries(target_role, user_skills, location=""):
    """
    ROOT FIX (role/skill query, unchanged): the old code sent
    'Data Scientist Python SQL Pandas' as one search string, which
    Remotive matched too strictly and returned nothing. We widen
    the search step by step.

    LOCATION FIX: when a specific city is selected, the very first
    query searched is "<role> <city> India" — the city and country
    are part of the actual search, not a filter applied afterward.
    State-name and India-only variants follow so real, relevant
    postings aren't missed just because the city itself isn't in
    the job's title or description.
    """

    queries = []

    role = target_role.strip()

    city_selected = location and not is_global_location_choice(location)

    if role and city_selected:

        search_terms = location_search_terms(location)

        for term in search_terms:
            queries.append(f"{role} {term} India")

        for term in search_terms:
            queries.append(f"{role} {term}")

        queries.append(f"{role} India")

    if role:
        queries.append(role)

    role_words = meaningful_words(role)

    if len(role_words) > 1:
        queries.append(" ".join(role_words[:2]))

    if role_words:
        queries.append(role_words[-1])

    for skill in user_skills[:2]:
        if skill.strip():
            queries.append(skill.strip())

    unique = []

    for query in queries:
        if query and query.lower() not in [q.lower() for q in unique]:
            unique.append(query)

    return unique


def collect_jobs(target_role, user_skills, minimum=12, location=""):

    collected = []

    seen_urls = set()

    for query in build_queries(target_role, user_skills, location):

        for job in fetch_remotive(query):

            url = str(job.get("url", "")).strip()

            if not url or url in seen_urls:
                continue

            seen_urls.add(url)
            collected.append(job)

        if len(collected) >= minimum:
            break

    return collected


# =========================================================
# MAIN JOB RECOMMENDER
# =========================================================

def get_safe_jobs(user_input, top_n=5):

    user_input = user_input or {}

    target_role = str(user_input.get("target_role", "") or "").strip()

    user_skills = clean_skill_list(user_input.get("skills", []))

    location = str(user_input.get("location", "") or "").strip()

    if not target_role:
        return []

    jobs_data = collect_jobs(
        target_role,
        user_skills,
        minimum=40 if not is_global_location_choice(location) else 12,
        location=location,
    )

    if not jobs_data:
        return []

    results = []

    for job in jobs_data:

        title = str(job.get("title", "") or "").strip()

        company = str(job.get("company_name", "") or "").strip()

        link = str(job.get("url", "") or "").strip()

        candidate_location = str(
            job.get("candidate_required_location", "") or ""
        ).strip()

        if not title or not link:
            continue

        job["_requested_location"] = location

        job["description"] = strip_html(job.get("description", ""))

        job["requirements"] = " ".join(
            [
                str(job.get("job_type", "") or ""),
                str(job.get("category", "") or ""),
                " ".join(job.get("tags", []) or []),
            ]
        )

        match_score, matched_skills = calculate_match(
            target_role,
            user_skills,
            job,
        )

        results.append(
            {
                "title": title,
                "company": company or "Company",
                "display_title": (
                    f"{title} at {company}" if company else title
                ),
                "location": candidate_location or "Remote",
                "type": str(
                    job.get("job_type", "") or "Remote"
                ).replace("_", " ").title(),
                "category": job.get("category", ""),
                "match": match_score,
                "matched_skills": matched_skills,
                "published": job.get("publication_date", ""),
                # REAL url from the job source — never generated
                "link": link,
                # Only used for city-name checking, stripped below
                "_match_text": " ".join(
                    [title, job["description"], job["requirements"]]
                ),
            }
        )

    # -----------------------------------------------------
    # LOCATION FILTER  (added)
    # Keeps only postings the selected city can actually
    # take. Returns [] when there are none, so the UI can
    # say "No jobs found for this location."
    # -----------------------------------------------------

    if not is_global_location_choice(location):

        results = [
            item
            for item in results
            if job_allowed_for_location(item, location)
        ]

    for item in results:
        item.pop("_match_text", None)

    results.sort(
        key=lambda item: (item["match"], len(item["matched_skills"])),
        reverse=True,
    )

    return results[:top_n]