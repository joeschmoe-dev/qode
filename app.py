from flask import Flask, render_template, request, jsonify
import requests
import markdown
import logging
import json as json_lib
from config import AI_ENDPOINT, AI_API_KEY, AI_MODEL, MAX_TOKENS

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

HEADERS = {
    "Authorization": f"Bearer {AI_API_KEY}",
    "Content-Type": "application/json"
}

GENERATE_SYSTEM_PROMPT = """You are an expert coding interview problem creator. Generate a LeetCode/HackerRank style coding problem.

Return your response in this exact JSON format (no extra text, no markdown code fences):
{
  "title": "problem title",
  "description": "Full problem description with context",
  "examples": [
    {
      "input": {"param1": value1, "param2": value2},
      "output": result,
      "explanation": "why this is the correct output"
    }
  ],
  "constraints": ["constraint1", "constraint2"],
  "difficulty": "Easy/Medium/Hard",
  "starter_code": "def solution(): pass",
  "function_signature": "def solution(arr: list[int]) -> int:"
}

Make the problem interesting and well-defined. Include 2-3 examples. Only output valid JSON - no preamble, no markdown formatting, no code fences."""

EVALUATE_SYSTEM_PROMPT = """You are an expert coding interview reviewer. Evaluate the candidate's solution.

Return your response in this exact JSON format (no extra text, no markdown code fences):
{
  "is_correct": true/false,
  "verdict": "Pass | Needs Improvement | Incorrect",
  "feedback": "detailed feedback - what's right, what's wrong, edge cases missed",
  "time_complexity": "O(n) or whatever it is",
  "space_complexity": "O(1) or whatever it is",
  "improvements": ["suggestion1", "suggestion2"],
  "ideal_approach": "Brief description of the optimal solution"
}

Be constructive and thorough. If correct, praise and suggest optimizations. If incorrect, explain what's wrong and hint at the right direction."""


def call_ai(messages, force_json=True):
    """Call the openai-compatible chat completions endpoint."""
    url = f"{AI_ENDPOINT}/chat/completions"
    payload = {
        "model": AI_MODEL,
        "messages": messages,
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
        "response_format": {"type": "json_object"} if force_json else {"type": "text"}
    }

    logger.info(f"Calling AI: {url} | model={AI_MODEL} | force_json={force_json}")
    logger.info(f"API_KEY set: {bool(AI_API_KEY)} | key_length={len(AI_API_KEY)}")

    try:
        resp = requests.post(url, json=payload, headers=HEADERS, timeout=300)
        logger.info(f"Response status: {resp.status_code}")

        if resp.status_code != 200:
            logger.error(f"AI returned {resp.status_code}")
            logger.error(f"Response body: {resp.text[:2000]}")
            return None

        data = resp.json()
        if "choices" in data and len(data["choices"]) > 0:
            content = data["choices"][0]["message"]["content"]
            logger.info(f"Got response: {len(content)} chars")
            return content
        else:
            logger.error(f"Bad response structure: {json_lib.dumps(data)[:1000]}")
            return None
    except requests.exceptions.Timeout:
        logger.error("Request timed out")
        return None
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error: {e}")
        return None
    except Exception as e:
        logger.error(f"call_ai failed: {type(e).__name__}: {e}")
        logger.error(f"Payload: {json_lib.dumps(payload, default=str)[:1000]}")
        return None


