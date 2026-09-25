import re
from io import BytesIO

from docx import Document
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "resume_analyser"
    frontend_url: str = "http://localhost:5173"

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


@app.post("/api/analyze/resume")
async def analyze_resume(resume: UploadFile = File(...)) -> dict:
    text = extract_text(resume.filename or "resume", await resume.read())
    if not text:
        raise HTTPException(status_code=400, detail="No readable text was found in the resume.")
    findings = make_resume_findings(text)
    score = max(35, 100 - sum({"high": 16, "medium": 9, "low": 4}[item["severity"]] for item in findings))
    return {"score": score, "word_count": len(text.split()), "findings": findings, "summary": f"Found {len(findings)} improvement area(s) in your resume."}


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
    resume_words = keywords(resume_text)
    job_words = keywords(job_text)
    matched = sorted(resume_words & job_words)
    missing = sorted(job_words - resume_words, key=lambda word: (-len(word), word))[:12]
    score = round((len(matched) / max(len(job_words), 1)) * 100)
    findings = [{"severity": "high", "category": "Job fit", "title": f"Add evidence for '{word}'", "detail": "If you have this experience, reflect it in a relevant bullet with a concrete outcome."} for word in missing[:5]]
    if not findings:
        findings.append({"severity": "low", "category": "Job fit", "title": "Strong keyword alignment", "detail": "Your resume includes the key terms found in this job description. Review the bullets manually for truthful, specific evidence."})
    return {"score": score, "matched_keywords": matched[:15], "missing_keywords": missing, "findings": findings, "summary": f"Your resume matches approximately {score}% of the job description keywords."}