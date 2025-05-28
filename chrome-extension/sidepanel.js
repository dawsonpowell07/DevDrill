const injectBtn = document.getElementById("inject-btn");
const closeBtn = document.getElementById("close-btn");

function sendProblemContextToContentScript() {
  const title = document.getElementById("question-title").value;
  const description = document.getElementById("question-description").value;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "QUESTION_CONTEXT",
      title,
      description,
    });
  });
}

injectBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });

  sendProblemContextToContentScript();

  injectBtn.textContent = "Recorder Active";
  injectBtn.disabled = true;
  closeBtn.disabled = false;
});

closeBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const container = document.getElementById("ai-recorder-ui");
      if (container) {
        // Stop recording if still active
        const stopBtn = document.getElementById("stop-rec");
        if (stopBtn && !stopBtn.disabled) stopBtn.click();

        // Stop all audio streams
        if (window._ai_recorder_stream) {
          window._ai_recorder_stream
            .getTracks()
            .forEach((track) => track.stop());
          window._ai_recorder_stream = null;
        }

        container.remove();
      }
    },
  });

  injectBtn.textContent = "Start Recorder";
  injectBtn.disabled = false;
  closeBtn.disabled = true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRANSCRIPT_AND_FEEDBACK") {
    const { transcript, feedback } = message;

    const container = document.querySelector("body");

    const chatHistory = document.getElementById("chat-history");
    if (!chatHistory) {
      const historyDiv = document.createElement("div");
      historyDiv.id = "chat-history";
      historyDiv.style = "display: flex; flex-direction: column; gap: 12px; margin-top: 16px;";
      container.appendChild(historyDiv);
    }

    const userMsg = document.createElement("div");
    userMsg.className = "message user-message";
    // Set up marked.js options for better markdown rendering
    marked.setOptions({
      highlight: function(code, lang) {
        return code;
      },
      breaks: true,
      gfm: true
    });
    userMsg.innerHTML = DOMPurify.sanitize(marked.parse(transcript));

    const aiMsg = document.createElement("div");
    aiMsg.className = "message ai-message";
    aiMsg.innerHTML = DOMPurify.sanitize(marked.parse(feedback));

    document.getElementById("chat-history").appendChild(userMsg);
    document.getElementById("chat-history").appendChild(aiMsg);

    // Scroll to the bottom of the chat
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
});
