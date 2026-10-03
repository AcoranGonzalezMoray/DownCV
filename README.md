<p align="center">
  <img src="./public/icon.jpg" width="128" height="128" alt="DownCV Logo" style="border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);" />
</p>

<h1 align="center">DownCV</h1>

<p align="center">
  <strong>The Local-First, Privacy-Focused Markdown CV Builder & ATS Optimizer</strong>
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT"></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react" alt="React 18"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6.0-646cff.svg?logo=vite" alt="Vite 6"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8.svg?logo=tailwindcss" alt="Tailwind CSS"></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Tested_with-Vitest-729b1b.svg?logo=vitest" alt="Vitest"></a>
  <a href="#privacy"><img src="https://img.shields.io/badge/Privacy-100%25_Local_--_No_Server-emerald.svg" alt="100% Local"></a>
</p>


<img src="./public/captures/DownCV.png" alt="DownCV application screenshot" style="border-radius: 12px">

## 📌 Overview

**DownCV** is a high-performance, open-source web application designed to help job seekers create, format, and optimize professional resumes using **Markdown**. 

Unlike web resume builders that process sensitive personal data on third-party servers, **DownCV runs 100% client-side in your browser**. It includes an isolated **Applicant Tracking System (ATS) evaluation engine** that generates real vector PDFs, reads back the text layer using `pdf.js` (exactly as real ATS parsers do), scores the resume across 12 critical dimensions, and provides **one-click automatic Markdown fixes**.

---

## ✨ Key Features

<table>
  <!-- Feature 1 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-editor-blue" width="125" align="right"/>
      <details open>
        <summary>⚡ Bi-directional Markdown Editor & Live Preview</summary>
        
> Edit raw Markdown or select text on the A4 page preview to format elements directly without breaking document syntax.
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/markdown-editor-preview.gif" alt="Bi-directional Markdown Editor Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 2 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-ATS--Scorer-green" width="125" align="right"/>
      <details open>
        <summary>🛡️ Integrated ATS Simulator & Scorer</summary>
        
> Scores your generated PDF against realistic ATS rules (text layer integrity, keyword density, action verbs, contact information, bullet quality, etc.).
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/ats-simulator-scorer.gif" alt="ATS Simulator & Scorer Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 3 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-review%20%26%20verify-orange" width="125" align="right"/>
      <details open>
        <summary>✅ Contact Review & Verification</summary>
        
> Scans your Markdown for every email, phone and link and makes you approve each one explicitly — flagging missing domain extensions, numbers without a country code, links written without `https://`, and URLs hidden behind link text that the ATS parser never reads. Export stays blocked until every item is verified or dismissed.
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/contact-review-and-verify.gif" alt="Contact Review and Verify Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 4 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-cv%20versions-teal" width="125" align="right"/>
      <details open>
        <summary>🗂️ CV Versions per Job Offer</summary>
        
> Keep one tailored CV per position instead of overwriting a single document. Name each version after the offer (<code>Acme · Frontend Engineer</code>), then open, rename, duplicate or delete them independently — each one shows the keywords it adds or removes versus the CV on screen, and can be linked to a real <code>.md</code> file on disk.
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/cv-versions-per-job.gif" alt="CV Versions per Job Offer Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 5 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-local%20AI%20with%20Ollama-8b5cf6" width="125" align="right"/>
      <details open>
        <summary>🤖 ATS Rewriting with Local Ollama</summary>
        
> Select any paragraph or bullet in the preview and let your own <code>Ollama</code> model rewrite it for ATS parsing — same meaning, stronger action verbs, quantified impact. Point the endpoint to <code>http://localhost:11434/v1/chat/completions</code>, pick a model and test the connection: no data ever leaves your machine.
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/ollama-ats-rewriting.gif" alt="ATS Rewriting with Local Ollama Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 6 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-cover--letter-brightgreen" width="125" align="right"/>
      <details open>
        <summary>📄 Cover Letter Generator</summary>
        
> Automatically drafts a tailored, professional cover letter derived from your resume's key achievements and contact information.
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/cover-letter-generator.gif" alt="Cover Letter Generator Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 7 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-export-informational" width="125" align="right"/>
      <details open>
        <summary>📤 Multi-Format Export</summary>
        
> Export to native vector PDF (via jsPDF), Microsoft Word (<code>.docx</code> via OOXML), or Rich Text Format (<code>.rtf</code>).
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/multi-format-export.gif" alt="Multi-Format Export Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>

  <!-- Feature 8 -->
  <tr>
    <td>
      <img src="https://img.shields.io/badge/feature-importer-yellowgreen" width="125" align="right"/>
      <details open>
        <summary>📥 Universal Resume Importer</summary>
        
> Import existing resumes from <code>.pdf</code>, <code>.docx</code>, <code>.txt</code>, <code>.md</code>, or raw text into clean, structured Markdown.
        
  <details>
    <summary>🎥 Demo</summary>
    <p align="center"> 
      <img src="./public/captures/resume-importer.gif" alt="Universal Resume Importer Demo" align="center" width="800" style="border-radius: 12px"/>
    </p>
  </details>
