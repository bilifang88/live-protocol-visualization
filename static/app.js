const $ = id => document.getElementById(id);

let currentMode = "browse";
let steps = [];
let currentStep = -1;
let playing = false;
let timer = null;

const data = {
  browse: [
    {name:"DNS Query", dir:"client", actor:"Client", target:"DNS Server", time:"0.0 s",
     text:"DNS QUERY\nName: example.com\nType: A\nClass: IN"},
    {name:"DNS Response", dir:"server", actor:"DNS Server", target:"Client", time:"0.4 s",
     text:"DNS RESPONSE\nName: example.com\nType: A\nAnswer: 93.184.216.34\nTTL: 300"},
    {name:"HTTP GET", dir:"client", actor:"Client", target:"Web Server", time:"0.7 s",
     text:"GET / HTTP/1.1\nHost: example.com\nConnection: keep-alive\nAccept: text/html"},
    {name:"HTTP Response", dir:"server", actor:"Web Server", target:"Client", time:"1.1 s",
     text:"HTTP/1.1 200 OK\nContent-Type: text/html\nContent-Length: 1256\nConnection: keep-alive"}
  ],
  mail: [
    {name:"DNS Query", dir:"client", actor:"Mail Client", target:"DNS Server", time:"0.0 s",
     text:"DNS QUERY\nName: mail.example.com\nType: MX\nClass: IN"},
    {name:"DNS Response", dir:"server", actor:"DNS Server", target:"Mail Client", time:"0.3 s",
     text:"DNS RESPONSE\nName: example.com\nType: MX\nAnswer: mail.example.com"},
    {name:"EHLO", dir:"client", actor:"Mail Client", target:"SMTP Server", time:"0.6 s",
     text:"EHLO client.example.com"},
    {name:"250 OK", dir:"server", actor:"SMTP Server", target:"Mail Client", time:"0.8 s",
     text:"250-mail.example.com\n250-SIZE 35882577\n250-STARTTLS\n250 OK"},
    {name:"MAIL FROM", dir:"client", actor:"Mail Client", target:"SMTP Server", time:"1.0 s",
     text:"MAIL FROM:<student@example.com>"},
    {name:"RCPT TO", dir:"client", actor:"Mail Client", target:"SMTP Server", time:"1.2 s",
     text:"RCPT TO:<recipient@example.com>"},
    {name:"DATA", dir:"client", actor:"Mail Client", target:"SMTP Server", time:"1.4 s",
     text:"DATA\nSubject: Computer Networks Assignment\n\nHello, this is a simulated SMTP message.\n."},
    {name:"250 Message Accepted", dir:"server", actor:"SMTP Server", target:"Mail Client", time:"1.7 s",
     text:"250 2.0.0 Message accepted for delivery"},
    {name:"QUIT", dir:"client", actor:"Mail Client", target:"SMTP Server", time:"1.9 s",
     text:"QUIT"},
    {name:"221 Bye", dir:"server", actor:"SMTP Server", target:"Mail Client", time:"2.1 s",
     text:"221 2.0.0 Bye"}
  ],
  stream: [
    {name:"DNS Query", dir:"client", actor:"Player", target:"DNS Server", time:"0.0 s",
     text:"DNS QUERY\nName: video.example.com\nType: A\nClass: IN"},
    {name:"DNS Response", dir:"server", actor:"DNS Server", target:"Player", time:"0.3 s",
     text:"DNS RESPONSE\nName: video.example.com\nType: A\nAnswer: 203.0.113.10"},
    {name:"HTTP Manifest GET", dir:"client", actor:"Player", target:"Streaming Server", time:"0.6 s",
     text:"GET /video/playlist.m3u8 HTTP/1.1\nHost: video.example.com\nAccept: application/vnd.apple.mpegurl"},
    {name:"Manifest Response", dir:"server", actor:"Streaming Server", target:"Player", time:"0.9 s",
     text:"HTTP/1.1 200 OK\nContent-Type: application/vnd.apple.mpegurl\n\n#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500000"},
    {name:"Segment Request 1", dir:"client", actor:"Player", target:"Streaming Server", time:"1.2 s",
     text:"GET /video/720p/segment001.ts HTTP/1.1\nHost: video.example.com"},
    {name:"Segment Response 1", dir:"server", actor:"Streaming Server", target:"Player", time:"1.5 s",
     text:"HTTP/1.1 200 OK\nContent-Type: video/mp2t\nContent-Length: 482310"},
    {name:"Segment Request 2", dir:"client", actor:"Player", target:"Streaming Server", time:"1.8 s",
     text:"GET /video/720p/segment002.ts HTTP/1.1\nHost: video.example.com"},
    {name:"Segment Response 2", dir:"server", actor:"Streaming Server", target:"Player", time:"2.1 s",
     text:"HTTP/1.1 200 OK\nContent-Type: video/mp2t\nContent-Length: 501220"}
  ]
};

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("browseForm").classList.toggle("hidden", mode !== "browse");
  $("mailForm").classList.toggle("hidden", mode !== "mail");
  $("streamForm").classList.toggle("hidden", mode !== "stream");
  $("modeLabel").textContent = mode === "browse" ? "Browsing" : mode === "mail" ? "Mail" : "Streaming";
  $("statusText").textContent = "Ready. Perform the selected activity.";
  $("statusDot").classList.remove("live");
}

