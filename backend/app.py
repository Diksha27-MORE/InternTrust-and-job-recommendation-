from flask import Flask, request, jsonify, send_from_directory

import os
import requests
from dotenv import load_dotenv

import sys
import webbrowser
import threading
import time
import secrets
from functools import wraps
from pathlib import Path

import networkx as nx


# =========================================================
# ENVIRONMENT
# =========================================================

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")


# =========================================================
# PATH SETUP
# =========================================================

backend_dir = Path(__file__).parent

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


# =========================================================
# IMPORTS
# =========================================================

from engine.risk_engine import RiskEngine

from auth_service import (
    get_user_from_token,
    initialize_auth_db,
    login_user,
    register_user,
    revoke_token,
    save_analysis_history,
    get_analysis_history,
)

from services.job_recommender import get_safe_jobs
from services.skill_analyzer import analyze_skill_gap
from services.chatbot_service import get_chatbot_answer, FALLBACK_MESSAGE


# =========================================================
# APP INIT
# =========================================================

FRONTEND_PATH = Path(__file__).parent.parent / "frontend"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_PATH),
    static_url_path=""
)

risk_engine = RiskEngine()

initialize_auth_db()


# =========================================================
# GRAPH INIT
# =========================================================

G = nx.Graph()


# =========================================================
# AUTH HELPERS
# =========================================================

def _request_token():
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")

    return token if scheme.lower() == "bearer" and token else None


def require_auth(view):
    @wraps(view)
    def authenticated_view(*args, **kwargs):

        user = get_user_from_token(
            _request_token()
        )

        if not user:
            return jsonify({
                "success": False,
                "error": "Authentication required."
            }), 401

        return view(
            user,
            *args,
            **kwargs
        )

    return authenticated_view


# =========================================================
# GRAPH UPDATE
# =========================================================

def update_graph(
    user,
    internship,
    company,
    risk_level
):

    G.add_node(
        user,
        type="student"
    )

    G.add_node(
        internship,
        type="internship",
        risk=risk_level
    )

    G.add_node(
        company,
        type="company"
    )

    G.add_edge(
        user,
        internship,
        relation="checked"
    )

    G.add_edge(
        internship,
        company,
        relation="belongs_to"
    )


# =========================================================
# FRONTEND ROUTES
# =========================================================

@app.route("/")
def home():

    return send_from_directory(
        FRONTEND_PATH,
        "index.html"
    )


@app.route("/dashboard")
def dashboard():

    return send_from_directory(
        FRONTEND_PATH,
        "dashboard.html"
    )


@app.route("/assets/<path:filename>")
def assets(filename):

    return send_from_directory(
        FRONTEND_PATH / "assets",
        filename
    )


# =========================================================
# AUTHENTICATION
# =========================================================

@app.route(
    "/api/auth/register",
    methods=["POST"]
)
def auth_register():

    try:

        data = request.get_json() or {}

        user, error = register_user(
            data.get("name"),
            data.get("email"),
            data.get("password"),
            data.get("role", "Student"),
        )

        if error:
            return jsonify({
                "success": False,
                "error": error
            }), 400

        return jsonify({
            "success": True,
            "user": user
        }), 201

    except Exception as e:

        # Previously unhandled: any exception here crashed as a raw
        # HTML debug page instead of JSON, which the frontend's
        # response.json().catch(() => ({})) swallowed into the generic
        # "Authentication request failed." message. Logging + returning
        # real JSON here surfaces the actual cause instead of hiding it.
        print(
            "❌ Register Error:",
            e
        )

        return jsonify({
            "success": False,
            "error": "Registration failed. Please try again."
        }), 500


@app.route(
    "/api/auth/login",
    methods=["POST"]
)
def auth_login():

    try:

        data = request.get_json() or {}

        user, token, error = login_user(
            data.get("email"),
            data.get("password")
        )

        if error:
            return jsonify({
                "success": False,
                "error": error
            }), 401

        history = get_analysis_history(
            user["id"]
        )

        user["history"] = history

        return jsonify({
            "success": True,
            "user": user,
            "token": token,
            "history": history
        }), 200

    except Exception as e:

        # Previously unhandled: any exception here (e.g. a SQLite
        # locking/permissions issue, or a bad history record) crashed
        # as a raw HTML debug page instead of JSON. The frontend's
        # response.json().catch(() => ({})) then swallowed that into
        # the generic "Authentication request failed." message with no
        # real cause visible. Logging + returning real JSON here fixes
        # that and surfaces the actual error in the backend terminal.
        print(
            "❌ Login Error:",
            e
        )

        return jsonify({
            "success": False,
            "error": "Login failed. Please try again."
        }), 500


