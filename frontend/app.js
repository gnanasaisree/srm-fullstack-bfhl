const apiUrlInput = document.getElementById("api-url");
const edgeInput = document.getElementById("edge-input");
const submitButton = document.getElementById("submit-button");
const sampleButton = document.getElementById("sample-button");
const statusText = document.getElementById("status-text");

const treesCount = document.getElementById("trees-count");
const cyclesCount = document.getElementById("cycles-count");
const largestRoot = document.getElementById("largest-root");
const hierarchiesOutput = document.getElementById("hierarchies-output");
const invalidOutput = document.getElementById("invalid-output");
const duplicateOutput = document.getElementById("duplicate-output");
const rawOutput = document.getElementById("raw-output");

const sampleEdges = [
  "A->B",
  "A->C",
  "B->D",
  "A->B",
  "X=>Y",
  "G->H",
  "H->G",
];

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function getPayload() {
  const data = edgeInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return { data };
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#b4481f" : "";
}

function renderResponse(responseData) {
  const summary = responseData.summary || {};

  treesCount.textContent = summary.total_trees ?? "-";
  cyclesCount.textContent = summary.total_cycles ?? "-";
  largestRoot.textContent = summary.largest_tree_root || "-";
  hierarchiesOutput.textContent = prettyJson(responseData.hierarchies || []);
  invalidOutput.textContent = prettyJson(responseData.invalid_entries || []);
  duplicateOutput.textContent = prettyJson(responseData.duplicate_edges || []);
  rawOutput.textContent = prettyJson(responseData);
}

async function analyzeHierarchy() {
  const endpoint = apiUrlInput.value.trim() || "/bfhl";
  const payload = getPayload();

  submitButton.disabled = true;
  setStatus("Analyzing...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || "Request failed.");
    }

    renderResponse(responseData);
    setStatus("Analysis complete.");
  } catch (error) {
    setStatus(error.message || "Something went wrong.", true);
    rawOutput.textContent = prettyJson({ error: error.message || "Unknown error" });
  } finally {
    submitButton.disabled = false;
  }
}

sampleButton.addEventListener("click", () => {
  edgeInput.value = sampleEdges.join("\n");
  setStatus("Sample loaded.");
});

submitButton.addEventListener("click", analyzeHierarchy);

renderResponse({
  summary: {},
  hierarchies: [],
  invalid_entries: [],
  duplicate_edges: [],
});