document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

function addLog(message) {
  const log = $("activityLog");
  const empty = log.querySelector(".empty");
  if (empty) empty.remove();
  const item = document.createElement("div");
  item.className = "log-item";
  item.innerHTML = `${escapeHtml(message)}<span>${new Date().toLocaleTimeString()}</span>`;
  log.prepend(item);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function startVisualization(mode) {
  clearInterval(timer);
  steps = data[mode].map(x => ({...x}));
  currentStep = -1;
  playing = true;
  $("protocolLabel").textContent = mode === "browse" ? "DNS → HTTP" : mode === "mail" ? "DNS → SMTP" : "DNS → HTTP Streaming";
  renderTimeline();
  nextStep();
}

function renderTimeline() {
  const visual = $("visualizer");
  visual.classList.add("flowing");
  visual.innerHTML = `<div style="text-align:center;color:#6f8aa6;font-size:10px;margin-bottom:10px;letter-spacing:.5px">● LIVE PROTOCOL FLOW</div><div class="timeline">${
    steps.map((s,i) => `
      <div class="packet ${s.dir}" id="packet-${i}">
        <div class="actor">${i % 2 === 0 ? s.actor : s.target}</div>
        <div class="arrow">
          <div class="arrow-line"></div>
          <div class="packet-card">
            <div class="packet-name">${escapeHtml(s.name)}</div>
            <div class="packet-preview">${escapeHtml(s.text.split("\\n")[0])}</div>
          </div>
        </div>
        <div class="actor">${i % 2 === 0 ? s.target : s.actor}</div>
      </div>`).join("")
  }</div>`;
}

function showStep(i) {
  if (i < 0 || i >= steps.length) return;
  currentStep = i;
  document.querySelectorAll(".packet").forEach((p,n) => {
    p.classList.toggle("visible", n <= i);
    p.classList.toggle("active", n === i);
  });
  const s = steps[i];
  $("stepCounter").textContent = `Step ${i+1} / ${steps.length}`;
  $("timing").textContent = s.time;
  $("progressBar").style.width = `${((i+1)/steps.length)*100}%`;
  $("messageCard").classList.remove("hidden");
  $("messageDirection").textContent = s.dir === "client" ? "→ " + s.actor + " → " + s.target : "← " + s.actor + " → " + s.target;
  $("messageName").textContent = "  " + s.name;
  $("messageContent").textContent = s.text;
}

function nextStep() {
  if (currentStep >= steps.length - 1) {
    playing = false;
    clearInterval(timer);
    return;
  }
  showStep(currentStep + 1);
  if (playing) {
    clearInterval(timer);
    timer = setInterval(() => {
      if (currentStep >= steps.length - 1) {
        playing = false; clearInterval(timer); return;
      }
      showStep(currentStep + 1);
    }, 1200);
  }
}

function prevStep() {
  clearInterval(timer); playing = false;
  showStep(Math.max(0, currentStep - 1));
}

function togglePause() {
  if (!steps.length) return;
  playing = !playing;
  $("pauseVizBtn").textContent = playing ? "Ⅱ Pause" : "▶ Play";
  if (playing) nextStep(); else clearInterval(timer);
}

function perform(mode, message) {
  $("statusText").textContent = message;
  $("statusDot").classList.add("live");
  addLog(message);
  startVisualization(mode);
}

$("visitBtn").addEventListener("click", () => {
  const url = $("urlInput").value.trim() || "https://example.com";
  perform("browse", `Visited ${url} (simulated)`);
});

$("sendBtn").addEventListener("click", () => {
  const to = $("toInput").value.trim() || "recipient@example.com";
  const subject = $("subjectInput").value.trim() || "No subject";
  perform("mail", `Mail sent to ${to} — "${subject}" (simulated)`);
});

$("playBtn").addEventListener("click", () => {
  $("streamStatus").textContent = "Streaming";
  perform("stream", `Streaming started at ${$("qualityInput").value}`);
});
$("pauseBtn").addEventListener("click", () => {
  $("streamStatus").textContent = "Paused";
  $("statusText").textContent = "Video stream paused.";
  $("statusDot").classList.remove("live");
  addLog("Video stream paused");
  clearInterval(timer);
  playing = false;
});
$("qualityInput").addEventListener("change", () => {
  $("qualityStatus").textContent = "Quality: " + $("qualityInput").value;
});

$("nextBtn").addEventListener("click", () => { playing=false; clearInterval(timer); nextStep(); });
$("prevBtn").addEventListener("click", prevStep);
$("pauseVizBtn").addEventListener("click", togglePause);
$("replayBtn").addEventListener("click", () => { if (!steps.length) return; clearInterval(timer); currentStep=-1; playing=true; $("pauseVizBtn").textContent="Ⅱ Pause"; nextStep(); });
$("clearLog").addEventListener("click", () => {
  $("activityLog").innerHTML = '<div class="empty">No activity yet.</div>';
});

setMode("browse");