</details>
    </td>
  </tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 & Vite 6 | Fast SPA rendering & modern build pipeline |
| **Styling & UI** | Tailwind CSS 3 + Lucide Icons | Responsive layout, dark mode, CSS custom properties |
| **Markdown Processing** | Marked.js (Custom Renderer) | AST block tagging & bi-directional source mapping |
| **PDF Generation** | jsPDF | Native vector text streams (WinAnsi fallback, standard A4 layout) |
| **ATS Text Extraction** | PDF.js (`pdfjs-dist`) | Worker-based text layer parsing mimicking Workday/Taleo |
| **Word / RTF Export** | `docx` (OOXML) | Native `.docx` block generation and `.rtf` document creation |
| **Testing Suite** | Vitest 5 + React Testing Library | Unit & integration tests for parser, builders, and UI |
| **Deployment / Container** | Docker + Nginx Alpine | Lightweight containerized production distribution |

---

## 📐 Architecture & ATS Pipeline

```mermaid
flowchart TD
    subgraph Editor ["Markdown Workspace"]
        MD[Markdown Source] --> MP[marked Parser + Offset Mapping]
        MP --> PREVIEW[A4 Interactive Preview]
        PREVIEW -. Selection Sync .-> MD
    end

    subgraph PDFEngine ["PDF & Export Layer"]
        MD --> PM[pdfModel.js - Styled Blocks]
        PM --> PB[pdfBuilder.js - jsPDF Vector Stream]
        PB --> PA[pdfArtifact.js - Content-Keyed Cache]
        PA --> EXPORT[Export: PDF / DOCX / RTF]
    end

    subgraph ATSPipeline ["ATS Analyzer Engine (Local)"]
        PA --> PT[pdfText.js - pdf.js Text Layer Extractor]
        PT --> EVAL[atsPdfEvaluation.js - 12 Scoring Rules]
        EVAL --> SCORE[ATS Score % + Detailed Recommendations]
        SCORE --> FIXES[markdownFixes.js - 1-Click Fixes]
        FIXES -. Apply Fix .-> MD
    end
```

### How the ATS Evaluation Works

1. **Vector Document Build**: `pdfModel.js` converts Markdown into structured style blocks. `pdfBuilder.js` renders real vector text via `jsPDF`.
2. **Content-Keyed Caching**: `pdfArtifact.js` caches generated binary blobs based on a hash of the Markdown text and layout settings, ensuring scores and downloads never drift.
3. **Text Layer Extraction**: `pdfText.js` invokes `pdf.js` to extract plain text per page, replicating how Enterprise ATS software (Workday, Taleo, Greenhouse) ingests resumes.
4. **Scoring & Diagnostics**: `atsPdfEvaluation.js` checks 12 metrics: text layer existence, length, contact info, section structure, Markdown syntax residue, action verbs, metrics/numbers, bullet formatting, keyword density, and text density.
5. **Undoable Pure Fixes**: Detected formatting bugs (e.g. bold hashes, missing email prefix, invalid section headers) trigger single-click fixes applied via pure Markdown string transformations.

### How the Local AI Rewriter Works

The AI assistant is **entirely optional and entirely local**. DownCV never proxies your CV to anyone: it only issues one `POST` request to the endpoint *you* configure, and it talks to Ollama's OpenAI-compatible API, so any local runtime exposing `/v1/chat/completions` works.

1. **Enable it**: open the **AI Assistant** dialog (sparkles icon or `Ctrl+K` → *Open AI assistant*) and turn on *Enable AI in the preview*.
2. **Configure it**: set the endpoint (default `http://localhost:11434/v1/chat/completions`), the model name and, if your runtime requires it, an API key. Press **Test connection** to confirm the model answers.
3. **Select and rewrite**: highlight any paragraph, bullet or heading in the A4 preview and press **Improve with AI**. DownCV first offers instant offline suggestions from `enhanceBulletPoint()` (weak-verb replacement, metric detection), then **Generate with Ollama** asks your model to rewrite the fragment keeping the exact same meaning but with stronger action verbs and quantified impact.
4. **Apply it**: the answer arrives as one more suggestion; clicking it replaces only the selected range in the Markdown, so it stays undoable with `Ctrl+Z`.

The system prompt (`aiEnhancer.js`) is set to *"You are an expert ATS resume writer and career coach"*, and the request is stripped of quotes so the result can be pasted straight back into the document.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 22.0.0
- **npm** >= 9.0.0

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AcoranGonzalezMoray/DownCV.git
   cd DownCV
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Run tests**:
   ```bash
   npm run test:run
   ```

5. **Lint and format code**:
   ```bash
   npm run lint
   npm run format
   ```

### Optional: Enable the Local AI Rewriter

