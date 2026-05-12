# Lexis Sanctuary – Technical Stack

## Languages
- TypeScript (frontend + backend + config)
- CSS (styling)
- HTML (app entry)
- JSON (project/app configuration)

## Frontend
- React 19
- Vite 6
- Tailwind CSS 4
- Motion (animations)
- Lucide React (icons)
- clsx + tailwind-merge (class composition)
- date-fns (date utilities)

## Backend / Runtime
- Node.js
- Express 4
- tsx (TypeScript runtime for dev server)
- dotenv (environment variables)

## AI / LLM Integrations
- Google Gemini via `@google/genai`
- Additional service adapters present in codebase:
  - ChatGPT service wrapper
  - DeepSeek service wrapper

## Data / Cloud
- Firebase SDK (Firestore + Auth integration)
- Firestore security rules (`firestore.rules`)

## Tooling
- TypeScript 5
- `tsc --noEmit` for lint/type checks
- npm scripts for dev/build/start
