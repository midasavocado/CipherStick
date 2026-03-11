
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-M2NFQ1M6LR');
</script>
<body>
  <header>
    <a href="index.html">
    <img src="ROCKY.svg" alt="CipherStick: Extreme - Project Find Rocky"/>
  </a>
  </header>

  <div class="container">
    <div class="intro" id="introText">
    </div>
    <details style="margin: 1rem 0; background: rgba(0, 0, 0, 0.6); border-left: 5px solid var(--accent-color); padding: 1rem; border-radius: 8px;">
      <summary style="cursor: pointer; font-weight: bold; font-size: 1.1rem;">🧰 Useful OSINT Tools (click to expand)</summary>
      <ul style="margin-top: 0.75rem; padding-left: 1.2rem; line-height: 1.7;">
        <li><a href="https://www.metadata2go.com/" target="_blank" style="color: #fff;">📷 Metadata2Go</a> – Extract metadata from images</li>
        <li style="color: #fff;">🛠 Browser <strong>Inspect Tool</strong> – Right click → Inspect → View source & elements</li>
        <li><a href="https://www.base64decode.org/" target="_blank" style="color: #fff;">📂 Base64 Decode</a> – Decode encoded strings</li>
        <li><a href="https://www.gps-coordinates.net/" target="_blank" style="color: #fff;">📍 GPS Coordinates Lookup</a></li>
        <li><a href="https://archive.org/web/" target="_blank" style="color: #fff;">🕰️ Wayback Machine</a> – View old versions of websites</li>
        <li><a href="https://www.osintcurio.us/" target="_blank" style="color: #fff;">🔍 OSINT Curious Project</a> – Great OSINT blog & tools</li>
        <li><a href="https://dnsdumpster.com/" target="_blank" style="color: #fff;">🌐 DNSDumpster</a> – DNS recon & infrastructure mapping</li>
        <li><a href="https://www.shodan.io/" target="_blank" style="color: #fff;">🛰️ Shodan</a> – Scan internet-connected devices</li>
        <li><a href="https://exif.tools/" target="_blank" style="color: #fff;">🧬 EXIF.tools</a> – Analyze hidden metadata in images</li>
        <li><a href="https://futureboy.us/stegano/decinput.html" target="_blank" style="color: #fff;">🔍 Steganographic Decoder</a> – Find hidden messages in images</li>      
        <li><a href="" target="_blank" style="color: #fff;">🕵️‍♂️ Have I Been Pwned</a> – Check for compromised emails</li>      
        <li>IMPORTANT NOTE: Some of these sites may not be used in this puzzle, and there may be some other sites needed throught the challenge. With OSINT, you have to be prepared for everything.</li>
      </ul>
    </details>


    <div id="questionsContainer"></div>

    <div id="finalMessage">
      <h2 style="color: #ffcc00;">You beat it!</h2>
      <button class="btn-certificate" onclick="openCertificateModal()">Claim Your Certificate</button>
    </div>
  </div>

  <div id="victoryOverlay">You beat it! <p style="color: white; font-size: 12px; text-align: center;">Scroll down to claim your certificate!</p></div>

  <div id="nameInputModal" class="name-input-modal">
    <h2 style="color: #ffcc00;">Enter Your Name</h2>
    <input type="text" id="userNameInput" placeholder="Your Name" />
    <button onclick="downloadCertificate()">Download Certificate</button>
  </div>

  <div id="feedbackModal" class="name-input-modal" style="display:none;background:rgba(0,0,0,0.95);">
    <h2 style="margin-bottom:.75rem; color: white">Did you enjoy the challenge?</h2>
    <p style="margin-bottom:1rem; color: #ddd">Share it, sign up for more, or leave a review.</p>
    <div style="display:flex;flex-direction:column;align-items:center;gap:.6rem;">
      <button onclick="showNativeShare()" style="width:220px;padding:.6rem 0;background:#0a5fe0;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:1rem;">
        🔗 Share
      </button>
      <a href="https://cipherstick.tech/#email" target="_blank" style="width:220px;padding:.6rem 0;background:#0a84ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:600;text-align:center;text-decoration:none;">
        📬 Sign Up for More Challenges
      </a>
      <a href="https://cipherstick.tech/index.html?review" target="_blank" style="width:220px;padding:.6rem 0;background:#00aa00;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:600;text-align:center;text-decoration:none;">
        ⭐ Leave a Review
      </a>
      <a href="https://buymeacoffee.com/midasthecoder" target="_blank" style="width:220px;padding:.6rem 0;background:#FFDD00;color:#000;border:none;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:600;text-align:center;text-decoration:none;">
        ☕ Buy Me A Coffee
      </a>
      <button onclick="closeFeedback()" style="width:220px;padding:.6rem 0;background:#333;color:#ccc;border:none;border-radius:6px;cursor:pointer;font-family:'Poppins',sans-serif;">
        Close
      </button>
    </div>
  </div>

  <div id="toast"></div>

  <footer>
    <p>© 2025 CipherStick. All rights reserved.</p>
  </footer>

