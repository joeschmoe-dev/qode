// Current problem state
let currentProblem = null;

// DOM elements
const problemTypeSelect = document.getElementById("problem-type");
const difficultySelect = document.getElementById("difficulty");
const specialConstraintsInput = document.getElementById("special-constraints");
const generateBtn = document.getElementById("generate-btn");
const generateSpinner = document.getElementById("generate-spinner");
const generateText = document.getElementById("generate-text");
const submitBtn = document.getElementById("submit-btn");
const submitSpinner = document.getElementById("submit-spinner");
const submitText = document.getElementById("submit-text");
const errorToast = document.getElementById("error-toast");
const errorMessage = document.getElementById("error-message");

const problemSection = document.getElementById("problem-section");
const solutionSection = document.getElementById("solution-section");
const feedbackSection = document.getElementById("feedback-section");

const problemTitle = document.getElementById("problem-title");
const problemDifficulty = document.getElementById("problem-difficulty");
const problemDescription = document.getElementById("problem-description");
const problemExamples = document.getElementById("problem-examples");
const problemConstraints = document.getElementById("problem-constraints");
const problemStarter = document.getElementById("problem-starter");
const codeEditor = document.getElementById("code-editor");
const explanation = document.getElementById("explanation");
const feedbackContent = document.getElementById("feedback-content");

// Utility functions
function showError(msg) {
  errorMessage.textContent = msg;
  errorToast.classList.remove("hidden");
  setTimeout(() => errorToast.classList.add("hidden"), 8000);
}

function setLoading(btn, spinner, text, loading) {
  if (loading) {
    btn.disabled = true;
    spinner.classList.remove("hidden");
    text.textContent = "Generating...";
  } else {
    btn.disabled = false;
    spinner.classList.add("hidden");
    text.textContent = "Generate Challenge";
  }
}

function setSubmitLoading(btn, spinner, text, loading) {
  if (loading) {
    btn.disabled = true;
    spinner.classList.remove("hidden");
    text.textContent = "Evaluating...";
  } else {
    btn.disabled = false;
    spinner.classList.add("hidden");
    text.textContent = "Submit Solution";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Generate problem
generateBtn.addEventListener("click", async () => {
  const difficulty = difficultySelect.value;
  setLoading(generateBtn, generateSpinner, generateText, true);
  errorToast.classList.add("hidden");

  try {
    const problemType = problemTypeSelect.value;
    const constraints = specialConstraintsInput.value.trim();
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty, problem_type: problemType, constraints })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Failed to generate problem");
    }

    const problem = await res.json();
    currentProblem = problem;
    renderProblem(problem);
    solutionSection.classList.remove("hidden");
    feedbackSection.classList.add("hidden");
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(generateBtn, generateSpinner, generateText, false);
  }
});

// Render problem
function renderProblem(problem) {
  problemTitle.textContent = problem.title || "Untitled Problem";

  const diffText = problem.difficulty || "Medium";
  const diffColors = {
    Easy: "bg-green-900/50 text-green-300 border border-green-800",
    Medium: "bg-yellow-900/50 text-yellow-300 border border-yellow-800",
    Hard: "bg-red-900/50 text-red-300 border border-red-800"
  };
  problemDifficulty.textContent = diffText;
  problemDifficulty.className = `text-xs font-medium px-2.5 py-1 rounded-full mt-1 inline-block ${diffColors[diffText] || diffColors.Medium}`;

  // Description - render basic markdown-style formatting
  problemDescription.innerHTML = formatDescription(problem.description || "");

  // Examples
  problemExamples.innerHTML = "";
  if (problem.examples && problem.examples.length > 0) {
    problem.examples.forEach((ex, i) => {
      const div = document.createElement("div");
      div.className = "bg-dark-950 border border-dark-800 rounded-lg p-4";
      let html = `<div class="text-sm font-medium text-dark-300 mb-2">Example ${i + 1}</div>`;
      html += `<div class="text-sm space-y-1"><code class="text-blue-300">Input:</code> <span class="text-dark-200">${escapeHtml(JSON.stringify(ex.input))}</span></div>`;
      html += `<div class="text-sm"><code class="text-blue-300">Output:</code> <span class="text-green-400">${escapeHtml(JSON.stringify(ex.output))}</span></div>`;
      if (ex.explanation) {
        html += `<div class="text-sm mt-2 pt-2 border-t border-dark-800"><code class="text-dark-500">Explanation:</code> <span class="text-dark-400">${escapeHtml(ex.explanation)}</span></div>`;
      }
      div.innerHTML = html;
      problemExamples.appendChild(div);
    });
  }

  // Constraints
  problemConstraints.innerHTML = "";
  if (problem.constraints && problem.constraints.length > 0) {
    problem.constraints.forEach(c => {
      const li = document.createElement("li");
      li.className = "text-sm text-dark-400 flex items-start gap-2";
      li.innerHTML = `<span class="text-dark-600 mt-1">•</span><span>${escapeHtml(c)}</span>`;
      problemConstraints.appendChild(li);
    });
  }

  // Starter code
  const starterCode = problem.starter_code || problem.function_signature || "";
  problemStarter.querySelector("code").textContent = starterCode;

  problemSection.classList.remove("hidden");

  // Scroll to problem
  problemSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatDescription(text) {
  // Basic formatting: bold, code, newlines
  let html = escapeHtml(text);

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong class=\"text-dark-100\">$1</strong>");

  // Inline code
  html = html.replace(/`(.*?)`/g, "<code class=\"bg-dark-800 text-green-300 px-1.5 py-0.5 rounded text-xs font-mono\">$1</code>");

  // Line breaks to paragraphs
  html = html.replace(/\n\n/g, "</p><p class=\"mt-3\">");
  html = html.replace(/\n/g, "<br>");
  html = `<p class="mt-3">${html}</p>`;

  return html;
}

