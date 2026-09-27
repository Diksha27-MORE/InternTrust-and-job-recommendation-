# services/skill_analyzer.py

import re
from pathlib import Path
from collections import Counter

import pandas as pd


# =========================================================
# DATASET PATH
# =========================================================

CSV_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "Fake_Real_Job_Posting.csv"
)


# =========================================================
# STOP WORDS
# A skill gap must NEVER contain words like and/the/to/of.
# Every candidate skill is filtered through this set and
# through the KNOWN_SKILLS whitelist below.
# =========================================================

STOP_WORDS = {
    "and", "the", "to", "of", "a", "an", "in", "on", "for", "with",
    "or", "at", "by", "as", "is", "are", "be", "been", "being",
    "from", "that", "this", "it", "its", "you", "your", "we", "our",
    "us", "will", "can", "may", "must", "should", "would", "could",
    "has", "have", "had", "do", "does", "did", "not", "but", "if",
    "so", "than", "then", "them", "they", "he", "she", "his", "her",
    "their", "about", "into", "over", "under", "more", "most",
    "other", "such", "some", "any", "all", "each", "per", "via",
    "etc", "job", "jobs", "role", "roles", "work", "working",
    "team", "teams", "company", "companies", "experience", "years",
    "year", "new", "good", "great", "strong", "ability", "skills",
    "skill", "knowledge", "required", "requirements", "preferred",
    "plus", "remote", "position", "candidate", "candidates",
    "responsibilities", "including", "well", "also", "who", "what",
    "when", "where", "how", "why",
}


# =========================================================
# KNOWN TECHNICAL SKILLS  (whitelist)
# =========================================================

KNOWN_SKILLS = [

    # Programming
    "Python",
    "Java",
    "C++",
    "C#",
    "JavaScript",
    "TypeScript",
    "PHP",
    "Ruby",
    "Go",
    "Kotlin",
    "Swift",
    "R",

    # Web Development
    "HTML",
    "CSS",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Express.js",
    "Next.js",
    "Django",
    "Flask",
    "FastAPI",

    # Data Science
    "Data Science",
    "Data Analysis",
    "Data Analytics",
    "Machine Learning",
    "Deep Learning",
    "Artificial Intelligence",
    "Natural Language Processing",
    "Computer Vision",
    "Statistics",
    "Probability",
    "A/B Testing",
    "Feature Engineering",

    # Python / Data libraries
    "Pandas",
    "NumPy",
    "Scikit-learn",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "Matplotlib",
    "Seaborn",
    "OpenCV",

    # Databases
    "SQL",
    "MySQL",
    "PostgreSQL",
    "MongoDB",
    "Oracle",
    "SQLite",
    "Redis",

    # BI / Visualization
    "Power BI",
    "Tableau",
    "Excel",
    "Data Visualization",

    # Cloud
    "AWS",
    "Azure",
    "Google Cloud",

    # DevOps
    "Docker",
    "Kubernetes",
    "Git",
    "GitHub",
    "Jenkins",
    "CI/CD",

    # Big Data
    "Hadoop",
    "Spark",
    "Kafka",
    "Airflow",

    # Other
    "REST API",
    "GraphQL",
    "Linux",
    "Figma",
    "Firebase",
    "Data Structures",
    "Algorithms",
]


# =========================================================
# SKILL ALIASES
# =========================================================

