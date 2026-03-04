<p align="center">
  <img src="public/window.svg" alt="PersonaMixer Logo" width="120" />
</p>

<h1 align="center">PersonaMixer</h1>

<p align="center">
  <strong>A Dual-Engine AI Communication Coach</strong><br/>
  Train, evaluate, and perfect your conversational skills with dynamic AI personas.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a>
</p>

---

![PersonaMixer Screenshot](https://via.placeholder.com/1000x500.png?text=PersonaMixer+Dashboard)
*Replace this with a real screenshot of your app by uploading it to your repo and updating the path!*

## ✨ Features

- **🎭 Dynamic Personas**: Adjust the personality of the AI you are chatting with in real-time using a 5-axis slider system (Professional, Rational, Polite, Funny, Sly).
- **🎙️ Voice & Text Input**: Practice speaking naturally using the built-in speech-to-text integration or type your responses.
- **📊 Real-time Feedback & Evaluation**: An independent AI "Evaluator Engine" analyzes your messages and provides scores, critiques, and better ways to phrase your thoughts.
- **📱 Progressive Web App (PWA)**: Installable directly to your phone or desktop for a native app feel.
- **🔒 Secure Authentication**: Powered by Supabase for safe and reliable user accounts and chat history storage.

## 🛠 Tech Stack

- **Frontend Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security)
- **AI Engines**: [Google Gemini Pro API](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PWA Support**: `next-pwa`

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- A Supabase Project
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MEMO010807/PersonaMixer.git
   cd PersonaMixer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deployment (Vercel)

The easiest way to deploy PersonaMixer is to use the [Vercel Platform](https://vercel.com/new).

1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. Add the three Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) in the Vercel project settings.
4. Click **Deploy**.

Once deployed, visit the URL on your mobile device and select **"Add to Home Screen"** to install it as a native-feeling app!

## 📄 License

This project is licensed under the MIT License.
