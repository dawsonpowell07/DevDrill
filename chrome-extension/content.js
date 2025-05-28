(async () => {
  if (document.getElementById("ai-recorder-ui")) return;

  // Inject external CSS file
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = chrome.runtime.getURL("content-style.css");
  document.head.appendChild(style);

  let problemTitle = "";
  let problemDescription = "";

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "QUESTION_CONTEXT") {
      problemTitle = message.title;
      problemDescription = message.description;
      console.log("Received problem context:", { problemTitle, problemDescription });
    }
  });

  // Create recorder container
  const container = document.createElement("div");
  container.id = "ai-recorder-ui";

  container.innerHTML = `
    <h3>🎙️ AI Interview Recorder</h3>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
      <button id="start-rec">Start</button>
      <button id="stop-rec" disabled>Stop</button>
      <button id="upload-rec" disabled>Upload</button>
    </div>
    <p id="status"></p>
    <audio id="playback" controls></audio>
  `;
  document.body.appendChild(container);

  let mediaRecorder;
  let audioChunks = [];
  let audioBlob = null;

  const startBtn = document.getElementById("start-rec");
  const stopBtn = document.getElementById("stop-rec");
  const uploadBtn = document.getElementById("upload-rec");
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
        audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        playback.src = audioUrl;
        playback.style.display = "block";
        statusText.textContent = "✅ Recording saved!";
        uploadBtn.disabled = false;
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      uploadBtn.disabled = true;
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

  uploadBtn.onclick = async () => {
    if (!audioBlob) {
      statusText.textContent = "⚠️ No recording to upload.";
      return;
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      const response = await fetch("http://localhost:8000/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const transcript = result.transcription;
      statusText.textContent = "✅ Transcribed! Generating feedback...";

      const feedbackResponse = await fetch(
        "http://localhost:8000/generate-feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_transcript: transcript,
            problem_title: problemTitle,
            problem_description: problemDescription,
          }),
        }
      );

      console.log("Sending feedback request with context:", {
        transcript,
        problemTitle,
        problemDescription,
      });

      const feedbackResult = await feedbackResponse.json();
      const feedback = feedbackResult.feedback;

      statusText.textContent = "✅ Feedback received!";
      console.log("Transcript:", transcript);
      console.log("Feedback:", feedback);

      // Send to sidepanel
      chrome.runtime.sendMessage({
        type: "TRANSCRIPT_AND_FEEDBACK",
        transcript,
        feedback,
      });
    } catch (err) {
      console.error("Upload or feedback failed:", err);
      statusText.textContent = "❌ Upload or feedback failed.";
    }
  };
})();
