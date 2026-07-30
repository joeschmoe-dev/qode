// Current problem state
let currentProblem = null;
let starterCode = "";
let editor = null;

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
const codeEditorDiv = document.getElementById("code-editor");
const explanation = document.getElementById("explanation");
const feedbackContent = document.getElementById("feedback-content");
const restartBtn = document.getElementById("restart-btn");
const helpToggle = document.getElementById("help-toggle");
const helpClose = document.getElementById("help-close");
const helpOverlay = document.getElementById("help-overlay");
const helpSidebar = document.getElementById("help-sidebar");
const helpMessages = document.getElementById("help-messages");
const helpForm = document.getElementById("help-form");
const helpInput = document.getElementById("help-input");
const helpSend = document.getElementById("help-send");
const surrenderBtn = document.getElementById("surrender-btn");
const surrenderSection = document.getElementById("surrender-section");
const surrenderResponse = document.getElementById("surrender-response");
const surrenderContent = document.getElementById("surrender-content");

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

// Initialize CodeMirror
function initEditor() {
  editor = CodeMirror(codeEditorDiv, {
    value: "",
    mode: "python",
    theme: "material-darker",
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    lineWrapping: true,
    scrollbarStyle: "simple"
  });
  editor.setSize(null, "22rem");
  editor.refresh();
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
    surrenderSection.classList.remove("hidden");
    surrenderResponse.classList.add("hidden");
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

  problemDescription.innerHTML = formatDescription(problem.description || "");

  problemExamples.innerHTML = "";
  if (problem.examples && problem.examples.length > 0) {
    problem.examples.forEach((ex, i) => {
      const div = document.createElement("div");
      div.className = "bg-dark-900 border border-dark-700 rounded p-4";
      let html = `<div class="text-sm font-medium text-dark-400 mb-2">Example ${i + 1}</div>`;
      html += `<div class="text-sm space-y-1"><span class="text-dark-400">Input:</span> <span class="text-dark-200 font-mono">${escapeHtml(JSON.stringify(ex.input))}</span></div>`;
      html += `<div class="text-sm"><span class="text-dark-400">Output:</span> <span class="text-dark-200 font-mono">${escapeHtml(JSON.stringify(ex.output))}</span></div>`;
      if (ex.explanation) {
        html += `<div class="text-sm mt-2 pt-2 border-t border-dark-700"><span class="text-dark-500">Explanation:</span> <span class="text-dark-400">${escapeHtml(ex.explanation)}</span></div>`;
      }
      div.innerHTML = html;
      problemExamples.appendChild(div);
    });
  }

  problemConstraints.innerHTML = "";
  if (problem.constraints && problem.constraints.length > 0) {
    problem.constraints.forEach(c => {
      const li = document.createElement("li");
      li.className = "text-sm text-dark-400 flex items-start gap-2";
      li.innerHTML = `<span class="text-dark-600 mt-0.5">•</span><span>${escapeHtml(c)}</span>`;
      problemConstraints.appendChild(li);
    });
  }

  starterCode = problem.starter_code || problem.function_signature || "";
  problemStarter.querySelector("code").textContent = starterCode;
  editor.setValue(starterCode);
  editor.clearHistory();
  explanation.value = "";

  problemSection.classList.remove("hidden");
  problemSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatDescription(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong class=\"text-dark-100\">$1</strong>");
  html = html.replace(/`(.*?)`/g, "<code class=\"bg-dark-700 text-dark-200 px-1.5 py-0.5 rounded text-xs font-mono\">$1</code>");
  html = html.replace(/\n\n/g, "</p><p class=\"mt-3\">");
  html = html.replace(/\n/g, "<br>");
  html = `<p class="mt-3">${html}</p>`;
  return html;
}