def extract_json(text):
    """
    Robust JSON extraction with multiple fallback strategies.
    This is what serious AI harnesses do - they never trust a single parse attempt.
    """
    import re

    text = text.strip()

    # Strategy 1: Try direct parse
    try:
        result = json_lib.loads(text)
        logger.debug("Strategy 1: Direct parse succeeded")
        return result
    except json_lib.JSONDecodeError:
        pass

    # Strategy 2: Strip markdown fences
    if "```" in text:
        match = re.search(r"```(?:json)?\s*\n([\s\S]*?)\n\s*```", text)
        if match:
            try:
                result = json_lib.loads(match.group(1).strip())
                logger.debug("Strategy 2: Parsed from markdown fence")
                return result
            except json_lib.JSONDecodeError:
                pass

    # Strategy 3: Find first { and last } in text, try to parse that chunk
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace + 1]
        try:
            result = json_lib.loads(candidate)
            logger.debug("Strategy 3: Extracted from brace positions")
            return result
        except json_lib.JSONDecodeError:
            pass

    # Strategy 4: Fix common JSON issues
    if first_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace:last_brace + 1]

        # Fix single quotes to double quotes
        fixed = candidate.replace("'", '"')
        try:
            result = json_lib.loads(fixed)
            logger.debug("Strategy 4a: Fixed single quotes")
            return result
        except json_lib.JSONDecodeError:
            pass

        # Fix trailing commas
        fixed = re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            result = json_lib.loads(fixed)
            logger.debug("Strategy 4b: Fixed trailing commas")
            return result
        except json_lib.JSONDecodeError:
            pass

        # Fix unquoted keys
        fixed = re.sub(r'([{,])\s*(\w+)\s*:', r'\1 "\2":', candidate)
        try:
            result = json_lib.loads(fixed)
            logger.debug("Strategy 4c: Fixed unquoted keys")
            return result
        except json_lib.JSONDecodeError:
            pass

        # Fix None/True/False to null/true/false
        fixed = re.sub(r'\bNone\b', 'null', candidate)
        fixed = re.sub(r'\bTrue\b', 'true', fixed)
        fixed = re.sub(r'\bFalse\b', 'false', fixed)
        try:
            result = json_lib.loads(fixed)
            logger.debug("Strategy 4d: Fixed Python literals")
            return result
        except json_lib.JSONDecodeError:
            pass

    # Strategy 5: Try json-repair if available
    try:
        import json_repair
        result = json_repair.loads(text)
        if result:
            logger.debug("Strategy 5: json-repair succeeded")
            return result
    except ImportError:
        pass

    raise json_lib.JSONDecodeError(f"All strategies failed. Raw text (first 500): {text[:500]}", text, 0)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate():
    difficulty = request.json.get("difficulty", "Medium")
    problem_type = request.json.get("problem_type", "")
    constraints = request.json.get("constraints", "")
    logger.info(f"Generate request: difficulty={difficulty}, type={problem_type}, constraints={constraints}")
    logger.info(f"Request JSON: {request.json}")
    logger.info(f"AI_ENDPOINT={AI_ENDPOINT}")
    logger.info(f"AI_MODEL={AI_MODEL}")
    logger.info(f"AI_API_KEY length={len(AI_API_KEY) if AI_API_KEY else 0}")

    parts = [f"Generate a {difficulty} difficulty coding problem."]
    if problem_type:
        parts.append(f"The problem should be based on the '{problem_type}' pattern/technique.")
    if constraints:
        parts.append(f"Special constraint: {constraints}")
    user_prompt = " ".join(parts)
    messages = [
        {"role": "system", "content": GENERATE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    try:
        raw_response = call_ai(messages)
        if raw_response is None:
            logger.error("call_ai returned None - AI request failed")
            return jsonify({"error": "AI request failed"}), 500

        logger.info(f"Raw AI response (first 500 chars): {raw_response[:500]}")

        try:
            problem = extract_json(raw_response)
            logger.info(f"Parsed problem: {problem.get('title', 'NO TITLE')}")
            return jsonify(problem)
        except Exception as e:
            logger.warning(f"Failed to parse JSON from AI response: {e}")
            return jsonify({
                "title": "Generated Problem",
                "description": raw_response,
                "examples": [],
                "constraints": [],
                "difficulty": difficulty,
                "starter_code": "",
                "function_signature": ""
            })
    except Exception as e:
        logger.error(f"Error in generate endpoint: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/evaluate", methods=["POST"])
def evaluate():
    try:
        code = request.json.get("code", "")
        explanation = request.json.get("explanation", "")
        problem = request.json.get("problem", {})
        difficulty = problem.get("difficulty", "Medium")

        logger.info(f"Evaluate request: problem_title={problem.get('title', 'N/A')}, code_length={len(code)}, explanation_length={len(explanation)}")

        user_prompt = f"""Problem: {problem.get('title', 'Unknown')}
Description: {problem.get('description', '')}
Function Signature: {problem.get('function_signature', '')}
Constraints: {'; '.join(problem.get('constraints', []))}
Examples: {json_lib.dumps(problem.get('examples', []), default=str)}

Code:
```python
{code}
```

Explanation:
{explanation}

Evaluate this solution for the problem above."""

        messages = [
            {"role": "system", "content": EVALUATE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]

        raw_response = call_ai(messages)
        if raw_response is None:
            logger.error("call_ai returned None in evaluate")
            return jsonify({"error": "AI request failed"}), 500

        logger.info(f"Raw AI response (first 500 chars): {raw_response[:500]}")

        try:
            feedback = extract_json(raw_response)
            logger.info(f"Evaluation complete: verdict={feedback.get('verdict', 'N/A')}")
            return jsonify(feedback)
        except Exception as e:
            logger.warning(f"Failed to parse JSON from evaluate response: {e}")
            return jsonify({
                "is_correct": False,
                "verdict": "Unable to evaluate",
                "feedback": raw_response,
                "time_complexity": "N/A",
                "space_complexity": "N/A",
                "improvements": [],
                "ideal_approach": ""
            })
    except Exception as e:
        logger.error(f"Error in evaluate endpoint: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
