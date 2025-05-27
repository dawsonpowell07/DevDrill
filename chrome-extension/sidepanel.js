const injectBtn = document.getElementById("inject-btn");
const closeBtn = document.getElementById("close-btn");

injectBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });

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
          window._ai_recorder_stream.getTracks().forEach(track => track.stop());
          window._ai_recorder_stream = null;
        }

        container.remove();
      }
    }
  });

  injectBtn.textContent = "Start Recorder";
  injectBtn.disabled = false;
  closeBtn.disabled = true;
});