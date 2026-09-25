import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  LayoutDashboard,
  Save,
  Settings,
  Sparkles,
  Target,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type NavItem = 'Overview' | 'My resumes' | 'Job matches'
type Modal = 'upload' | 'upgrade' | 'activity' | 'settings' | null
type Finding = { severity: 'high' | 'medium' | 'low'; category: string; title: string; detail: string }
type AnalysisResult = { score: number; word_count?: number; summary: string; findings: Finding[]; matched_keywords?: string[]; missing_keywords?: string[] }

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001'

const navigation: { label: NavItem; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'My resumes', icon: FileText },
  { label: 'Job matches', icon: Target },
]

function App() {
  const [activeNav, setActiveNav] = useState<NavItem>('Overview')
  const [modal, setModal] = useState<Modal>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [notifications, setNotifications] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openUpload = () => setModal('upload')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      window.alert('Please choose a PDF or DOCX resume.')
      event.target.value = ''
      return
    }
    setResumeFile(file)
    setAnalysis(null)
    setAnalysisError('')
    setModal(null)
    event.target.value = ''
  }

  const analyzeResume = async () => {
    if (!resumeFile) {
      openUpload()
      return
    }
    setIsAnalyzing(true)
    setAnalysisError('')
    const formData = new FormData()
    formData.append('resume', resumeFile)
    try {
      const response = await fetch(`${API_URL}/api/analyze/resume`, { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'The resume could not be analyzed.')
      setAnalysis(result)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The resume could not be analyzed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const navigate = (item: NavItem) => {
    setActiveNav(item)
    setModal(null)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>career<span className="brand-accent">craft</span></span></div>
        <div className="workspace-label">Workspace</div>
        <nav>
          {navigation.map(({ label, icon: Icon }) => (
            <button className={`nav-item ${activeNav === label ? 'active' : ''}`} key={label} onClick={() => navigate(label)} type="button">
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal('settings')} type="button"><Settings size={17} /> Settings</button>
          <div className="profile"><span className="avatar">JD</span><span><strong>Jordan Davis</strong><small>Free workspace</small></span></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar"><div><span className="eyebrow">{activeNav}</span><h1>Good morning, Jordan.</h1></div><button className="outline-button" onClick={() => setModal('upgrade')} type="button"><Zap size={16} /> Upgrade plan</button></header>
        <div className="content-inner">
          {activeNav === 'Overview' && <OverviewView resumeFile={resumeFile} analysis={analysis} analysisError={analysisError} isAnalyzing={isAnalyzing} onAnalyze={analyzeResume} onUpload={openUpload} onActivity={() => setModal('activity')} />}
          {activeNav === 'My resumes' && <ResumeView resumeFile={resumeFile} hasAnalysis={Boolean(analysis)} onAnalyze={analyzeResume} onUpload={openUpload} />}
          {activeNav === 'Job matches' && <MatchesView />}
        </div>
        <footer><span>CareerCraft <span className="dot">•</span> Built for your next chapter</span><span>AI features are in preview</span></footer>
      </section>

      <input ref={fileInputRef} className="hidden-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} />
      {modal && <ModalView modal={modal} resumeFile={resumeFile} notifications={notifications} onClose={() => setModal(null)} onChooseFile={() => fileInputRef.current?.click()} onToggleNotifications={() => setNotifications((value) => !value)} />}
    </main>
  )
}

type OverviewProps = { resumeFile: File | null; analysis: AnalysisResult | null; analysisError: string; isAnalyzing: boolean; onAnalyze: () => void; onUpload: () => void; onActivity: () => void }

function OverviewView({ resumeFile, analysis, analysisError, isAnalyzing, onAnalyze, onUpload, onActivity }: OverviewProps) {
  return <>
    <section className="welcome-panel"><div><span className="eyebrow warm">Your next opportunity starts here</span><h2>Make your experience<br /><em>impossible to overlook.</em></h2><p>Upload your resume and get specific feedback on structure, clarity, contact details, and measurable impact.</p><button className="primary-button" onClick={onAnalyze} type="button">{isAnalyzing ? <><Clock3 size={17} /> Analyzing resume...</> : <><Upload size={17} /> {resumeFile ? 'Analyze this resume' : 'Analyze a resume'} <ArrowUpRight size={16} /></>}</button>{analysisError && <p className="error-message">{analysisError}</p>}</div><div className="score-orbit"><div className="orbit-ring"></div><div className="score-core">{analysis ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}<strong>{analysis ? `${analysis.score}%` : 'AI'}</strong><small>{analysis ? 'resume score' : 'ready when you are'}</small></div></div></section>
    <div className="section-heading"><div><span className="eyebrow">Your workspace</span><h3>Ready to take the next step?</h3></div><button className="text-button" onClick={onActivity} type="button">View activity <ArrowUpRight size={15} /></button></div>
    <div className="stat-grid"><article className="stat-card"><span className="stat-icon coral"><FileText size={18} /></span><span className="stat-value">{resumeFile ? '1' : '0'}</span><span className="stat-label">Resumes analyzed</span><span className="stat-note">{resumeFile ? resumeFile.name : 'Your first one is waiting'}</span></article><article className="stat-card"><span className="stat-icon blue"><Target size={18} /></span><span className="stat-value">{analysis ? `${analysis.score}%` : '—'}</span><span className="stat-label">Latest resume score</span><span className="stat-note">{analysis ? analysis.summary : 'Analyze a resume to see it'}</span></article><article className="stat-card"><span className="stat-icon mint"><Zap size={18} /></span><span className="stat-value">{analysis ? analysis.findings.length : '0'}</span><span className="stat-label">Improvement areas</span><span className="stat-note">Specific feedback to work through</span></article></div>
    {analysis && <FindingsPanel title="Resume analysis" analysis={analysis} />}
    <section className={`empty-state ${resumeFile ? 'resume-ready' : ''}`}><div className="empty-icon">{resumeFile ? <CheckCircle2 size={22} /> : <Upload size={22} />}</div><div><h3>{resumeFile ? 'Resume ready for analysis' : 'Your resume library is empty'}</h3><p>{resumeFile ? `${resumeFile.name} is saved for this session.` : 'Start with a PDF or DOCX resume. We will keep your versions organized here.'}</p></div><button className="secondary-button" onClick={onUpload} type="button">{resumeFile ? 'Replace resume' : 'Upload resume'} <ArrowUpRight size={15} /></button></section>
  </>
}

function ResumeView({ resumeFile, hasAnalysis, onAnalyze, onUpload }: { resumeFile: File | null; hasAnalysis: boolean; onAnalyze: () => void; onUpload: () => void }) {
  return <section className="page-view"><div className="page-heading"><div><span className="eyebrow">Document library</span><h2>My resumes</h2><p>Keep your working versions close and ready to tailor.</p></div><button className="primary-button" onClick={onUpload} type="button"><Upload size={17} /> Upload resume</button></div>{resumeFile ? <article className="resume-row"><span className="stat-icon coral"><FileText size={18} /></span><div><strong>{resumeFile.name}</strong><small>{(resumeFile.size / 1024).toFixed(0)} KB <span className="dot">•</span> Added just now</small></div><span className={`status-pill ${hasAnalysis ? 'complete' : ''}`}>{hasAnalysis ? 'Analyzed' : 'Needs analysis'}</span><button className="secondary-button" onClick={onAnalyze} type="button">{hasAnalysis ? 'Analyze again' : 'Analyze'} <ArrowUpRight size={15} /></button></article> : <section className="library-empty"><div className="empty-icon"><FileText size={22} /></div><h3>No resumes yet</h3><p>Upload a resume to begin your first analysis.</p><button className="secondary-button" onClick={onUpload} type="button">Choose a file <Upload size={15} /></button></section>}</section>
}

function FindingsPanel({ title, analysis }: { title: string; analysis: AnalysisResult }) {
  return <section className="findings-panel"><div className="findings-heading"><div><span className="eyebrow">{title}</span><h3>{analysis.summary}</h3></div><span className="score-badge">{analysis.score}% score</span></div><div className="findings-list">{analysis.findings.map((finding, index) => <article className="finding" key={`${finding.title}-${index}`}><span className={`severity-dot ${finding.severity}`}></span><div><span className="finding-category">{finding.category} <span className="dot">•</span> {finding.severity}</span><h4>{finding.title}</h4><p>{finding.detail}</p></div></article>)}</div></section>
}

function MatchesView() {
  const [resume, setResume] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState<File | null>(null)
  const [jobDescriptionText, setJobDescriptionText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [isMatching, setIsMatching] = useState(false)
  const resumeInput = useRef<HTMLInputElement>(null)
  const jobInput = useRef<HTMLInputElement>(null)

  const runMatch = async () => {
    if (!resume || (!jobDescription && !jobDescriptionText.trim())) {
      setError('Choose a resume and paste or upload a job description before comparing.')
      return
    }
    setIsMatching(true)
    setError('')
    const formData = new FormData()
    formData.append('resume', resume)
    if (jobDescriptionText.trim()) formData.append('job_description_text', jobDescriptionText.trim())
    else if (jobDescription) formData.append('job_description', jobDescription)
    try {
      const response = await fetch(`${API_URL}/api/analyze/match`, { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'The files could not be compared.')
      setResult(data)
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : 'The files could not be compared.')
    } finally {
      setIsMatching(false)
    }
  }

  return <section className="page-view"><div className="page-heading"><div><span className="eyebrow">Opportunity radar</span><h2>Job matches</h2><p>Upload your resume, then paste a job description or attach it as a file.</p></div></div><div className="match-upload-grid"><FilePicker label="Your resume" file={resume} inputRef={resumeInput} onChange={setResume} /><FilePicker label="Job description file" file={jobDescription} inputRef={jobInput} onChange={(file) => { setJobDescription(file); if (file) setJobDescriptionText('') }} /></div><label className="job-text-label"><span className="eyebrow">Or paste the job description</span><textarea className="job-textarea" value={jobDescriptionText} onChange={(event) => { setJobDescriptionText(event.target.value); if (event.target.value) setJobDescription(null) }} placeholder="Paste the responsibilities, requirements, and qualifications here..." rows={7} /></label><button className="primary-button match-button" disabled={isMatching} onClick={runMatch} type="button"><Target size={17} /> {isMatching ? 'Comparing documents...' : 'Compare resume to role'} <ArrowUpRight size={16} /></button>{error && <p className="error-message match-error">{error}</p>}{result && <FindingsPanel title="Role fit analysis" analysis={result} />}{result && <section className="keyword-grid"><div><span className="eyebrow">Present in your resume</span><div className="keyword-list">{result.matched_keywords?.map((keyword) => <span className="keyword matched" key={keyword}>{keyword}</span>)}</div></div><div><span className="eyebrow">Missing or not detected</span><div className="keyword-list">{result.missing_keywords?.map((keyword) => <span className="keyword missing" key={keyword}>{keyword}</span>)}</div></div></section>}</section>
}

function FilePicker({ label, file, inputRef, onChange }: { label: string; file: File | null; inputRef: React.RefObject<HTMLInputElement | null>; onChange: (file: File | null) => void }) {
  return <button className={`file-picker ${file ? 'selected' : ''}`} onClick={() => inputRef.current?.click()} type="button"><input ref={inputRef} className="hidden-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => onChange(event.target.files?.[0] ?? null)} /><span className="file-picker-icon">{file ? <CheckCircle2 size={19} /> : <Upload size={19} />}</span><span><strong>{label}</strong><small>{file ? file.name : 'Choose PDF or DOCX'}</small></span><ArrowUpRight size={15} /></button>
}

function ModalView({ modal, resumeFile, notifications, onClose, onChooseFile, onToggleNotifications }: { modal: Exclude<Modal, null>; resumeFile: File | null; notifications: boolean; onClose: () => void; onChooseFile: () => void; onToggleNotifications: () => void }) {
  const content = {
    upload: <><span className="eyebrow warm">Start your analysis</span><h2>Bring your resume along.</h2><p>Choose a PDF or DOCX file. It stays in this browser session until the backend analysis flow is connected.</p><button className="primary-button" onClick={onChooseFile} type="button"><Upload size={17} /> Choose resume</button></>,
    upgrade: <><span className="eyebrow warm">CareerCraft Plus</span><h2>More signal for every application.</h2><p>Upgrade is coming soon. The starter workspace currently includes one resume and a preview analysis.</p><button className="primary-button" onClick={onClose} type="button"><Zap size={17} /> Keep exploring</button></>,
    activity: <><span className="eyebrow warm">Workspace timeline</span><h2>Nothing to review yet.</h2><p>{resumeFile ? 'Your resume was added in this session. Run an analysis to create your first activity.' : 'Upload a resume to start building your activity history.'}</p><div className="activity-line"><History size={17} /><span>First analysis<br /><small>Waiting for a resume</small></span></div></>,
    settings: <><span className="eyebrow warm">Workspace preferences</span><h2>Settings</h2><label className="setting-row"><span><strong>Analysis notifications</strong><small>Show updates when a resume finishes processing</small></span><input checked={notifications} onChange={onToggleNotifications} type="checkbox" /></label><button className="primary-button" onClick={onClose} type="button"><Save size={17} /> Save preferences</button></>,
  }[modal]

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal-card" onMouseDown={(event) => event.stopPropagation()}><button aria-label="Close dialog" className="close-button" onClick={onClose} type="button"><X size={17} /></button>{content}</section></div>
}

export default App