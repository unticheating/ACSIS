/** Shared Monaco options for exam coding answers (no autocomplete). */
export const MONACO_EXAM_EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: 'off',
  parameterHints: { enabled: false },
  tabCompletion: 'off',
  acceptSuggestionOnEnter: 'off',
  hover: { enabled: false },
  links: false,
}

export function monacoThemeForApp(theme) {
  return theme === 'dark' ? 'vs-dark' : 'vs-light'
}

export function normalizeCodingLanguage(lang) {
  const raw = String(lang || 'javascript').toLowerCase()
  const map = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    py: 'python',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    csharp: 'csharp',
    'c#': 'csharp',
    vb: 'vb',
    'vb.net': 'vb',
    php: 'php',
    html: 'html',
    css: 'css',
    xml: 'xml',
    sql: 'sql',
  }
  return map[raw] || raw
}