<script>
// --- Global test mode flag (available everywhere) ---
window.TEST_MODE = new URLSearchParams(window.location.search).has('test');

function logCompletion() {
    if (window.TEST_MODE) {
      console.warn("🚫 Test mode active — skipping completion logging.");
      return;
    }
    function innerWrite() {
      if (!window.authUID) {
        setTimeout(innerWrite, 200);
        return;
      }
      const uid = window.authUID;
      const completionsRef = firebase.database().ref("completions/rocky/" + uid);
      const attemptsRef = firebase.database().ref("attempts/rocky/" + uid);
      console.log("🔄 Checking completions and attempts for user...");
      // Fetch attempts and completions
      attemptsRef.once("value").then((attemptSnap) => {
        const attemptsVal = attemptSnap.val();
        let attemptsCount = 0;
        if (attemptsVal && typeof attemptsVal === 'object') {
          attemptsCount = Object.keys(attemptsVal).length;
        }
        completionsRef.once("value").then((completionSnap) => {
          const completionsVal = completionSnap.val();
          let completionsCount = 0;
          if (completionsVal && typeof completionsVal === 'object') {
            completionsCount = Object.keys(completionsVal).length;
          } else if (completionSnap.exists()) {
            completionsCount = 1;
          }
          // Save completion (allow multiple completions, use push for consistency)
          const newCompletionKey = firebase.database().ref().push().key;
          const updateData = {};
          updateData[newCompletionKey] = { timestamp: Date.now() };
          completionsRef.update(updateData)
            .then(() => {
              console.log("✅ Completion logged");
            })
            .catch(error => {
              console.warn("❌ Completion logging failed:", error);
            });
        });
      });
    }
    innerWrite();
  }

function loadIntroText() {
  let prefixInfo = "";
  if (prefixEnabled) {
    prefixInfo = `<p>All answers must be in the format <code>${requiredPrefix}</code>ANSWER<code>${requiredSuffix}</code>.</p>`;
  }
  const introHTML = `
  <p>Welcome to <strong>Project Find Rocky</strong>, a hard ARG/OSINT challenge inspired by <em>Project Hail Mary</em>. A former Department of Planetary Security employee leaked a folder called <em>help.zip</em> and claims it came directly from Rocky.</p>
  <p>The bundle contains a spectrogram-ready audio file, a giant image hiding binary, and a mislabeled file that only makes sense once you stop trusting its extension. Follow the metadata, chase the archived sites, and recover Rocky's location before the trail goes cold.</p>
  <p>Your investigation begins with these files in the <code>ProjectFindRocky</code> folder.</p>
  ${prefixInfo}
  <p>Good luck, Agent.</p>
  <br><br>
  If you are unable to solve the puzzle due to a possible error, please contact us <a href="https://cipherstick.tech/#contact" target="_blank">here</a>
`;
  document.getElementById("introText").innerHTML = introHTML;
}

