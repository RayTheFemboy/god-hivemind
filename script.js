// ---------------------------------------
// Load or initialize brain
// ---------------------------------------

let brain = {
    words: {},
    patterns: [],
    history: []
};

// Load brain.json from GitHub (already handled by your loadBrain function)
async function loadBrain() {
    const res = await fetch(BRAIN_URL);
    brain = await res.json();
    console.log("Brain loaded:", brain);
}
loadBrain();

// ---------------------------------------
// Ensure word entry exists
// ---------------------------------------
function ensureWord(word) {
    if (!brain.words[word]) {
        brain.words[word] = {
            definition: null,
            seen: 0,
            links: []
        };
    }
    return brain.words[word];
}

// ---------------------------------------
// Learn words and associations
// ---------------------------------------
function learnWords(message) {
    const words = message.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const entry = ensureWord(w);
        entry.seen += 1;

        const neighbors = [
            ...words.slice(Math.max(0, i - 2), i),
            ...words.slice(i + 1, i + 3)
        ];

        for (const n of neighbors) {
            if (n !== w && !entry.links.includes(n)) {
                entry.links.push(n);
            }
        }
    }
}

// ---------------------------------------
// Learn definitions: "x is y"
// ---------------------------------------
function learnDefinitions(message) {
    if (!message.includes(" is ")) return;

    const parts = message.split(" is ");
    if (parts.length !== 2) return;

    const subject = parts[0].trim().toLowerCase();
    const definition = parts[1].trim();

    const entry = ensureWord(subject);
    entry.definition = definition;
}

// ---------------------------------------
// Learn sentence patterns
// ---------------------------------------
function learnPatterns(message) {
    const words = message.toLowerCase().split(/\s+/);
    if (words.length > 2) {
        brain.patterns.push(words);
    }
}

// ---------------------------------------
// Generate a reply using learned patterns
// ---------------------------------------
function generateReply(message) {
    const words = message.toLowerCase().split(/\s+/);
    if (words.length === 0) return "";

    const chosen = words[Math.floor(Math.random() * words.length)];
    const entry = brain.words[chosen];

    // 1. If definition exists, use it
    if (entry && entry.definition) {
        return `${chosen} ${entry.definition}`;
    }

    // 2. If patterns exist, generate a new sentence
    if (brain.patterns.length > 0) {
        const pattern = brain.patterns[Math.floor(Math.random() * brain.patterns.length)];
        const output = [];

        for (const w of pattern) {
            if (brain.words[w] && brain.words[w].links.length > 0) {
                const linkList = brain.words[w].links;
                const randomLink = linkList[Math.floor(Math.random() * linkList.length)];
                output.push(randomLink);
            } else {
                output.push(w);
            }
        }

        return output.join(" ");
    }

    // 3. If associations exist, use them
    if (entry && entry.links.length > 0) {
        return [chosen, ...entry.links.slice(0, 3)].join(" ");
    }

    // 4. Last fallback: echo the word
    return chosen;
}

// ---------------------------------------
// Chat UI + Learning + Saving
// ---------------------------------------
function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (!text) return;

    addMessage("You: " + text, "user");

    brain.history.push(text);

    learnWords(text);
    learnDefinitions(text);
    learnPatterns(text);

    const reply = generateReply(text);
    addMessage("Jackson: " + reply, "bot");

    saveBrain(); // triggers GitHub Action

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
