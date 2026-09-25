import asyncio
import json
import re
from io import BytesIO

from docx import Document
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pypdf import PdfReader
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "resume_analyser"
    frontend_url: str = "http://localhost:5173"
    ai_api_key: str | None = None
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str | None = None

    model_config = SettingsConfigDict(env_file="backend/.env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
app = FastAPI(title="AI Resume Analyzer API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "resume-analyser-api"}


def extract_text(filename: str, content: bytes) -> str:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    try:
        if suffix == "pdf":
            return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages).strip()
        if suffix == "docx":
            document = Document(BytesIO(content))
            return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Could not read {filename}: {error}") from error
    raise HTTPException(status_code=415, detail="Only PDF and DOCX files are supported.")


def make_resume_findings(text: str) -> list[dict[str, str]]:
    normalized = text.lower()
    findings: list[dict[str, str]] = []
    if len(text.split()) < 180:
        findings.append({"severity": "high", "category": "Content", "title": "Resume looks too brief", "detail": "Add context around your strongest projects, responsibilities, and outcomes so the document shows enough evidence of your experience."})
    for section in ("experience", "education", "skills"):
        if section not in normalized:
            findings.append({"severity": "medium", "category": "Structure", "title": f"Missing {section.title()} section", "detail": f"Add a clear {section.title()} heading so recruiters and screening systems can find this information quickly."})
    if not re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text):
        findings.append({"severity": "high", "category": "Contact", "title": "No email address detected", "detail": "Include a professional email address in the header so employers have a direct way to contact you."})
    if not re.search(r"(?:\+?\d[\d\s().-]{7,}\d)", text):
        findings.append({"severity": "medium", "category": "Contact", "title": "No phone number detected", "detail": "Add a reachable phone number alongside your email and location."})
    if not re.search(r"(?:\d+%|\$\s?\d+|\b\d+(?:\.\d+)?x\b|\b\d{2,}\b)", text, re.IGNORECASE):
        findings.append({"severity": "high", "category": "Impact", "title": "Achievements lack measurable outcomes", "detail": "Quantify results where possible, such as revenue, time saved, adoption, performance, or team size."})
    if not re.search(r"(?:^|\n)\s*[-•*]\s+", text):
        findings.append({"severity": "medium", "category": "Readability", "title": "No bullet points detected", "detail": "Use concise bullet points for experience and projects so the most relevant evidence is easy to scan."})
    if any(len(line) > 150 for line in text.splitlines()):
        findings.append({"severity": "low", "category": "Readability", "title": "Some lines are difficult to scan", "detail": "Break long paragraphs into shorter bullets with one idea and one outcome per line."})
    return findings


def keywords(text: str) -> set[str]:
    ignored = {"about", "after", "again", "also", "and", "are", "from", "for", "have", "into", "looking", "more", "our", "senior", "that", "the", "their", "this", "will", "with", "you", "your"}
    return {word for word in re.findall(r"[a-zA-Z][a-zA-Z+#-]{2,}", text.lower()) if word not in ignored}


async def ask_ai(system_prompt: str, user_prompt: str) -> dict | None:
    if not settings.ai_api_key:
        return None

    def request() -> dict:
        client_options = {"api_key": settings.ai_api_key}
        if settings.ai_base_url:
            client_options["base_url"] = settings.ai_base_url
        client = OpenAI(**client_options)
        response = client.chat.completions.create(
            model=settings.ai_model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)

    try:
        return await asyncio.to_thread(request)
    except Exception:
        return None


def valid_findings(value: object) -> list[dict[str, str]] | None:
    if not isinstance(value, list):
        return None
    findings = []
    for item in value:
        if not isinstance(item, dict) or not all(key in item for key in ("severity", "category", "title", "detail")):
            continue
        severity = item["severity"] if item["severity"] in {"high", "medium", "low"} else "medium"
        findings.append({"severity": severity, "category": str(item["category"]), "title": str(item["title"]), "detail": str(item["detail"])})
    return findings