const q = `W3sicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSBuYW1lIG9mIHRoZSBhdXRob3IncyBvbGQgd2Vic2l0ZSB3aGVyZSBoZSBwb3N0ZWQgYSBjb21pYyBhYm91dCBoaW1zZWxmPyIsImhpbnQiOiJDb21pYyBuYW1lIGlzIENhc2V5ICYgQW5keS4gR2l2ZSBqdXN0IHRoZSBuYW1lLCBubyBVUkwuIn0seyJxdWVzdGlvbiI6IldoYXQgaXMgdGhlIGxhc3Qgc3RyaXAgbnVtYmVyIG9mIHRoYXQgY29taWMgaGUgbWFkZT8iLCJoaW50IjoiVGhlIHN0cmlwIG51bWJlciBpcyBwYXJ0IG9mIHRoZSBoaWRkZW4gVVJMIHBhdGggYXNzZW1ibGVkIGZyb20gdGhlIG1ldGFkYXRhIHRyYWlsLiJ9LHsicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSBhdXRob3IncyBUd2l0dGVyL1ggaGFuZGxlPyIsImhpbnQiOiJUaGUgY2hlY2tlciBhY2NlcHRzIGl0IHdpdGggb3Igd2l0aG91dCB0aGUgQC4ifSx7InF1ZXN0aW9uIjoiV2hlbiB3YXMgdGhlIGF1dGhvcidzIGZpcnN0IGV2ZXIgRmFjZWJvb2sgcG9zdD8gWVlZWS1NTS1ERC1ISC1NTSIsImhpbnQiOiJUaGUgZXhhY3QgdGltZXN0YW1wIGlzIHBhcnQgb2YgdGhlIHNlY3JldCBSb2NreSBsb2dzIFVSTCByZWNpcGUuIn0seyJxdWVzdGlvbiI6IldoaWNoIGZvcm1hdCBpcyB0aGUgaW1hZ2UncyBzZWNyZXQgdGV4dCBlbmNvZGVkIGluPyIsImhpbnQiOiJBbnN3ZXIgd2l0aCB0aGUgZm9ybWF0IG5hbWUsIGxpa2UgTW9yc2UgQ29kZSBvciBCYXNlNjQuIn0seyJxdWVzdGlvbiI6IldoYXQgaXMgdGhlIG5hbWUgb2YgdGhlIHRvcCBzZWNyZXQgZ292ZXJubWVudCBvcGVyYXRpb24/IiwiaGludCI6IkRlY29kZSBlYWNoIHRyYWlsZXIgdGltZXN0YW1wIHRvIGJ1aWxkIHRoZSBzaXRlLCB0aGVuIHRha2UgdGhlIGZpcnN0IGxldHRlciBvZiBlYWNoIGxpbmUgb24gdGhhdCBwYWdlLiBIaW50IDI6IHRoZSBhcmNoaXZlZCBzZWl6ZWQgc2l0ZSBtYXR0ZXJzLiJ9LHsicXVlc3Rpb24iOiJXaGF0IDYtZGlnaXQgc2VxdWVuY2UgaXMgaGlkZGVuIHdpdGhpbiB0aGUgUERGPyIsImhpbnQiOiJMb29rIGF0IHRoZSBwYWdlIG51bWJlcnMsIG5vdCB0aGUgYm9keSB0ZXh0LiJ9LHsicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSB0cnVlIGZpbGUgZXh0ZW5zaW9uIGZvciB0aGUgcm9ja3lfbWVzc2FnZSBmaWxlPyIsImhpbnQiOiJHaXZlIGp1c3QgdGhlIHJlYWwgZXh0ZW5zaW9uLCBub3QgdGhlIGZha2Ugb25lLiJ9LHsicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSBwYXNzd29yZCB0byB0aGF0IGZpbGU/IiwiaGludCI6Ikl0IGlzIHNob3duIGluIHRoZSBUaXRsZSBmaWVsZCBvZiB0aGUgY2hlY2tzcGVjIGF1ZGlvIGZpbGUuIn0seyJxdWVzdGlvbiI6IldoaWNoIHdlYnNpdGUgZGlkIHlvdSBmaW5kIHRoYXQgZmlsZSBsaW5raW5nIHRvPyIsImhpbnQiOiJEZWNvZGUgdGhlIG1vcnNlIGNvZGUuIDEgPSBkb3QsIDIgPSBkYXNoLCAzID0gc3BhY2UsIDQgPSB0aGUgYWN0dWFsIHBlcmlvZC4ifSx7InF1ZXN0aW9uIjoiV2hhdCA2IG51bWJlcnMgYXJlIGhpZGRlbiBpbnNpZGUgdGhlIGF1ZGlvIGZpbGUgb24gdGhhdCBwYWdlPyIsImhpbnQiOiJJbnNwZWN0IHRoZSBzcGVjdHJvZ3JhbS4ifSx7InF1ZXN0aW9uIjoiV2hlcmUgaXMgUm9ja3kgbG9jYXRlZCAoZXhhY3QgY29vcmRpbmF0ZXMpPyIsImhpbnQiOiJVc2UgdGhlIG51bWJlcnMgZnJvbSB0aGUgZmlyc3QsIHNlY29uZCwgYW5kIHRoaXJkIGZpbGVzIHRvZ2V0aGVyLiJ9LHsicXVlc3Rpb24iOiJXaGF0IGlzIHRoZSBuYW1lIG9mIHRoZSBtb3VudGFpbiB0aG9zZSBjb29yZGluYXRlcyBhcmUgYXQ/IiwiaGludCI6Ikxvb2sgdXAgdGhlIGZpbmFsIGNvb3JkaW5hdGVzIG9uY2UgeW91IGhhdmUgdGhlbSBleGFjdGx5LiJ9XQ==`;
const decoder = new TextDecoder('utf-8');
const jsonString = decoder.decode(Uint8Array.from(atob(q), c => c.charCodeAt(0)));
const questions = JSON.parse(jsonString);