The ATS rewriter needs a local model runtime. With [Ollama](https://ollama.com):

```bash
ollama serve            # start the server (default port 11434)
ollama pull llama3      # or any other chat model you prefer
```

Then in DownCV open the **AI Assistant** dialog, enable it, and press **Test connection**. Any runtime that speaks the OpenAI `/v1/chat/completions` schema (Ollama, LM Studio, llama.cpp server, vLLM…) works by changing the endpoint.

---

## 🐳 Docker Setup

DownCV can be easily containerized and served using Nginx.

### Using Docker Compose

```bash
docker compose up -d --build
```
Access DownCV in your browser at `http://localhost:8080`.

### Manual Docker Build

```bash
docker build -t down-cv .
docker run -d -p 8080:80 down-cv
```

---

## 📂 Project Structure

```
DownCV/
├── public/                 # Static assets, app icons & PWA manifest
├── src/
│   ├── components/         # React components
│   │   ├── ATSAnalyzer.jsx       # ATS score display, recommendations, 1-click fixes
│   │   ├── AIAssistantModal.jsx  # Ollama endpoint / model settings & connection test
│   │   ├── AiRewritePopover.jsx  # AI rewrite suggestions popover
│   │   ├── ContactWarnings.jsx   # Unverified email/phone/link banner & validator
│   │   ├── CoverLetterModal.jsx  # Cover letter generator & PDF exporter
│   │   ├── CVPreview.jsx         # A4 paper preview with direct formatting tools
│   │   ├── ExportMenu.jsx        # Dropdown menu for PDF, DOCX, RTF, PNG, JSON, HTML
│   │   ├── ImportModal.jsx       # Import PDF, DOCX, TXT, or MD into Markdown
│   │   ├── MarkdownEditor.jsx    # Caret shortcuts, sample CVs, search, draft history
│   │   ├── StyleControls.jsx     # Font, color palette, margin, line height & layout presets
│   │   ├── ThemeToggle.jsx       # Dark / light mode toggle
│   │   └── VariantsPanel.jsx     # Named CV versions per job offer & local .md file
│   ├── data/               # Static seed data & i18n strings
│   │   ├── sampleCVs.js         # Ready-to-edit sample CVs per language
│   │   ├── snippets.js          # Reusable section snippets
│   │   ├── templates.js         # Layout template presets
│   │   └── translations.js      # English & Spanish UI strings
│   ├── hooks/              # Custom React hooks
│   │   ├── useContactVerification.js # Verification logic for email/phone/URLs
│   │   ├── useKeyboardShortcuts.js   # Global hotkeys (Ctrl+S, Ctrl+Z, etc.)
│   │   ├── useLocalFile.js           # File System Access API .md linking
│   │   ├── useLocalStorage.js        # Synced localStorage state
│   │   └── useMarkdownHistory.js     # Pure undo/redo state stack
│   ├── utils/              # Pure business logic & formatting modules
│   │   ├── aiEnhancer.js        # Local bullet enhancer + Ollama OpenAI-compatible client
│   │   ├── atsPdfEvaluation.js   # Main ATS evaluation orchestration
│   │   ├── atsScorer.js          # Action verbs, metrics lexicons & rules
│   │   ├── contactScan.js        # Contact parser & regex scanner
│   │   ├── coverLetter.js        # Template logic for cover letter creation
│   │   ├── cvImport.js           # Converter from arbitrary text to clean MD
│   │   ├── cvVariants.js         # CV version creation & keyword diffing
│   │   ├── docxGenerator.js      # OOXML (.docx) and RTF document exporter
│   │   ├── jobMatcher.js         # Job description keyword match score
│   │   ├── jsonResume.js         # JSON Resume (jsonresume.org) import/export
│   │   ├── markdownFixes.js      # Pure 1-click Markdown issue resolution
│   │   ├── markdownParser.js     # marked AST parser with source line offsets
│   │   ├── pdfBuilder.js         # Vector PDF rendering engine using jsPDF
│   │   └── pdfText.js            # pdf.js text layer reader worker
│   ├── App.jsx             # Main application layout & state coordinator
│   └── main.jsx            # Application entry point
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Local Docker configuration
└── vite.config.js          # Vite build configuration
```

---

## 🗺️ Roadmap & Improvement Plan

We have an active product roadmap! Check out our planned features and technical improvements:
- 🎨 **Multi-column & Visual Template System** (Sidebar skills/contacts vs main timeline).
- 🌍 **More languages**: the UI is fully translated to English and Spanish today; French, German and Portuguese are next.
- 🧩 **Plugin-style ATS rule packs**: let users define their own scoring rules as JSON instead of hardcoding them.
- 🧪 **Snapshot tests for the generated PDF text layer**, to lock the ATS score against regressions.
- ⌨️ **Richer keyboard navigation** across the preview, the variants panel and the command palette.

---

## 🤝 Contributing

Contributions are warmly welcomed! Whether you want to fix a bug, add a new ATS scoring rule, translate to a new language, or suggest a feature:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Ensure tests and linting pass (`npm run lint && npm run test:run`).
5. Push to the branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

<p align="center">
  Crafted with ❤️ for privacy and career success.
</p>
