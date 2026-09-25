import { useState } from 'react'
import { ArrowUpRight, FileText, LayoutDashboard, Settings, Sparkles, Target, Upload, Zap } from 'lucide-react'
import './App.css'

function App() {
  const [activeNav, setActiveNav] = useState('Overview')

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>career<span className="brand-accent">craft</span></span></div>
        <div className="workspace-label">Workspace</div>
        <nav>
          {[
            { label: 'Overview', icon: LayoutDashboard },
            { label: 'My resumes', icon: FileText },
            { label: 'Job matches', icon: Target },
          ].map(({ label, icon: Icon }) => (
            <button className={`nav-item ${activeNav === label ? 'active' : ''}`} key={label} onClick={() => setActiveNav(label)} type="button">
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item" type="button"><Settings size={17} /> Settings</button><div className="profile"><span className="avatar">JD</span><span><strong>Jordan Davis</strong><small>Free workspace</small></span></div></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><span className="eyebrow">{activeNav}</span><h1>Good morning, Jordan.</h1></div><button className="outline-button" type="button"><Zap size={16} /> Upgrade plan</button></header>
        <div className="content-inner">
          <section className="welcome-panel"><div><span className="eyebrow warm">Your next opportunity starts here</span><h2>Make your experience<br /><em>impossible to overlook.</em></h2><p>Upload your resume and a target role to get a clear, focused path to your next interview.</p><button className="primary-button" type="button"><Upload size={17} /> Analyze a resume <ArrowUpRight size={16} /></button></div><div className="score-orbit"><div className="orbit-ring"></div><div className="score-core"><Sparkles size={20} /><strong>AI</strong><small>ready when you are</small></div></div></section>

          <div className="section-heading"><div><span className="eyebrow">Your workspace</span><h3>Ready to take the next step?</h3></div><button className="text-button" type="button">View activity <ArrowUpRight size={15} /></button></div>
          <div className="stat-grid"><article className="stat-card"><span className="stat-icon coral"><FileText size={18} /></span><span className="stat-value">0</span><span className="stat-label">Resumes analyzed</span><span className="stat-note">Your first one is waiting</span></article><article className="stat-card"><span className="stat-icon blue"><Target size={18} /></span><span className="stat-value">—</span><span className="stat-label">Latest match score</span><span className="stat-note">Analyze a resume to see it</span></article><article className="stat-card"><span className="stat-icon mint"><Zap size={18} /></span><span className="stat-value">0</span><span className="stat-label">Tailored applications</span><span className="stat-note">Turn insights into action</span></article></div>

          <section className="empty-state"><div className="empty-icon"><Upload size={22} /></div><div><h3>Your resume library is empty</h3><p>Start with a PDF or DOCX resume. We will keep your versions organized here.</p></div><button className="secondary-button" type="button">Upload resume <ArrowUpRight size={15} /></button></section>
        </div>
        <footer><span>CareerCraft <span className="dot">•</span> Built for your next chapter</span><span>AI features are in preview</span></footer>
      </section>
    </main>
  )
}

export default App
