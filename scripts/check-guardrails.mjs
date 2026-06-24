import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()

const checks = [
  checkFrontendInterfaces,
  checkCssPlanningReferences,
  checkLandingInlineStaticData,
  checkLandingLayoutZIndex,
]

const failures = []

for (const check of checks) {
  failures.push(...(await check()))
}

if (failures.length > 0) {
  console.error('Guardrail violations found:')
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} ${failure.message}`)
  }
  process.exit(1)
}

console.log('Guardrails passed.')

async function checkFrontendInterfaces() {
  const files = await findFiles('apps/web', ['.ts', '.tsx'])
  const violations = []

  for (const file of files) {
    if (file.endsWith('next-env.d.ts')) continue

    const content = await readText(file)
    const matches = content.matchAll(
      /^\s*(?:export\s+)?interface\s+[A-Za-z_$][\w$]*/gm
    )

    for (const match of matches) {
      violations.push({
        file,
        line: lineNumber(content, match.index ?? 0),
        message: 'Use TypeScript `type` aliases for frontend object shapes.',
      })
    }
  }

  return violations
}

async function checkCssPlanningReferences() {
  const files = await findFiles('apps/web', ['.css'])
  const forbidden = [
    /\bOpenSpec\b/,
    /\bopenspec\b/,
    /\bSDD\b/,
    /\bLAND-[A-Za-z0-9-]*/,
    /\bspec requirement\b/i,
    /\btask reference\b/i,
  ]
  const violations = []

  for (const file of files) {
    const content = await readText(file)

    for (const pattern of forbidden) {
      for (const match of content.matchAll(new RegExp(pattern, 'gi'))) {
      violations.push({
        file,
        line: lineNumber(content, match.index),
        message: `Remove internal planning reference: ${match[0]}`,
      })
      }
    }
  }

  return violations
}

async function checkLandingInlineStaticData() {
  const files = await findFiles('apps/web/components/landing', ['.tsx'], {
    recursive: false,
  })
  const violations = []

  for (const file of files) {
    const content = await readText(file)
    const declarations = findConstLiteralDeclarations(content)

    for (const declaration of declarations) {
      if (!looksLikeStaticData(declaration.literal)) continue

      violations.push({
        file,
        line: lineNumber(content, declaration.index),
        message:
          'Move feature-local static landing data to apps/web/components/landing/data/.',
      })
    }
  }

  return violations
}

async function checkLandingLayoutZIndex() {
  const files = [
    ...(await findFiles('apps/web/app', ['.ts', '.tsx'])),
    ...(await findFiles('apps/web/components/landing', ['.ts', '.tsx'])),
    ...(await findFiles('apps/web/components/layout', ['.ts', '.tsx'])),
  ]
  const classPattern =
    /(?:^|[\s"'`])(?:[A-Za-z0-9!_\-[\]=]+:)*-?z-(?:\[[^\]]+\]|\d+)\b/g
  const stylePattern = /\bzIndex\s*:/g
  const violations = []

  for (const file of files) {
    const content = await readText(file)

    for (const match of content.matchAll(classPattern)) {
      violations.push({
        file,
        line: lineNumber(content, match.index ?? 0),
        message:
          'Use semantic z-index tokens instead of arbitrary or numeric Tailwind z classes.',
      })
    }

    for (const match of content.matchAll(stylePattern)) {
      violations.push({
        file,
        line: lineNumber(content, match.index ?? 0),
        message: 'Use semantic z-index tokens instead of inline zIndex styles.',
      })
    }
  }

  return violations
}

async function findFiles(relativeDir, extensions, options = {}) {
  const dir = path.join(root, relativeDir)
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(relativeDir, entry.name)

    if (entry.isDirectory()) {
      if (options.recursive === false) continue
      if (
        [
          '.next',
          'coverage',
          'node_modules',
          'playwright-report',
          'test-results',
        ].includes(entry.name)
      ) {
        continue
      }
      files.push(...(await findFiles(entryPath, extensions, options)))
      continue
    }

    if (extensions.includes(path.extname(entry.name))) {
      files.push(normalizePath(entryPath))
    }
  }

  return files
}

async function readText(relativeFile) {
  return readFile(path.join(root, relativeFile), 'utf8')
}

function findConstLiteralDeclarations(content) {
  const declarations = []
  const pattern =
    /(?:export\s+)?const\s+[A-Za-z_$][\w$]*(?:\s*:[^=]+)?\s*=\s*([\[{])/g

  for (const match of content.matchAll(pattern)) {
    const literalStart = (match.index ?? 0) + match[0].length - 1
    const literal = readBalancedLiteral(content, literalStart)

    if (literal) {
      declarations.push({ index: match.index ?? 0, literal })
    }
  }

  return declarations
}

function readBalancedLiteral(content, start) {
  const opener = content[start]
  const closer = opener === '[' ? ']' : '}'
  let depth = 0
  let quote = null

  for (let index = start; index < content.length; index += 1) {
    const char = content[index]
    const previous = content[index - 1]

    if (quote) {
      if (char === quote && previous !== '\\') quote = null
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }

    if (char === opener) depth += 1
    if (char === closer) depth -= 1

    if (depth === 0) return content.slice(start, index + 1)
  }

  return null
}

function looksLikeStaticData(literal) {
  if (!literal.includes('\n')) return false

  const lines = literal.split('\n').length
  const nestedObjectEntries = [...literal.matchAll(/(^|,)\s*\{/g)].length
  const topLevelObjectProperties = [
    ...literal.matchAll(/^\s{2,}[A-Za-z_$][\w$-]*:\s/gm),
  ].length

  if (literal.startsWith('[')) {
    return lines >= 4 && nestedObjectEntries >= 2
  }

  return (
    lines >= 8 && (nestedObjectEntries >= 2 || topLevelObjectProperties >= 4)
  )
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}
