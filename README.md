# Lexis Sanctuary

Lexis Sanctuary is an AI-powered cognitive sanctuary designed for mastering English vocabulary. It leverages the Gemini AI API for smart word validation, topic classification, and high-quality text-to-speech (TTS) pronunciation. The app uses Firebase for real-time data synchronization and user progress tracking with a Spaced Repetition System (SRS).

## Features

- **AI Vocabulary Validation:** Enter a word and get smart suggestions for IPA, meaning, context, and example sentences.
- **Topic Exploration:** Organize your vocabulary into topics and explore them with detailed views.
- **Flashcards (SRS):** Master your vocabulary using a Spaced Repetition System with interactive flashcards.
- **AI Pronunciation (TTS):** Listen to high-quality AI-generated pronunciations for every word.
- **Real-time Sync:** All your data is synced in real-time across devices using Firebase.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

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

#### Firebase Setup
1. Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Firebase Authentication** (Google Sign-In).
3. Create a web app in your Firebase project and copy the configuration.
4. Create a `firebase-applet-config.json` file in the root directory with your config:
   ```json
   {
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_AUTH_DOMAIN",
     "projectId": "YOUR_PROJECT_ID",
     "storageBucket": "YOUR_STORAGE_BUCKET",
     "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
     "appId": "YOUR_APP_ID",
     "firestoreDatabaseId": "(default)"
   }
   ```
5. Deploy the `firestore.rules` provided in the repository to your Firebase project.

#### Environment Variables
Create a `.env` file in the root directory (you can use `.env.example` as a template):
```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```
*Note: You can get a Gemini API key from [Google AI Studio](https://aistudio.google.com/).*

### 4. Running the Application

#### Development Mode
To start the development server with hot reloading:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

#### Production Mode
To build the app for production and start the server:
```bash
npm run build
npm start
```

## Project Structure

- `/src`: Frontend React application code.
  - `/components`: Reusable UI components.
  - `/hooks`: Custom React hooks (e.g., `useFirebase`).
  - `/services`: Logic for external APIs (Gemini, SRS).
- `server.ts`: Express server entry point (handles API routes and Vite middleware).
- `firestore.rules`: Security rules for the Firestore database.
- `firebase-blueprint.json`: Data structure definition for the application.

## License

This project is licensed under the MIT License.
