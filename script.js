// CONFIG — replace with your GitHub username + repo
const USER = "RayTheFemboy";
const REPO = "god-hivemind";
const BRANCH = "main";

const BRAIN_URL = `https://raw.githubusercontent.com/${USER}/${REPO}/${BRANCH}/brain.json`;

let brain = {
    words: {},
    patterns: [],
    history: []
};

// Load brain from GitHub
async function loadBrain() {
    const res = await fetch(BRAIN_URL);
    brain = await res.json();
    console.log("Brain loaded:", brain);
}

loadBrain();

// Basic Jackson logic (simple version)
function learn(text) {
    const words = text.toLowerCase().split(" ");

    for (let w of words) {
        if (!brain.words[w]) {
            brain.words[w] = { seen: 1, definition: null, links: [] };
        } else {
            brain.words[w].seen++;
        }
    }

    brain.history.push(text);
}

function generateReply() {
    // Very simple reply generator for now
    const keys = Object.keys(brain.words);
    if (keys.length === 0) return "I am still learning.";

    const top = keys.sort((a, b) => brain.words[b].seen - brain.words[a].seen)[0];
    return "I am thinking about " + top + ".";
}

// Chat UI
function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (!text) return;

    addMessage("You: " + text, "user");

    learn(text);
    const reply = generateReply();
    addMessage("Jackson: " + reply, "bot");

    input.value = "";
}

function addMessage(text, type) {
    const box = document.getElementById("chatbox");
    const div = document.createElement("div");
    div.className = "message " + type;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
