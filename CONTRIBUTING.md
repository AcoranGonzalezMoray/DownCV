# 🤝 Contributing to DownCV

Contributions are warmly welcomed! Whether you want to fix a bug, add a new ATS scoring rule, translate to a new language, or suggest a feature:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Ensure tests and linting pass (`npm run lint && npm run format && npm run test`).
5. Push to the branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

---

## 🧰 Before you start

**Prerequisites**

- **Node.js** >= 22.0.0
- **npm** >= 9.0.0

```bash
npm install     # install the dependencies
npm run dev     # start the dev server at http://localhost:3000
npm run test:run   # run the Vitest suite
npm run lint       # run ESLint
npm run format     # format the source with Prettier
```

---

## ✅ Pull request checklist

- [ ] `npm run lint` passes with no warnings (CI runs it with `--max-warnings 0`).
- [ ] `npm run format:check` passes.
- [ ] `npm run test:run` passes, and new behaviour comes with new tests.
- [ ] `npm run build` completes without new warnings.
- [ ] New user-facing strings are added to **both** `en` and `es` in `src/data/translations.js`.

---

## 🧭 Where to put your change

| If you are changing... | Start in |
|---|---|
| An ATS scoring rule | `src/utils/atsPdfEvaluation.js` and its lexicons in `atsScorer.js` |
| The generated PDF or its text layer | `src/utils/pdfModel.js`, `pdfBuilder.js`, `pdfArtifact.js` |
| Markdown parsing or the bi-directional editor | `src/utils/markdownParser.js`, `src/components/MarkdownEditor.jsx` |
| A one-click fix for a detected problem | `src/utils/markdownFixes.js` (keep the transformations pure) |
| Export formats (`.docx`, `.rtf`, PDF, PNG) | `src/utils/docxGenerator.js`, `pngExport.js` |
| Layout, theme or responsive behaviour | `src/index.css` (see *Design notes* below) |
| UI copy or a new language | `src/data/translations.js`, `src/data/sampleCVs.js` |

---

## 🎨 Design notes

- **Everything runs in the browser.** No CV content may ever leave the device. The only outbound request allowed is the one the user explicitly configures for a local AI runtime (Ollama or any OpenAI-compatible endpoint).
- **Keep the ATS pipeline honest.** The score must come from reading the generated PDF back with `pdf.js`, exactly as a real parser would. Never compute the score from the Markdown source.
- **One source of truth for breakpoints.** Responsive thresholds live as tokens in the `@theme` block of `src/index.css` (for example `--breakpoint-laptop`). Do not introduce literal `min-[…]` widths in components.
- **The topbar is measured, not assumed.** The view switch is centred by a `ResizeObserver` in `src/App.jsx` that toggles `.topbar-switch-centered` / `.topbar-switch-flow`. Do not force the position in CSS.
- **Pure business logic in `src/utils/`**, React presentation in `src/components/`.

---

## 🐛 Reporting a bug

Open an issue with your DownCV version (shown in the startup update badge), your browser, your OS, what you expected to happen, and — when relevant — the Markdown that reproduces it. If it concerns the ATS score, include the generated report (the panel can download it as HTML).

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the **MIT License**. See [`LICENSE`](./LICENSE).