// Submit solution
submitBtn.addEventListener("click", async () => {
  const code = editor.getValue().trim();
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

// Restart
restartBtn.addEventListener("click", () => {
  if (confirm("Restart with the original starter code?")) {
    editor.setValue(starterCode);
    editor.clearHistory();
    explanation.value = "";
    feedbackSection.classList.add("hidden");
  }
});

// Render feedback
function renderFeedback(fb) {
  const isPass = fb.verdict === "Pass" || fb.is_correct === true;
  const borderColor = isPass ? "border-green-800" : (fb.verdict === "Needs Improvement" ? "border-yellow-800" : "border-red-800");
  const iconColor = isPass ? "text-green-400" : (fb.verdict === "Needs Improvement" ? "text-yellow-400" : "text-red-400");

  let html = `<div class="bg-dark-800 border ${borderColor} rounded overflow-hidden">`;
  html += `<div class="border-b border-dark-700 px-6 py-4 flex items-center gap-3">`;
  if (isPass) {
    html += `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  } else {
    html += `<svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  }
  html += `<div>`;
  html += `<h3 class="text-lg font-semibold text-dark-100">${fb.verdict || "Evaluation Complete"}</h3>`;
  html += `</div></div>`;

  html += `<div class="px-6 py-5 space-y-5">`;

  if (fb.feedback) {
    html += `<div>`;
    html += `<h4 class="text-sm font-medium text-dark-400 uppercase tracking-wider mb-2">Feedback</h4>`;
    html += `<div class="text-dark-200 leading-relaxed whitespace-pre-wrap">${escapeHtml(fb.feedback)}</div>`;
    html += `</div>`;
  }

  html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
  html += `<div class="bg-dark-900 border border-dark-700 rounded p-4">`;
  html += `<div class="text-xs font-medium text-dark-500 uppercase mb-1">Time Complexity</div>`;
  html += `<div class="text-dark-200 font-mono text-sm">${escapeHtml(fb.time_complexity || "N/A")}</div>`;
  html += `</div>`;
  html += `<div class="bg-dark-900 border border-dark-700 rounded p-4">`;
  html += `<div class="text-xs font-medium text-dark-500 uppercase mb-1">Space Complexity</div>`;
  html += `<div class="text-dark-200 font-mono text-sm">${escapeHtml(fb.space_complexity || "N/A")}</div>`;
  html += `</div></div>`;

  if (fb.improvements && fb.improvements.length > 0) {
    html += `<div>`;
    html += `<h4 class="text-sm font-medium text-dark-400 uppercase tracking-wider mb-2">Suggested Improvements</h4>`;
    html += `<ul class="space-y-2">`;
    fb.improvements.forEach(imp => {
      html += `<li class="flex items-start gap-2 text-sm text-dark-300"><span class="text-dark-400 mt-0.5">→</span><span>${escapeHtml(imp)}</span></li>`;
    });
    html += `</ul></div>`;
  }

  if (fb.ideal_approach) {
    html += `<div class="bg-dark-900 border border-dark-700 rounded p-4">`;
    html += `<h4 class="text-sm font-medium text-dark-300 uppercase tracking-wider mb-2">Ideal Approach</h4>`;
    html += `<p class="text-dark-400 text-sm leading-relaxed">${escapeHtml(fb.ideal_approach)}</p>`;
    html += `</div>`;
  }

  html += `</div></div>`;
  feedbackContent.innerHTML = html;

  feedbackSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Help sidebar
function openHelp() {
  helpSidebar.classList.remove("translate-x-full");
  helpOverlay.classList.remove("hidden");
  helpInput.focus();
}

function closeHelp() {
  helpSidebar.classList.add("translate-x-full");
  helpOverlay.classList.add("hidden");
}

helpToggle.addEventListener("click", openHelp);
helpClose.addEventListener("click", closeHelp);
helpOverlay.addEventListener("click", closeHelp);

function addMessage(content, isUser = false) {
  const div = document.createElement("div");
  div.className = `flex gap-3 ${isUser ? "flex-row-reverse" : ""}`;

  if (isUser) {
    div.innerHTML = `
      <div class="w-8 h-8 bg-dark-600 rounded flex-shrink-0 flex items-center justify-center">
        <svg class="w-4 h-4 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <div class="bg-dark-600 rounded px-4 py-3 text-sm text-dark-100 max-w-[80%]">${escapeHtml(content)}</div>
    `;
  } else {
    div.innerHTML = `
      <div class="w-8 h-8 bg-dark-600 rounded flex-shrink-0 flex items-center justify-center">
        <svg class="w-4 h-4 text-dark-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div class="bg-dark-700 rounded px-4 py-3 text-sm text-dark-200 max-w-[80%] whitespace-pre-wrap">${escapeHtml(content)}</div>
    `;
  }

  helpMessages.appendChild(div);
  helpMessages.scrollTop = helpMessages.scrollHeight;
}

helpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = helpInput.value.trim();
  if (!message) return;

  addMessage(message, true);
  helpInput.value = "";
  helpSend.disabled = true;
  helpSend.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

  try {
    const res = await fetch("/api/help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        problem: currentProblem,
        code: editor.getValue()
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Failed to get help");
    }

    const data = await res.json();
    addMessage(data.response);
  } catch (err) {
    addMessage(`Error: ${err.message}`, false);
  } finally {
    helpSend.disabled = false;
    helpSend.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>`;
  }
});

// Surrender
surrenderBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure? This will show you the full solution approach.")) {
    return;
  }

  surrenderBtn.disabled = true;
  surrenderBtn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Thinking...`;

  try {
    const res = await fetch("/api/surrender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem: currentProblem })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Failed to get solution");
    }

    const data = await res.json();

    let html = `<div class="prose prose-invert max-w-none">`;
    html += `<p class="text-dark-200 leading-relaxed whitespace-pre-wrap">${escapeHtml(data.response)}</p>`;
    html += `</div>`;
    surrenderContent.innerHTML = html;

    surrenderSection.classList.add("hidden");
    surrenderResponse.classList.remove("hidden");
    surrenderResponse.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message);
  } finally {
    surrenderBtn.disabled = false;
    surrenderBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364L9 9.76m9 9.636l-3.636 3.636M4.636 4.636L9 9.76m-4.364 9.636l3.636-3.636M13.236 4.636L9 9.76m4.236-.036l-3.636 3.636"/></svg> I Give Up! Show Me the Solution`;
  }
});

// Init
initEditor();
