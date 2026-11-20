# Lexis Sanctuary

Lexis Sanctuary is a React vocabulary-learning application deployed as one Cloudflare Worker. Static assets, the REST API, Google sign-in, AI validation, and D1 data access share the same origin.

## Features

- **AI Vocabulary Validation:** Enter a word and get smart suggestions for IPA, meaning, context, and example sentences.
- **Skill Context Tags:** Mark vocabulary for Speaking, Writing, or both; AI can recommend contexts and the vocabulary list can be filtered by skill.
- **Topic Selection:** Let AI choose from your existing topics, or search and select a topic manually.
- **Topic Exploration:** Organize your vocabulary into topics and explore them with detailed views.
- **Flashcards (SRS):** Master your vocabulary using a Spaced Repetition System with interactive flashcards.
- **AI Pronunciation (TTS):** Listen to high-quality AI-generated pronunciations for every word.
- **Cached Sync:** TanStack Query updates after mutations and refetches when the browser regains focus.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v22 or later)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Cloudflare account authenticated with the `cf` CLI.

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lexis-sanctuary
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

#### Cloudflare and Google OAuth
1. Create a D1 database and provide its UUID through `CLOUDFLARE_D1_DATABASE_ID` when deploying.
2. Create a Google OAuth web client.
3. Add `<workers-url>/api/auth/callback/google` as its authorized redirect URI.
4. Copy `.env.example` to `.dev.vars` for local secrets, then configure production secrets with `cf workers secret put`.

#### Environment Variables
Create a `.dev.vars` file in the root directory (you can use `.env.example` as a template):
```env
BETTER_AUTH_SECRET=development-only-secret-at-least-32-characters
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
```
Never prefix secrets with `VITE_`; they are used only by the Worker.

### 4. Running the Application

#### Development Mode
To start the development server with hot reloading:
```bash
npm run dev
```
The app will be available at the Vite URL printed by the command (normally `http://localhost:5173`). Before starting it, apply local migrations with `npm run db:migrate:local`.

#### Production deploy
Apply production migrations, set secrets, then deploy:
```bash
cf d1 migrations apply <database-id>
npm run deploy
```

## Project Structure

- `/src`: Frontend React application code.
  - `/components`: Reusable UI components.
  - `/hooks`: TanStack Query-backed app data hooks.
  - `/services`: Browser-only utilities such as speech synthesis.
- `/worker`: Worker API, Better Auth setup, input validation, and D1 query code.
- `/migrations`: Versioned D1 schema migrations.

## License

This project is licensed under the MIT License.
