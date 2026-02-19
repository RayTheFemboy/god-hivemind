let brain = {
    words: {},
    patterns: [],
    history: []
};

async function sendMessage() {
    const input = document.getElementById("userInput").value;
    if (!input || !input.trim()) return;

    // 1. Process User Input
    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    document.getElementById("userInput").value = "";

    // 2. AI Responds (Simple pattern matching from its own brain)
    const aiText = generateResponse(input);
    const aiMsg = { role: "assistant", content: aiText, feedback: null };
    
    // AI learns from itself too (structure-wise)
    processInput(aiText, "assistant");
    brain.history.push(aiMsg);
    
    // Small delay to make it feel like it's "thinking"
    setTimeout(() => {
        renderMessage(aiMsg);
    }, 500);

    await saveBrain();
}

// Simple logic to make the AI "talk" using words it knows
function generateResponse(input) {
    const knownWords = Object.keys(brain.words);
    if (knownWords.length < 3) return "I am still listening and learning...";
    
    // Picks a random pattern it has seen before
    const randomPattern = brain.patterns[Math.floor(Math.random() * brain.patterns.length)];
    const patternText = typeof randomPattern === 'string' ? randomPattern : randomPattern.text;
    
    return patternText || "Interesting. Tell me more.";
}

function processInput(text, role) {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);

    tokens.forEach(word => {
        if (!brain.words[word]) {
            brain.words[word] = { seen: 1, links: [], sentiment: 0 };
        } else {
            brain.words[word].seen += 1;
        }
    });
    brain.patterns.push({ text: cleanText, author: role });
}

function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const index = brain.history.length - 1;
    const isAi = msg.role === "assistant";
    
    // Only add buttons if it's the AI speaking
    const buttons = isAi ? `
        <div class="feedback-btns">
            <button onclick="giveFeedback(${index}, 'like')">(+)</button>
            <button onclick="giveFeedback(${index}, 'dislike')">(-)</button>
        </div>` : "";

    const html = `
        <div id="msg-${index}" class="message ${msg.role}">
            <div class="msg-content">${msg.content}</div>
            ${buttons}
        </div>
    `;
    
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function giveFeedback(index, type) {
    const msg = brain.history[index];
    const element = document.getElementById(`msg-${index}`);
    
    msg.feedback = type;

    // Color in the box based on selection
    if (type === 'like') {
        element.style.backgroundColor = "#1b5e20"; // Dark Green
        element.style.borderColor = "#00e676";
    } else {
        element.style.backgroundColor = "#b71c1c"; // Dark Red
        element.style.borderColor = "#ff5252";
    }

    // Update word sentiment
    const tokens = msg.content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    await saveBrain();
}

async function saveBrain() {
    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (err) { console.error("Sync error"); }
}
