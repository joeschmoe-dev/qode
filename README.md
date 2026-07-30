# Qode

An AI-powered coding challenge platform. Generate LeetCode-style problems, write solutions, get instant feedback, and learn with guided hints — all driven by a single OpenAI-compatible API endpoint.

## Features

- **Dynamic Problem Generation** — Generate problems on demand by difficulty (Easy/Medium/Hard), topic (Arrays, Trees, DP, Graphs, etc.), or with custom constraints (e.g. *"must be solvable in O(n)"*).
- **Instant Solution Evaluation** — Submit your Python solution along with an explanation. The AI reviews correctness, identifies edge cases, analyzes time/space complexity, and suggests improvements.
- **Guided AI Help** — A sidebar chat that can see your current code and the problem context. It gives hints and conceptual guidance without ever solving the problem for you.
- **Surrender Mode** — Stuck? Get a thorough educational breakdown of how to think about the problem, what patterns to look for, and the algorithmic approach — not just the answer.
- **No Page Refreshes** — Everything is fetched asynchronously. Problems appear instantly, feedback slides in, chat streams in a sidebar.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, `requests` |
| Frontend | Vanilla HTML/JS, TailwindCSS (CDN) |
| AI | OpenAI-compatible endpoint (GPT-4o, local models, etc.) |
| JSON | Custom multi-strategy extractor with `response_format` enforcement |

## Project Structure

```
qode/
├── app.py                # Flask server, 4 API endpoints, AI client
├── config.py             # AI endpoint, API key, model config
├── requirements.txt      # Dependencies
├── .env                  # Your environment variables (gitignored)
├── templates/
│   └── index.html        # Main page — dark-themed UI with Tailwind
└── static/
    ├── css/styles.css    # Custom scrollbar, animations, tab support
    └── js/app.js         # Async fetch logic, rendering, chat sidebar
```

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure your AI endpoint:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   AI_ENDPOINT=https://api.openai.com/v1
   AI_API_KEY=your-api-key-here
   AI_MODEL=gpt-4o
   ```

   The endpoint supports any OpenAI-compatible API (Ollama, vLLM, LM Studio, etc.).

3. **Run the server:**
   ```bash
   python app.py
   ```
   Open `http://localhost:5000`.

## How It Works

### Architecture

```
Browser          Flask Server         OpenAI-Compatible API
  |                   |                        |
  |--- Generate ---->|--- chat/completions -->|
  |<-- JSON problem --|<-- raw response --------|
  |                   |                        |
  |--- Evaluate ----->|--- chat/completions -->|
  |<-- feedback ------|<-- raw response --------|
  |--- Help --------->|--- chat/completions -->|
  |<-- hints ---------|<-- raw response --------|
  |--- Surrender ---->|--- chat/completions -->|
  |<-- explanation ---|<-- raw response --------|
```

### JSON Parsing Strategy

The AI is instructed to return strict JSON via `response_format: {"type": "json_object"}`, but fallback strategies are in place for robustness:

1. Direct `json.loads()`
2. Markdown fence stripping (```json ... ```)
3. Brace-position extraction (first `{` to last `}`)
4. Auto-fixes: single quotes, trailing commas, unquoted keys, Python literals
5. `json-repair` library if available

### System Prompts

Four distinct prompts are used, each with a different role:

| Endpoint | Prompt Role | Output Format |
|---|---|---|
| `/api/generate` | Problem creator | Structured JSON |
| `/api/evaluate` | Solution reviewer | Structured JSON |
| `/api/help` | Patient tutor | Free text (hints only) |
| `/api/surrender` | Educational explainer | Free text (full breakdown) |

The help prompt enforces strict rules against giving full solutions. The surrender prompt provides comprehensive educational content instead.

## API Reference

### `POST /api/generate`

```json
// Request
{ "difficulty": "Medium", "problem_type": "Dynamic Programming", "constraints": "O(n) time" }

// Response
{
  "title": "Minimum Path Sum",
  "description": "Given a m x n grid...",
  "examples": [{ "input": { "grid": [[1,3,1],[1,5,1],[4,2,1]] }, "output": 7, "explanation": "..." }],
  "constraints": ["m == n == 100", "0 <= grid[i][j] <= 100"],
  "difficulty": "Medium",
  "starter_code": "def minPathSum(grid: list[list[int]]) -> int:",
  "function_signature": "def minPathSum(grid: list[list[int]]) -> int:"
}
```

### `POST /api/evaluate`

```json
// Request
{
  "code": "def minPathSum(grid):\n    ...",
  "explanation": "I use dynamic programming...",
  "problem": { /* same as generate response */ }
}

// Response
{
  "is_correct": true,
  "verdict": "Pass",
  "feedback": "Great use of in-place DP...",
  "time_complexity": "O(m*n)",
  "space_complexity": "O(1)",
  "improvements": ["Consider handling empty grid edge case"],
  "ideal_approach": "In-place DP is optimal here..."
}
```

### `POST /api/help`

```json
// Request
{ "message": "How do I think about this grid problem?", "problem": { ... }, "code": "..." }

// Response
{ "response": "Great question. This is a classic DP on grids..." }
```

### `POST /api/surrender`

```json
// Request
{ "problem": { ... } }

// Response
{ "response": "Here's how to think about this problem..." }
```

## Design Decisions

- **Vanilla JS over frameworks** — No build step, no dependencies, instant page load. The UI is simple enough that React would add overhead without benefit.
- **Tailwind CDN** — No build pipeline needed for a portfolio project. Styles load instantly.
- **Single Python file backend** — All routes and prompts in one file. Easy to read, modify, and deploy.
- **`response_format` enforcement** — The OpenAI API parameter that forces JSON-only output is the single most important reliability improvement for structured AI responses.
- **No test execution** — Evaluation is AI-based, not automated. The AI judges correctness based on the problem description and the user's code. This keeps the setup simple — no sandboxing, no test runner infrastructure.