// Submit solution
submitBtn.addEventListener("click", async () => {
  const code = codeEditor.value.trim();
  const expl = explanation.value.trim();

  if (!code) {
    showError("Please write your solution before submitting.");
    return;
  }

  setSubmitLoading(submitBtn, submitSpinner, submitText, true);
  errorToast.classList.add("hidden");

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        explanation: expl,
        problem: currentProblem
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Evaluation failed" }));
      throw new Error(err.error || "Failed to evaluate solution");
    }

    const feedback = await res.json();
    renderFeedback(feedback);
    feedbackSection.classList.remove("hidden");
  } catch (err) {
    showError(err.message);
  } finally {
    setSubmitLoading(submitBtn, submitSpinner, submitText, false);
  }
});

// Render feedback
function renderFeedback(fb) {
  // Determine styling based on verdict
  const isPass = fb.verdict === "Pass" || fb.is_correct === true;
  const borderColor = isPass ? "border-green-700" : (fb.verdict === "Needs Improvement" ? "border-yellow-700" : "border-red-700");
  const bgColor = isPass ? "bg-green-950/30" : (fb.verdict === "Needs Improvement" ? "bg-yellow-950/30" : "bg-red-950/30");
  const iconColor = isPass ? "text-green-400" : (fb.verdict === "Needs Improvement" ? "text-yellow-400" : "text-red-400");

  let html = `<div class="bg-dark-900 border ${borderColor} rounded-xl overflow-hidden">`;

  // Header
  html += `<div class="border-b border-dark-800 px-6 py-4 flex items-center gap-3">`;
  if (isPass) {
    html += `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  } else {
    html += `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  }
  html += `<div>`;
  html += `<h3 class="text-lg font-semibold text-white">${fb.verdict || "Evaluation Complete"}</h3>`;
  html += `</div></div>`;

  // Content
  html += `<div class="px-6 py-5 space-y-5">`;

  // Feedback text
  if (fb.feedback) {
    html += `<div>`;
    html += `<h4 class="text-sm font-medium text-dark-400 uppercase tracking-wider mb-2">Feedback</h4>`;
    html += `<div class="text-dark-200 leading-relaxed whitespace-pre-wrap">${escapeHtml(fb.feedback)}</div>`;
    html += `</div>`;
  }

  // Complexity
  html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
  html += `<div class="bg-dark-950 border border-dark-800 rounded-lg p-4">`;
  html += `<div class="text-xs font-medium text-dark-500 uppercase mb-1">Time Complexity</div>`;
  html += `<div class="text-blue-300 font-mono text-sm">${escapeHtml(fb.time_complexity || "N/A")}</div>`;
  html += `</div>`;
  html += `<div class="bg-dark-950 border border-dark-800 rounded-lg p-4">`;
  html += `<div class="text-xs font-medium text-dark-500 uppercase mb-1">Space Complexity</div>`;
  html += `<div class="text-blue-300 font-mono text-sm">${escapeHtml(fb.space_complexity || "N/A")}</div>`;
  html += `</div></div>`;

  // Improvements
  if (fb.improvements && fb.improvements.length > 0) {
    html += `<div>`;
    html += `<h4 class="text-sm font-medium text-dark-400 uppercase tracking-wider mb-2">Suggested Improvements</h4>`;
    html += `<ul class="space-y-2">`;
    fb.improvements.forEach(imp => {
      html += `<li class="flex items-start gap-2 text-sm text-dark-300"><span class="text-accent-400 mt-0.5">→</span><span>${escapeHtml(imp)}</span></li>`;
    });
    html += `</ul></div>`;
  }

  // Ideal approach
  if (fb.ideal_approach) {
    html += `<div class="bg-accent-950/30 border border-accent-900 rounded-lg p-4">`;
    html += `<h4 class="text-sm font-medium text-accent-300 uppercase tracking-wider mb-2">Ideal Approach</h4>`;
    html += `<p class="text-dark-300 text-sm leading-relaxed">${escapeHtml(fb.ideal_approach)}</p>`;
    html += `</div>`;
  }

  html += `</div></div>`;
  feedbackContent.innerHTML = html;

  // Scroll to feedback
  feedbackSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