SKILL_ALIASES = {
    "machine learning": ["machine learning", "ml", "machine-learning"],
    "deep learning": ["deep learning", "neural networks"],
    "artificial intelligence": ["artificial intelligence", "ai"],
    "natural language processing": ["natural language processing", "nlp"],
    "computer vision": ["computer vision", "opencv"],
    "data science": ["data science", "data scientist"],
    "data analysis": ["data analysis", "data analyst"],
    "data analytics": ["data analytics", "analytics"],
    "data visualization": [
        "data visualization",
        "data visualisation",
        "dataviz",
        "visualization",
    ],
    "statistics": ["statistics", "statistical", "stats", "statistical analysis"],
    "javascript": ["javascript", "js", "es6"],
    "typescript": ["typescript", "ts"],
    "react": ["react", "react.js", "reactjs"],
    "angular": ["angular", "angular.js", "angularjs"],
    "vue": ["vue", "vue.js", "vuejs"],
    "node.js": ["node.js", "nodejs", "node"],
    "next.js": ["next.js", "nextjs"],
    "express.js": ["express.js", "expressjs", "express"],
    "scikit-learn": ["scikit-learn", "scikit learn", "sklearn"],
    "tensorflow": ["tensorflow", "tf"],
    "pytorch": ["pytorch", "torch"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite", "t-sql"],
    "mongodb": ["mongodb", "mongo"],
    "power bi": ["power bi", "powerbi"],
    "aws": ["aws", "amazon web services"],
    "google cloud": ["google cloud", "gcp"],
    "azure": ["azure", "microsoft azure"],
    "ci/cd": ["ci/cd", "cicd", "continuous integration"],
    "rest api": ["rest api", "rest apis", "restful", "rest"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "c sharp", "csharp", ".net"],
    "github": ["github", "git hub"],
    "data structures": ["data structures", "dsa"],
    "algorithms": ["algorithms", "algorithm", "dsa"],
}


# =========================================================
# ROLE KEYWORDS
# Ordered most-important-first.
# =========================================================

ROLE_KEYWORDS = {

    "data scientist": [
        "Python",
        "SQL",
        "Statistics",
        "Pandas",
        "NumPy",
        "Machine Learning",
        "Scikit-learn",
        "TensorFlow",
        "Data Visualization",
        "Deep Learning",
        "PyTorch",
        "Data Analysis",
    ],

    "data analyst": [
        "SQL",
        "Excel",
        "Python",
        "Statistics",
        "Data Visualization",
        "Power BI",
        "Tableau",
        "Pandas",
        "Data Analysis",
    ],

    "data engineer": [
        "Python",
        "SQL",
        "Spark",
        "Airflow",
        "Hadoop",
        "Kafka",
        "AWS",
        "Docker",
        "PostgreSQL",
    ],

    "machine learning engineer": [
        "Python",
        "Machine Learning",
        "Deep Learning",
        "Scikit-learn",
        "TensorFlow",
        "PyTorch",
        "SQL",
        "Docker",
        "Git",
        "AWS",
    ],

    "ai engineer": [
        "Python",
        "Machine Learning",
        "Deep Learning",
        "TensorFlow",
        "PyTorch",
        "Natural Language Processing",
        "Computer Vision",
        "Docker",
    ],

    "frontend developer": [
        "HTML",
        "CSS",
        "JavaScript",
        "React",
        "TypeScript",
        "Git",
        "REST API",
        "Figma",
    ],

    "backend developer": [
        "Python",
        "Node.js",
        "SQL",
        "REST API",
        "Django",
        "MongoDB",
        "Docker",
        "Git",
    ],

    "full stack developer": [
        "HTML",
        "CSS",
        "JavaScript",
        "React",
        "Node.js",
        "SQL",
        "MongoDB",
        "REST API",
        "Git",
    ],

    "software engineer": [
        "Data Structures",
        "Algorithms",
        "Python",
        "Java",
        "SQL",
        "Git",
        "REST API",
        "Linux",
    ],

    "android developer": [
        "Kotlin",
        "Java",
        "REST API",
        "Firebase",
        "Git",
        "SQLite",
    ],

    "devops engineer": [
        "Linux",
        "Docker",
        "Kubernetes",
        "CI/CD",
        "AWS",
        "Jenkins",
        "Git",
        "Python",
    ],

    "business analyst": [
        "Excel",
        "SQL",
        "Data Analysis",
        "Power BI",
        "Tableau",
        "Statistics",
    ],
}


# Generic baseline used only when a role is unknown
# and the dataset is unavailable.
GENERIC_SKILLS = [
    "Git",
    "SQL",
    "Python",
    "REST API",
    "Linux",
    "Docker",
]


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize_text(text):

    if not text:
        return ""

    text = str(text).lower()

    text = text.replace("&", " and ")

    text = re.sub(r"[^a-z0-9+#./\- ]", " ", text)

    text = re.sub(r"\s+", " ", text)

    return text.strip()


def stem(word):
    """Very small stemmer: 'scientist' / 'science' -> 'scien'."""

    return word[:5]


def role_tokens(text):

    return [
        word
        for word in normalize_text(text).split()
        if len(word) > 2 and word not in STOP_WORDS
    ]


def is_meaningful_skill(label):
    """Blocks stop words and junk tokens from ever being a skill."""

    key = normalize_text(label)

    if not key:
        return False

    if key in STOP_WORDS:
        return False

    words = key.split()

    if all(word in STOP_WORDS for word in words):
        return False

    if len(key) < 2 and key not in {"r", "c"}:
        return False

    return True


def variants_of(skill):

    key = normalize_text(skill)

    if not key:
        return []

    aliases = SKILL_ALIASES.get(key)

    if aliases:
        return [normalize_text(alias) for alias in aliases if alias]

    return [key]


def phrase_in_text(phrase, text):

    if not phrase or not text:
        return False

    pattern = r"(?<![a-z0-9])" + re.escape(phrase) + r"(?![a-z0-9])"

    return re.search(pattern, text) is not None


def skill_in_text(skill, text):

    text = normalize_text(text)

    return any(
        phrase_in_text(variant, text)
        for variant in variants_of(skill)
    )


# =========================================================
# CLEAN USER SKILLS
# =========================================================

def clean_user_skills(user_skills):

    if isinstance(user_skills, str):
        user_skills = user_skills.split(",")

    if not isinstance(user_skills, list):
        return []

    cleaned = []
    seen = set()

    for skill in user_skills:

        label = str(skill).strip()

        if not label or not is_meaningful_skill(label):
            continue

        key = normalize_text(label)

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(label)

    return cleaned


# =========================================================
# ROLE -> SKILLS
# =========================================================

def get_role_skills(target_role):

    role = normalize_text(target_role)

    if not role:
        return []

    if role in ROLE_KEYWORDS:
        return list(ROLE_KEYWORDS[role])

    tokens = set(stem(word) for word in role_tokens(role))

    if not tokens:
        return []

    best_key = None
    best_score = 0

    for known_role, skills in ROLE_KEYWORDS.items():

        known_tokens = set(stem(word) for word in role_tokens(known_role))

        if not known_tokens:
            continue

        overlap = len(tokens & known_tokens)

        if not overlap:
            continue

        score = overlap / len(known_tokens)

        if score > best_score:
            best_score = score
            best_key = known_role

    if best_key and best_score >= 0.5:
        return list(ROLE_KEYWORDS[best_key])

    return []


def is_role_name_skill(skill, target_role):
    """
    Drops 'Data Science' from the gap for a 'Data Scientist'
    target — that is the role itself, not a missing skill.
    """

    skill_tokens = set(stem(word) for word in role_tokens(skill))

    role_token_set = set(stem(word) for word in role_tokens(target_role))

    if not skill_tokens:
        return True

    return skill_tokens.issubset(role_token_set)


# =========================================================
# EXTRACT SKILLS FROM TEXT
# =========================================================

def extract_skills_from_text(text):

    text = normalize_text(text)

    if not text:
        return []

    found = []

    for skill in KNOWN_SKILLS:

        if skill_in_text(skill, text):
            found.append(skill)

    return found


# =========================================================
# DATASET (loaded once, then cached)
# =========================================================

_DATASET_CACHE = {"loaded": False, "df": None}

_ROLE_SKILL_CACHE = {}


def load_dataset():

    if _DATASET_CACHE["loaded"]:
        return _DATASET_CACHE["df"]

    _DATASET_CACHE["loaded"] = True

    try:

        _DATASET_CACHE["df"] = pd.read_csv(
            CSV_PATH,
            on_bad_lines="skip",
            engine="python",
        )

    except Exception as exc:

        print("Skill dataset unavailable:", exc)

        _DATASET_CACHE["df"] = None

    return _DATASET_CACHE["df"]


def find_column(df, candidates):

    lookup = {
        normalize_text(str(column)).replace(" ", "_"): column
        for column in df.columns
    }

    for candidate in candidates:

        key = normalize_text(candidate).replace(" ", "_")

        if key in lookup:
            return lookup[key]

    return None


def find_title_column(df):

    return find_column(
        df,
        ["title", "job_title", "jobtitle", "position", "role", "job"],
    )


def find_description_column(df):

    return find_column(
        df,
        [
            "description",
            "job_description",
            "jobdescription",
            "requirements",
            "description_text",
            "requirements_text",
            "text",
        ],
    )


def dataset_skills_for_role(target_role, max_rows=400):
    """
    Counts real skills mentioned in dataset postings whose title
    matches the target role. Vectorized, so it stays fast.
    """

    cache_key = normalize_text(target_role)

    if cache_key in _ROLE_SKILL_CACHE:
        return _ROLE_SKILL_CACHE[cache_key]

    df = load_dataset()

    counter = Counter()

    if df is None or df.empty:
        _ROLE_SKILL_CACHE[cache_key] = counter
        return counter

    title_column = find_title_column(df)

    description_column = find_description_column(df)

    if not title_column or not description_column:
        _ROLE_SKILL_CACHE[cache_key] = counter
        return counter

    titles = df[title_column].astype(str).str.lower()

    tokens = role_tokens(target_role)

    if not tokens:
        _ROLE_SKILL_CACHE[cache_key] = counter
        return counter

    mask = titles.str.contains(
        normalize_text(target_role),
        regex=False,
        na=False,
    )

    if int(mask.sum()) < 5:

        mask = None

        for token in tokens:

            token_mask = titles.str.contains(token, regex=False, na=False)

            mask = token_mask if mask is None else (mask | token_mask)

    subset = df[mask].head(max_rows) if mask is not None else df.head(0)

    for _, row in subset.iterrows():

        text = (
            str(row.get(title_column, ""))
            + " "
            + str(row.get(description_column, ""))
        )

        for skill in extract_skills_from_text(text):
            counter[skill] += 1

    _ROLE_SKILL_CACHE[cache_key] = counter

    return counter


# =========================================================
# MATCH USER SKILLS AGAINST REQUIRED SKILLS
# =========================================================

def user_has_skill(required_skill, user_skills):

    user_text = " , ".join(normalize_text(skill) for skill in user_skills)

    if not user_text:
        return False

    # Required skill (or one of its aliases) named by the user
    if skill_in_text(required_skill, user_text):
        return True

    # User skill (or one of its aliases) equals the requirement
    required_key = normalize_text(required_skill)

    for skill in user_skills:

        for variant in variants_of(skill):

            if variant == required_key:
                return True

    return False


# =========================================================
# ANALYZE SKILL GAP
# =========================================================

def analyze_skill_gap(target_role, user_skills, max_required=12):

    target_role = str(target_role or "").strip()

    user_skills = clean_user_skills(user_skills)

    if not target_role:

        return {
            "target_role": "",
            "your_skills": user_skills,
            "required_skills": [],
            "missing_skills": [],
            "matched_skills": [],
            "skill_match_percentage": 0,
            "message": "Please select a target role.",
        }

    # -----------------------------------------------------
    # BUILD REQUIRED SKILLS
    # role knowledge first, then real dataset evidence
    # -----------------------------------------------------

    required_skills = []

    seen = set()

    def add_required(skill):

        if not is_meaningful_skill(skill):
            return

        if is_role_name_skill(skill, target_role):
            return

        key = normalize_text(skill)

        if key in seen:
            return

        seen.add(key)
        required_skills.append(skill)

    for skill in get_role_skills(target_role):
        add_required(skill)

    for skill, count in dataset_skills_for_role(target_role).most_common():

        if count < 2:
            continue

        add_required(skill)

    if not required_skills:

        for skill in GENERIC_SKILLS:
            add_required(skill)

    required_skills = required_skills[:max_required]

    # -----------------------------------------------------
    # MATCH
    # -----------------------------------------------------

    matched_skills = []

    missing_skills = []

    for required_skill in required_skills:

        if user_has_skill(required_skill, user_skills):
            matched_skills.append(required_skill)
        else:
            missing_skills.append(required_skill)

    if required_skills:

        skill_match_percentage = round(
            (len(matched_skills) / len(required_skills)) * 100
        )

    else:

        skill_match_percentage = 0

    # -----------------------------------------------------
    # EXTRA SKILLS THE USER HAS BEYOND THE ROLE
    # -----------------------------------------------------

    extra_skills = [
        skill
        for skill in user_skills
        if not any(
            normalize_text(skill) == normalize_text(matched)
            or skill_in_text(matched, skill)
            for matched in matched_skills
        )
    ]

    return {
        "target_role": target_role,
        "your_skills": user_skills,
        "required_skills": required_skills,
        "missing_skills": missing_skills[:10],
        "matched_skills": matched_skills,
        "extra_skills": extra_skills,
        "skill_match_percentage": skill_match_percentage,
        "message": f"Skill gap analysis for {target_role}.",
    }