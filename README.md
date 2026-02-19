# Smart Duplicate Finder 💎🧠

> **"Clarity for your Digital Space."**

A premium, privacy-first application to find and remove duplicate files with surgical precision. Combining **SHA-256 Digital DNA** analysis with **AI-Visual Recognition**, it finds duplicates that others miss.

![UI Preview](https://via.placeholder.com/800x400.png?text=Smart+Duplicate+Finder+UI)

## ✨ Key Features

### 🔍 Twin Scanning Engines
1.  **Exact Match (Strict)**: Uses `SHA-256` hashing to find 100% byte-for-byte identical files. Safe for documents and backups.
2.  **Visual Match (AI)**: Uses **Perceptual Hashing** to "look" at images. Finds duplicates even if they are:
    *   Resized / Compressed
    *   Converted (PNG ↔ JPG)
    *   Renamed

### 🧠 Hybrid Intelligence
*   **AI Insights**: Get professional storage advice powered by **OpenAI (GPT-4o)** when an API key is provided.
*   **Local Genius**: If offline (or no key), the app switches to a robust local heuristic engine to analyze file types and huge-waster files instantly.

### 📊 Data Visualization Dashboard
*   **Composition Pie**: Visualize "Unique" vs "Wasted" space.
*   **File Type Breakdown**: Are you hoarding Videos, Images, or Docs?
*   **Top Offenders**: Instantly identify the 5 largest duplicate groups.

### 🎨 Premium Experience ("Dark Pastel")
*   **Aurora UI**: A deep slate background with reactive neon gradients (Rose, Mint, Lavender).
*   **Glassmorphism**: Frosted glass cards and buttons.
*   **Interactive Physics**: Deleted files "fall" with gravity effects.
*   **Soundscapes**: Subtle sci-fi audio feedback (can be toggled).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16 or higher)
*   npm (v7 or higher)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/smart-duplicate-finder.git
    cd smart-duplicate-finder
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment (Optional for AI)**:
    *   Create a `.env.local` file in the root.
    *   Add your OpenAI API Key:
        ```env
        OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
        ```
    *   *Note: If skipped, the app will run in "Local Intelligence" mode automatically.*

4.  **Run the App**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS (Custom Dark Pastel Theme)
*   **Logic**: Web Workers (Multithreaded Hashing), OpenAI SDK
*   **Visualization**: Recharts
*   **Physics**: Custom Gravity Engine

## 🔒 Privacy Note
All scanning, hashing, and comparison happens **100% locally** on your device. Your files are **never** uploaded to any server. Only anonymous statistical summaries (e.g., "500MB wasted") are sent to OpenAI if you enable the AI features.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ by Antigravity**
