let brain = {
    words: {},
    patterns: [],
    history: []
};

// --- CORE FUNCTIONS ---

async function sendMessage() {
    const inputField = document.getElementById("userInput");
    if (!inputField) return;

    const input = inputField.value.trim();
    if (!input) return;

    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input);
    renderMessage(userMsg);
    
    inputField.value = ""; 

    setTimeout(async () => {
        const aiText = generateResponse(input);
        if (aiText) {
            const aiMsg = { role: "assistant", content: aiText, feedback: null };
            brain.history.push(aiMsg);
            processInput(aiText);
            renderMessage(aiMsg);
        }
        await saveBrain();
    }, 600);
}

function generateResponse(userInput) {
    const wordKeys = Object.keys(brain.words);
    if (wordKeys.length < 2) return null;

    const inputWords = userInput.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    let currentWord = inputWords.find(w => brain.words[w]) || wordKeys[Math.floor(Math.random() * wordKeys.length)];
    
    let sentence = [currentWord];
    for (let i = 0; i < 10; i++) {
        const wordData = brain.words[currentWord];
        if (!wordData || !wordData.links || wordData.links.length === 0) break;

        // Weighting logic: Favors words you've liked (+)
        const links = wordData.links.sort((a, b) => (brain.words[b]?.sentiment || 0) - (brain.words[a]?.sentiment || 0));
        const nextWord = Math.random() > 0.3 ? links[0] : links[Math.floor(Math.random() * links.length)];
        
        sentence.push(nextWord);
        currentWord = nextWord;
        if (i > 4 && Math.random() > 0.7) break;
    }
    return sentence.join(" ");
}

function processInput(text) {
    const tokens = text.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(t => t.length > 0);
    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        const next = tokens[i+1];
        if (!brain.words[word]) brain.words[word] = { seen: 1, links: [], sentiment: 0 };
        else brain.words[word].seen++;
        if (next && !brain.words[word].links.includes(next)) brain.words[word].links.push(next);
    }
}

// --- UI & SYNC ---

function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const index = brain.history.length - 1;
    const isAi = msg.role === "assistant";
    const buttons = isAi ? `<div class="feedback-btns"><button onclick="giveFeedback(${index}, 'like')">(+)</button><button onclick="giveFeedback(${index}, 'dislike')">(-)</button></div>` : "";
    
    chatBox.innerHTML += `<div id="msg-${index}" class="message ${msg.role}"><div class="msg-content">${msg.content}</div>${buttons}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function giveFeedback(index, type) {
    const msg = brain.history[index];
    const el = document.getElementById(`msg-${index}`);
    if (!msg || !el) return;
    
    msg.feedback = type;
    el.style.backgroundColor = type === 'like' ? "#1b5e20" : "#b71c1c";
    
    const words = msg.content.toLowerCase().split(/\s+/);
    words.forEach(w => { if(brain.words[w]) brain.words[w].sentiment += (type === 'like' ? 2 : -2); });
    await saveBrain();
}

async function saveBrain() {
    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            mode: "cors", // Forces the handshake
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (e) { console.warn("Sync failed"); }
}

window.onload = async () => {
    try {
        const res = await fetch("https://raw.githubusercontent.com/RayTheFemboy/god-hivemind/main/brain.json?v=" + Date.now());
        if (res.ok) {
            brain = await res.json();
            console.log("Brain loaded!");
        }
    } catch (e) { console.warn("Fresh start"); }
};
