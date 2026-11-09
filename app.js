const sharedAudio = document.querySelector("#shared-audio");
const rowsContainer = document.querySelector("#audio-rows");
const fileInput = document.querySelector("#local-file-input");

const columnKeys = ["original", "deepvoice", "defended", "defendedDeepvoice"];
let activeButton = null;
let pendingUploadButton = null;

function seededHeights(seed) {
  let value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  return Array.from({ length: 30 }, (_, index) => {
    value = (value * 9301 + 49297) % 233280;
    const height = 18 + Math.round((value / 233280) * 78);
    return `<i style="--h:${height};--i:${index}"></i>`;
  }).join("");
}

function playIcon(type = "play") {
  if (type === "upload") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v14h-2zM5 11h14v2H5z"/></svg>`;
  }
  if (type === "pause") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5h4v14h-4zm7 0h4v14h-4z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
}

function speakerIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.45-4.5 3.1-7 7.5-7s7.05 2.5 7.5 7z"/></svg>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildAudioCard(sample, key, rowIndex, columnIndex) {
  const entry = sample.audio?.[key] || "";
  const audio = typeof entry === "string" ? entry : entry.src || "";
  const transcript = typeof entry === "object" ? entry.text || "" : "";
  const filename = audio ? audio.split("/").pop() : "음원 파일 선택";
  const isDefended = columnIndex >= 2;
  const isAttackOutput = columnIndex === 1;
  const cell = document.createElement("div");
  cell.className = `audio-cell${isDefended ? " defended" : ""}${isAttackOutput ? " attack-output" : ""}`;
  cell.setAttribute("role", "cell");

  const button = document.createElement("button");
  button.type = "button";
  button.className = `audio-card${audio ? "" : " is-missing"}`;
  button.dataset.src = audio;
  button.dataset.label = `${sample.label} ${columnIndex + 1}열`;
  button.setAttribute("aria-label", audio ? `${sample.label} ${columnIndex + 1}번 음성 재생` : `${sample.label} ${columnIndex + 1}번 음원 파일 선택`);
  button.innerHTML = `
    <span class="play-icon">${playIcon(audio ? "play" : "upload")}</span>
    <span class="waveform" aria-hidden="true">${seededHeights(`${rowIndex}-${columnIndex}-${audio}`)}</span>
    <span class="audio-meta">
      <span class="audio-name">${escapeHtml(filename)}</span>
      <span class="audio-action">${audio ? "재생" : "불러오기"}</span>
    </span>
    <span class="audio-transcript">${escapeHtml(transcript)}</span>`;

  button.addEventListener("click", () => handleAudioClick(button));
  cell.appendChild(button);
  return cell;
}

function renderRows(samples) {
  rowsContainer.innerHTML = "";
  samples.forEach((sample, rowIndex) => {
    const row = document.createElement("div");
    row.className = "audio-row";
    row.setAttribute("role", "row");

    const caseCell = document.createElement("div");
    caseCell.className = "case-cell";
    caseCell.setAttribute("role", "rowheader");
    caseCell.innerHTML = `<span class="speaker-icon" aria-hidden="true">${speakerIcon()}</span><strong>${String(rowIndex + 1).padStart(2, "0")}</strong><small>${escapeHtml(sample.label || `CASE ${rowIndex + 1}`)}</small>`;
    row.appendChild(caseCell);

    columnKeys.forEach((key, columnIndex) => {
      row.appendChild(buildAudioCard(sample, key, rowIndex, columnIndex));
    });
    rowsContainer.appendChild(row);
  });
}

function resetActiveButton() {
  if (!activeButton) return;
  activeButton.classList.remove("is-playing");
  activeButton.querySelector(".play-icon").innerHTML = playIcon("play");
  activeButton.querySelector(".audio-action").textContent = "재생";
  activeButton = null;
}

function handleAudioClick(button) {
  const src = button.dataset.src;
  if (!src) {
    pendingUploadButton = button;
    fileInput.value = "";
    fileInput.click();
    return;
  }

  if (activeButton === button && !sharedAudio.paused) {
    sharedAudio.pause();
    button.classList.remove("is-playing");
    button.querySelector(".play-icon").innerHTML = playIcon("play");
    button.querySelector(".audio-action").textContent = "계속 듣기";
    return;
  }

  if (activeButton !== button) {
    resetActiveButton();
    activeButton = button;
    sharedAudio.src = src;
  }

  sharedAudio.play().then(() => {
    button.classList.add("is-playing");
    button.querySelector(".play-icon").innerHTML = playIcon("pause");
    button.querySelector(".audio-action").textContent = "일시정지";
  }).catch(() => {
    button.querySelector(".audio-action").textContent = "파일 확인 필요";
  });
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file || !pendingUploadButton) return;
  const objectUrl = URL.createObjectURL(file);
  pendingUploadButton.dataset.src = objectUrl;
  pendingUploadButton.classList.remove("is-missing");
  pendingUploadButton.querySelector(".play-icon").innerHTML = playIcon("play");
  pendingUploadButton.querySelector(".audio-name").textContent = file.name;
  pendingUploadButton.querySelector(".audio-action").textContent = "재생";
  pendingUploadButton.setAttribute("aria-label", `${pendingUploadButton.dataset.label} 음성 재생`);
  const target = pendingUploadButton;
  pendingUploadButton = null;
  handleAudioClick(target);
});

sharedAudio.addEventListener("ended", resetActiveButton);
sharedAudio.addEventListener("error", () => {
  if (!activeButton) return;
  activeButton.classList.remove("is-playing");
  activeButton.querySelector(".play-icon").innerHTML = playIcon("play");
  activeButton.querySelector(".audio-action").textContent = "파일 확인 필요";
  activeButton = null;
});

fetch("./data/samples.json?v=20261110-5")
  .then((response) => {
    if (!response.ok) throw new Error("샘플 목록을 불러오지 못했습니다.");
    return response.json();
  })
  .then(renderRows)
  .catch(() => {
    renderRows([{ label: "CASE 01", audio: {} }]);
  });
