(async () => {
  if (document.getElementById("ai-recorder-ui")) return;

  // Inject external CSS file
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = chrome.runtime.getURL("content-style.css");
  document.head.appendChild(style);

  // Create recorder container
  const container = document.createElement("div");
  container.id = "ai-recorder-ui";

  container.innerHTML = `
    <h3>🎙️ AI Interview Recorder</h3>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
      <button id="start-rec">Start</button>
      <button id="stop-rec" disabled>Stop</button>
    </div>
    <p id="status"></p>
    <audio id="playback" controls></audio>
  `;
  document.body.appendChild(container);

  let mediaRecorder;
  let audioChunks = [];

  const startBtn = document.getElementById("start-rec");
  const stopBtn = document.getElementById("stop-rec");
  const statusText = document.getElementById("status");
  const playback = document.getElementById("playback");

  startBtn.onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window._ai_recorder_stream = stream;

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        playback.src = audioUrl;
        playback.style.display = "block";
        statusText.textContent = "✅ Recording saved!";
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusText.textContent = "🔴 Recording...";
    } catch (err) {
      console.error("Microphone error:", err);
      statusText.textContent = "❌ Microphone access denied.";
    }
  };

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusText.textContent = "⏹️ Stopped. Saving...";
    }
  };
})();