const storageKeyPrefix = "OSINT-ROCKY";
const requiredPrefix = "";
const requiredSuffix = "";
const prefixEnabled = requiredPrefix.trim() !== "";
let quizCompleted = false;
let checkedQuestions = new Array(questions.length).fill(false);
let answeredCorrectly = new Array(questions.length).fill(false);

function normalizeInput(str) {
  return str.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFKC")
    .trim();
}

function showToastMessage(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = (type === "correct") ? "#28a745" : "#e74c3c";
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function checkAnswer(index, showBanner = true) {
  const inputField = document.getElementById(`input-${index}`);
  const userInputRaw = inputField.value;
  const userInput = normalizeInput(userInputRaw);
  const questionDiv = document.getElementById(`question-${index}`);
  const questionText = questionDiv.firstChild;

  localStorage.setItem(`${storageKeyPrefix}-input-${index}`, userInputRaw);
  if (userInput !== "") checkedQuestions[index] = true;

  fetch('https://validate-answer.mwsaulsbury.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge: "rocky",
      questionIndex: index,
      answer: `${userInput}`
    })
  })
    .then(res => res.json())
    .then(data => {
      const result = Array.isArray(data) ? data[0] : data;
      if (result.correct) {
        if (!answeredCorrectly[index]) {
          answeredCorrectly[index] = true;
          questionDiv.style.borderColor = 'limegreen';
          inputField.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
          questionText.style.color = "lime";
          inputField.style.borderColor = "limegreen";
          if (showBanner) {
            showToastMessage("Correct!", "correct");
            confetti({ particleCount: 150, spread: 160, origin: { y: 0.6 } });
          }
        }
      } else {
        questionDiv.style.borderColor = 'red';
        inputField.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
        questionText.style.color = "rgb(255,0,0)";
        inputField.style.borderColor = "rgb(255,0,0)";
        answeredCorrectly[index] = false;
        if (showBanner) {
          showToastMessage(`Incorrect answer for question ${index + 1}`, "incorrect");
        }
      }
      checkAllAnswers(); // now runs after each validation
    })
    .catch(err => {
      console.error("Validation error:", err);
      showToastMessage("Error validating answer with server", "incorrect");
    });
}