async def ai_resume_analysis(text: str) -> dict | None:
    result = await ask_ai(
        "You are an expert resume reviewer. Return only valid JSON with score (integer 0-100), summary (string), and findings (array). Each finding must have severity (high, medium, or low), category, title, and detail. Focus on specific, truthful improvements supported by the resume text. Do not invent experience.",
        f"Review this resume and identify its most important defects:\n\n{text[:24000]}",
    )
    if not result or valid_findings(result.get("findings")) is None:
        return None
    return {"score": max(0, min(100, int(result.get("score", 0)))), "summary": str(result.get("summary", "AI review complete.")), "findings": valid_findings(result["findings"])}


async def ai_match_analysis(resume_text: str, job_text: str) -> dict | None:
    result = await ask_ai(
        "You are an expert recruiter and resume strategist. Return only valid JSON with score (integer 0-100), summary (string), matched_keywords (array of strings), missing_keywords (array of strings), and findings (array). Each finding must have severity (high, medium, or low), category, title, and detail. Only recommend skills or requirements explicitly present in the job description.",
        f"Compare this resume to the job description. Explain what makes the resume unsuitable and how to improve it.\n\nRESUME:\n{resume_text[:18000]}\n\nJOB DESCRIPTION:\n{job_text[:12000]}",
    )
    if not result or valid_findings(result.get("findings")) is None:
        return None
    return {"score": max(0, min(100, int(result.get("score", 0)))), "summary": str(result.get("summary", "AI comparison complete.")), "matched_keywords": [str(item) for item in result.get("matched_keywords", [])][:15], "missing_keywords": [str(item) for item in result.get("missing_keywords", [])][:12], "findings": valid_findings(result["findings"])}


@app.post("/api/analyze/resume")
async def analyze_resume(resume: UploadFile = File(...)) -> dict:
    text = extract_text(resume.filename or "resume", await resume.read())
    if not text:
        raise HTTPException(status_code=400, detail="No readable text was found in the resume.")
    ai_result = await ai_resume_analysis(text)
    if ai_result:
        return {**ai_result, "word_count": len(text.split()), "source": "ai"}
    findings = make_resume_findings(text)
    score = max(35, 100 - sum({"high": 16, "medium": 9, "low": 4}[item["severity"]] for item in findings))
    return {"score": score, "word_count": len(text.split()), "findings": findings, "summary": f"Found {len(findings)} improvement area(s) in your resume.", "source": "heuristic"}


@app.post("/api/analyze/match")
async def analyze_match(
    resume: UploadFile = File(...),
    job_description: UploadFile | None = File(None),
    job_description_text: str | None = Form(None),
) -> dict:
    resume_text = extract_text(resume.filename or "resume", await resume.read())
    if job_description_text and job_description_text.strip():
        job_text = job_description_text.strip()
    elif job_description:
        job_text = extract_text(job_description.filename or "job-description", await job_description.read())
    else:
        raise HTTPException(status_code=400, detail="Provide a job description as text or a PDF/DOCX file.")
    if not resume_text or not job_text:
        raise HTTPException(status_code=400, detail="Both files must contain readable text.")
    ai_result = await ai_match_analysis(resume_text, job_text)
    if ai_result:
        return {**ai_result, "source": "ai"}
    resume_words = keywords(resume_text)
    job_words = keywords(job_text)
    matched = sorted(resume_words & job_words)
    missing = sorted(job_words - resume_words, key=lambda word: (-len(word), word))[:12]
    score = round((len(matched) / max(len(job_words), 1)) * 100)
    findings = [{"severity": "high", "category": "Job fit", "title": f"Add evidence for '{word}'", "detail": "If you have this experience, reflect it in a relevant bullet with a concrete outcome."} for word in missing[:5]]
    if not findings:
        findings.append({"severity": "low", "category": "Job fit", "title": "Strong keyword alignment", "detail": "Your resume includes the key terms found in this job description. Review the bullets manually for truthful, specific evidence."})
    return {"score": score, "matched_keywords": matched[:15], "missing_keywords": missing, "findings": findings, "summary": f"Your resume matches approximately {score}% of the job description keywords.", "source": "heuristic"}