@app.route(
    "/api/auth/me",
    methods=["GET"]
)
@require_auth
def auth_me(user):

    history = get_analysis_history(
        user["id"]
    )

    user["history"] = history

    return jsonify({
        "success": True,
        "user": user,
        "history": history
    }), 200


@app.route(
    "/api/auth/history",
    methods=["GET"]
)
@require_auth
def auth_history(user):

    history = get_analysis_history(
        user["id"]
    )

    return jsonify({
        "success": True,
        "history": history
    }), 200


@app.route(
    "/api/auth/logout",
    methods=["POST"]
)
def auth_logout():

    revoke_token(
        _request_token()
    )

    return jsonify({
        "success": True
    }), 200


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({
        "status": "healthy",
        "service": "InternTrust Backend"
    }), 200


# =========================================================
# FRAUD ANALYSIS
# =========================================================

@app.route(
    "/analyze",
    methods=["POST"]
)
@require_auth
def analyze(current_user):

    try:

        data = request.get_json() or {}

        required = [
            "website_link",
            "email",
            "message",
            "url"
        ]

        missing = [
            field
            for field in required
            if not data.get(field)
        ]

        if missing:

            return jsonify({
                "success": False,
                "error": f"Missing fields: {missing}"
            }), 400


        # =================================================
        # RISK ANALYSIS
        # =================================================

        message = data.get(
            "message",
            ""
        )

        website = (
            data.get("url")
            or data.get(
                "website_link",
                ""
            )
        )

        result = risk_engine.analyze(

            title=(
                data.get("title")
                or data.get(
                    "url",
                    ""
                )
            ),

            description=message,

            email=data.get(
                "email",
                ""
            ),

            website=website,

            company_name=data.get(
                "company_name",
                ""
            )
        )


        if "fraud_probability" not in result:

            return jsonify({
                "success": False,
                "error": "The trained ML model is unavailable."
            }), 503


        # =================================================
        # HARD CONSISTENCY GUARD
        # =================================================

        _score = result.get(
            "risk_score",
            result.get(
                "final_risk_score",
                0
            )
        )

        if _score <= 30:
            _level = "Low"

        elif _score <= 60:
            _level = "Medium"

        else:
            _level = "High"


        result["risk_score"] = _score

        result["final_risk_score"] = _score

        result["risk_level"] = _level

        result["prediction"] = {
            "Low": "Trustworthy",
            "Medium": "Proceed with Caution",
            "High": "Not Trustworthy",
        }[_level]

        result["is_safe"] = (
            _level == "Low"
        )


        # =================================================
        # SKILL ANALYSIS
        # =================================================

        user_skills = data.get(
            "skills",
            []
        )

        if isinstance(
            user_skills,
            str
        ):

            user_skills = [
                s.strip()
                for s in user_skills.split(",")
                if s.strip()
            ]


        target_role = str(
            data.get(
                "target_role",
                ""
            )
        ).strip()


        if target_role:

            skill_result = analyze_skill_gap(
                target_role=target_role,
                user_skills=user_skills
            )

        else:

            skill_result = {
                "your_skills": user_skills,
                "missing_skills": [],
                "message": "Target role not provided."
            }


        # =================================================
        # GRAPH UPDATE
        # =================================================

        user = data.get(
            "user",
            current_user["name"]
        )

        internship_id = (
            data.get("title")
            or data.get(
                "url",
                ""
            )
        )[:30]

        company = data.get(
            "company_name",
            "unknown_company"
        )

        risk_level = result.get(
            "risk_level",
            "unknown"
        )

        update_graph(
            user,
            internship_id,
            company,
            risk_level
        )


        # =================================================
        # SAVE ANALYSIS HISTORY
        # =================================================

        history_record = {

            "id": (
                f"analysis_"
                f"{secrets.token_hex(12)}"
            ),

            "userId": current_user["id"],

            "title": (
                data.get("title")
                or data.get(
                    "url",
                    "Job Opportunity"
                )
            ),

            "website": (
                data.get(
                    "website_link"
                )
                or data.get(
                    "url",
                    ""
                )
            ),

            "company": data.get(
                "company_name",
                "Company"
            ),

            "riskLevel": result.get(
                "risk_level",
                "Unknown"
            ),

            "finalRiskScore": result.get(
                "final_risk_score",
                result.get(
                    "risk_score",
                    0
                )
            ),

            "createdAt": time.strftime(
                "%Y-%m-%dT%H:%M:%SZ",
                time.gmtime()
            ),

            "raw": {
                "data": result,
                "skill_gap": skill_result
            }
        }


        save_analysis_history(
            current_user["id"],
            history_record
        )


        # =================================================
        # RESPONSE
        # =================================================

        return jsonify({

            "success": True,

            "data": result,

            "skill_gap": skill_result,

            "history_record": history_record

        }), 200


    except Exception as e:

        print(
            "❌ Analyze Error:",
            e
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# AI CHATBOT
#
# All Gemini API logic (prompt building, request/retry/timeout, and
# response parsing) lives in services/chatbot_service.py. This route
# only validates the incoming request and hands off to that service.
# It always returns a clean 200 with either a real answer or the
# service's friendly fallback message — it never forwards a raw
# Gemini error to the frontend.
# =========================================================

@app.route(
    "/api/chatbot",
    methods=["POST"]
)
@require_auth
def chatbot(current_user):

    try:

        data = request.get_json() or {}

        question = (
            data.get("question") or ""
        ).strip()

        analysis = (
            data.get("analysis") or {}
        )

        if not question:

            return jsonify({
                "success": False,
                "error": "Question is required."
            }), 400

        answer = get_chatbot_answer(
            question,
            analysis
        )

        return jsonify({
            "success": True,
            "answer": answer
        }), 200

    except Exception as e:

        # Defensive catch-all: even here, never leak the exception
        # detail to the student — just log it and hand back the same
        # friendly fallback line the service itself uses.
        print(
            "❌ Chatbot Route Error:",
            e
        )

        return jsonify({
            "success": True,
            "answer": FALLBACK_MESSAGE
        }), 200


# =========================================================
# GRAPH API
# =========================================================

@app.route(
    "/api/graph",
    methods=["GET"]
)
def get_graph():

    try:

        data = nx.readwrite.json_graph.node_link_data(
            G
        )

        return jsonify({

            "success": True,

            "graph": data

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# =========================================================
# JOB RECOMMENDATION
# =========================================================

@app.route(
    "/api/recommend",
    methods=["POST"]
)
@require_auth
def recommend(current_user):

    try:

        data = request.get_json() or {}


        # -------------------------------------------------
        # TARGET ROLE
        # -------------------------------------------------

        target_role = str(
            data.get(
                "target_role",
                ""
            )
        ).strip()


        # -------------------------------------------------
        # USER SKILLS
        # -------------------------------------------------

        skills = data.get(
            "skills",
            []
        )

        if isinstance(
            skills,
            str
        ):

            skills = [
                s.strip()
                for s in skills.split(",")
                if s.strip()
            ]

        elif not isinstance(
            skills,
            list
        ):

            skills = []


        # -------------------------------------------------
        # LOCATION
        # -------------------------------------------------

        location = str(
            data.get(
                "location",
                ""
            )
        ).strip()


        # -------------------------------------------------
        # TARGET ROLE REQUIRED
        # -------------------------------------------------

        if not target_role:

            return jsonify({

                "success": False,

                "needs_target_role": True,

                "jobs": [],

                "error": (
                    "Target role is required."
                )

            }), 400


        # -------------------------------------------------
        # SEND ROLE + SKILLS + LOCATION
        # -------------------------------------------------

        recommendation_input = {

            "target_role": target_role,

            "skills": skills,

            "location": location

        }


        jobs = get_safe_jobs(
            recommendation_input
        )


        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({

            "success": True,

            "target_role": target_role,

            "skills": skills,

            "count": len(jobs),

            "jobs": jobs

        }), 200


    except Exception as e:

        print(
            "❌ Recommendation Error:",
            e
        )

        return jsonify({

            "success": False,

            "jobs": [],

            "error": str(e)

        }), 500


# =========================================================
# SKILL GAP ANALYZER
# =========================================================

@app.route(
    "/api/skill-gap",
    methods=["POST"]
)
@require_auth
def skill_gap(current_user):

    try:

        data = request.get_json() or {}


        # -------------------------------------------------
        # TARGET ROLE
        # -------------------------------------------------

        target_role = str(
            data.get(
                "target_role",
                ""
            )
        ).strip()


        # -------------------------------------------------
        # USER SKILLS
        # -------------------------------------------------

        skills = data.get(
            "skills",
            []
        )

        if isinstance(
            skills,
            str
        ):

            skills = [
                s.strip()
                for s in skills.split(",")
                if s.strip()
            ]

        elif not isinstance(
            skills,
            list
        ):

            skills = []


        # -------------------------------------------------
        # TARGET ROLE REQUIRED
        # -------------------------------------------------

        if not target_role:

            return jsonify({

                "success": False,

                "needs_target_role": True,

                "error": (
                    "Target role is required."
                )

            }), 400


        # -------------------------------------------------
        # ROLE-BASED SKILL ANALYSIS
        # -------------------------------------------------

        result = analyze_skill_gap(

            target_role=target_role,

            user_skills=skills

        )


        return jsonify({

            "success": True,

            "target_role": target_role,

            "data": result

        }), 200


    except Exception as e:

        print(
            "❌ Skill Gap Error:",
            e
        )

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# =========================================================
# CORS
# =========================================================

@app.after_request
def after_request(response):

    response.headers[
        "Access-Control-Allow-Origin"
    ] = "*"

    response.headers[
        "Access-Control-Allow-Methods"
    ] = "GET, POST, PUT, DELETE, OPTIONS"

    response.headers[
        "Access-Control-Allow-Headers"
    ] = "Content-Type, Authorization"

    return response


@app.before_request
def handle_preflight():

    if request.method == "OPTIONS":

        return jsonify({
            "success": True
        }), 200


# =========================================================
# RUN APP
# =========================================================

if __name__ == "__main__":

    print("=" * 50)

    print("🚀 InternTrust Running")

    print("=" * 50)

    print(
        "Main Website : "
        "http://localhost:5000"
    )

    print(
        "Dashboard    : "
        "http://localhost:5000/dashboard"
    )

    print(
        "Graph API    : "
        "http://localhost:5000/api/graph"
    )

    print(
        "History API  : "
        "http://localhost:5000/api/auth/history"
    )

    print(
        "Recommend API: "
        "http://localhost:5000/api/recommend"
    )

    print(
        "Skill Gap API: "
        "http://localhost:5000/api/skill-gap"
    )

    print(
        "Chatbot API  : "
        "http://localhost:5000/api/chatbot"
    )

    print("=" * 50)


    # =====================================================
    # OPEN CHROME
    # =====================================================

    def open_in_chrome(url: str):

        chrome_paths = [

            r"C:\Program Files\Google\Chrome\Application\chrome.exe",

            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",

        ]

        for path in chrome_paths:

            if Path(path).exists():

                webbrowser.register(

                    "chrome",

                    None,

                    webbrowser.BackgroundBrowser(path)

                )

                try:

                    webbrowser.get(
                        "chrome"
                    ).open_new_tab(url)

                    return

                except webbrowser.Error:

                    break


        try:

            webbrowser.get(
                "chrome"
            ).open_new_tab(url)

        except webbrowser.Error:

            webbrowser.open_new_tab(url)


    browser_thread = threading.Thread(

        target=lambda: (

            time.sleep(1),

            open_in_chrome(
                "http://localhost:5000"
            )

        ),

        daemon=True

    )

    browser_thread.start()


    # =====================================================
    # START FLASK
    # =====================================================

    app.run(

        debug=True,

        use_reloader=False,

        host="0.0.0.0",

        port=5000

    )