function checkAllAnswers() {
  const finalMessage = document.getElementById('finalMessage');

  // NEW: purely UI-based logic — if everything is green, you win
  const allQuestions = document.querySelectorAll('.question');
  const allGreen = [...allQuestions].every(q => 
    q.style.borderColor === 'limegreen' || q.style.borderColor === 'green'
  );

  if (allGreen && !quizCompleted) {
    quizCompleted = true;
    finalMessage.style.display = 'block';
    startVictoryConfetti();
    showVictoryOverlay();
    document.getElementById('feedbackModal').style.display = 'block';
    logCompletion();

    // Wipe progress after victory (but keep userId)
    setTimeout(() => {
      Object.keys(localStorage).forEach(key => {
        if (!key.includes("cipherstick-anon")) localStorage.removeItem(key);
      });
      console.log("🧹 LocalStorage cleared (except anon keys)");
    }, 500);
  } else if (!allGreen) {
    finalMessage.style.display = 'none';
    quizCompleted = false;
  }
}
function toggleHint(index) {
  const hint = document.getElementById(`hint-${index}`);
  hint.style.display = (hint.style.display === 'none' || hint.style.display === '') ? 'block' : 'none';
}

function generateQuestions() {
  const container = document.getElementById('questionsContainer');
  questions.forEach((q, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.id = `question-${index}`;

    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = `${index + 1}. ${q.question}`;
    questionDiv.appendChild(questionText);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${index}`;
    // Use improved placeholder logic:
    const answer = `${requiredPrefix}${q.answer}${requiredSuffix}`;
    input.placeholder = generatePlaceholder(answer);
    input.oninput = () => localStorage.setItem(`${storageKeyPrefix}-input-${index}`, input.value);
    inputGroup.appendChild(input);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    if (q.hint) {
      const hintBtn = document.createElement('button');
      hintBtn.className = 'btn-hint';
      hintBtn.textContent = 'Show Hint';
      hintBtn.onclick = () => toggleHint(index);
      btnGroup.appendChild(hintBtn);
    }

    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn-check';
    checkBtn.textContent = 'Check Answer';
    checkBtn.onclick = () => checkAnswer(index, true);
    btnGroup.appendChild(checkBtn);

    inputGroup.appendChild(btnGroup);
    questionDiv.appendChild(inputGroup);

    if (q.hint) {
      const hintDiv = document.createElement('div');
      hintDiv.className = 'hint';
      hintDiv.id = `hint-${index}`;
      hintDiv.textContent = q.hint;
      questionDiv.appendChild(hintDiv);
    }

    const resultDiv = document.createElement('div');
    resultDiv.className = 'result';
    resultDiv.id = `result-${index}`;
    questionDiv.appendChild(resultDiv);

    container.appendChild(questionDiv);
  });
}

function restoreInputs() {
  questions.forEach((_, i) => {
    const saved = localStorage.getItem(`${storageKeyPrefix}-input-${i}`);
    if (saved) {
      const inputField = document.getElementById(`input-${i}`);
      inputField.value = saved;
      checkAnswer(i, false);
    }
  });
}

function startVictoryConfetti() {
  const interval = setInterval(() => {
    confetti({ particleCount: 300, spread: 150, origin: { x: 0, y: 0.5 } });
    confetti({ particleCount: 300, spread: 150, origin: { x: 1, y: 0.5 } });
  }, 350);
  setTimeout(() => clearInterval(interval), 10000);
}

function showVictoryOverlay() {
  const overlay = document.getElementById('victoryOverlay');
  overlay.style.opacity = '1';
  setTimeout(() => { overlay.style.opacity = '0'; }, 3000);
}

function openCertificateModal() {
  const modal = document.getElementById('nameInputModal');
  // Insert close button if not already present
  modal.style.display = 'block';
}

function downloadCertificate() {
  const userName = document.getElementById('userNameInput').value || '[Your Name]';

  // Send email via EmailJS
  emailjs.send("service_mpx4p0t", "certificate_claimed", {
    user_name: userName,
    quiz_difficulty: "rocky"
  }).then(function(response) {
    console.log("✅ Email sent!", response.status, response.text);
  }, function(error) {
    console.error("❌ Failed to send email", error);
  });

  const certificateDate = new Date().toLocaleDateString();
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: [11, 8.5] });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Rocky-themed certificate
  // Background fill
  doc.setFillColor(5, 12, 28); // deep navy
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border accent
  doc.setDrawColor(0, 200, 255); // cyan
  doc.setLineWidth(0.25);
  doc.rect(0.25, 0.25, pageWidth - 0.5, pageHeight - 0.5);

  // Title and text colors
  doc.setFont('times', 'bolditalic');
  doc.setTextColor(255, 255, 255);

  // Header Title
  doc.setFontSize(30);
  doc.text('Project Find Rocky — Certificate of Completion', pageWidth / 2, 1.45, { align: 'center' });

  // Thin cyan divider
  doc.setDrawColor(0, 200, 255);
  doc.setLineWidth(0.02);
  doc.line(0.75, 1.7, pageWidth - 0.75, 1.7);

  // Body copy
  doc.setFont('times', 'normal');
  doc.setFontSize(18);
  doc.text('This certifies that', pageWidth / 2, 2.6, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.text(userName, pageWidth / 2, 3.6, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(18);
  doc.text('has successfully completed the CipherStick OSINT investigation', pageWidth / 2, 4.6, { align: 'center' });
  doc.text('PROJECT FIND ROCKY', pageWidth / 2, 5.1, { align: 'center' });

  doc.setFontSize(16);
  doc.text(`Awarded on ${certificateDate}`, pageWidth / 2, 5.9, { align: 'center' });

  // Signature line and footer
  doc.setLineWidth(0.02);
  doc.line(pageWidth/2 - 2.2, 6.8, pageWidth/2 + 2.2, 6.8);
  doc.setFontSize(12);
  doc.text('CipherStick • cipherstick.tech', pageWidth / 2, 7.1, { align: 'center' });

  // Save with clearer filename
  doc.save('Project-Find-Rocky-Certificate.pdf');

  // Display the certificate as an image at the bottom of the page
  try {
    const dataUrl = doc.output('dataurlstring');
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Your Certificate';
    img.style.maxWidth = '100%';
    img.style.marginTop = '2rem';

    const certDisplay = document.createElement('div');
    certDisplay.id = 'certificateDisplay';
    certDisplay.style.textAlign = 'center';
    certDisplay.appendChild(img);

    document.body.appendChild(certDisplay);
  } catch (e) {
    console.warn("Could not display certificate as image:", e);
  }

  // Firebase completion logging (runs only when certificate is generated)

  // --- Freeze all input fields and disable buttons, clear storage but preserve userId ---

  document.getElementById('nameInputModal').style.display = 'none';
}

// Prefetch ROCKY answers for placeholders and answer injection
async function fetchAllAnswers() {
  try {
    const res = await fetch("https://validate-answer.mwsaulsbury.workers.dev/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge: "rocky" })
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const { answers } = await res.json();
    answers.forEach((ans, i) => (questions[i].answer = ans));
  } catch (err) {
    console.warn("❌ Prefetch ROCKY answers failed:", err);
  }
}

function generatePlaceholder(answer) {
  const prefix = requiredPrefix || "";
  const suffix = requiredSuffix || "";
  if (!answer) return "";
  const core = answer.slice(prefix.length, answer.length - suffix.length);
  return `**{${core.replace(/[^{} ]/g, "*")}}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadIntroText();

  // Ensure answers are fetched and fields are rendered before any autofill
  fetchAllAnswers()
    .then(() => {
      generateQuestions();
      restoreInputs();

      // --- TEST MODE AUTOFILL (runs AFTER rendering & answers ready) ---
      if (window.TEST_MODE) {
        const confirmed = confirm("Test mode is ON. All answers will be filled in automatically, and Firebase logging will be skipped.");
        if (confirmed) {
          questions.forEach((q, i) => {
            const input = document.getElementById(`input-${i}`);
            if (input && q && typeof q.answer === "string") {
              input.value = `${requiredPrefix}${q.answer}${requiredSuffix}`;
              // Do NOT persist in localStorage while in test mode
              checkAnswer(i, false);
            }
          });
          console.log("✅ Test mode: answers filled and logging skipped.");
        }
      }
    })
    .catch(err => {
      console.warn("❌ Prefetch/render sequence failed:", err);
      // Fallback: render questions anyway
      generateQuestions();
    });
});
// --- Feedback modal helpers ---

