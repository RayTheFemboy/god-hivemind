let brain = {
    words: {},
    patterns: [],
    history: []
};

async function sendMessage() {
    const inputField = document.getElementById("userInput");
    const input = inputField.value;

    if (!input || !input.trim()) return;

    // 1. Process User Message
    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    
    inputField.value = "";

    // 2. Generate AI Response using word-links
    setTimeout(async () => {
        const aiText = generateResponse(input);
        
        if (aiText) {
            const aiMsg = { 
                role: "assistant", 
                content: aiText, 
                feedback: null 
            };
            
            brain.history.push(aiMsg);
            processInput(aiText, "assistant");
            renderMessage(aiMsg);
        }

        await saveBrain();
    }, 600);
}

// Organic Word-Association Generator
function generateResponse(userInput) {
    const wordKeys = Object.keys(brain.words);
    if (wordKeys.length < 5) return null; // Wait until it knows enough words

    // Pick a starting word from the user's input if possible, otherwise random
    const inputWords = userInput.toLowerCase().split(/\s+/);
    let currentWord = inputWords.find(w => brain.words[w]) || wordKeys[Math.floor(Math.random() * wordKeys.length)];
    
    let sentence = [currentWord];
    let maxLength = 8; // Keep sentences reasonably short

    for (let i = 0; i < maxLength; i++) {
        const wordData = brain.words[currentWord];
        if (!wordData || wordData.links.length === 0) break;

        // Pick a next word from the links associated with the current word
        const nextWord = wordData.links[Math.floor(Math.random() * wordData.links.length)];
        sentence.push(nextWord);
        currentWord = nextWord;

        // 20% chance to stop early if the sentence is getting long
        if (i > 3 && Math.random() > 0.8) break;
    }

    return sentence.join(" ");
}

function processInput(text, role) {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        const nextWord = tokens[i + 1];

        if (!brain.words[word]) {
            brain.words[word] = { seen: 1, links: [], sentiment: 0 };
        } else {
            brain.words[word].seen += 1;
        }

        // Link this word to the one that follows it
        if (nextWord && !brain.words[word].links.includes(nextWord)) {
            brain.words[word].links.push(nextWord);
        }
    }

    brain.patterns.push({ text: cleanText, author: role });
}

function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const index = brain.history.length - 1;
    const isAi = msg.role === "assistant";
    
    // Buttons only show for AI
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
    
    if (!msg || !element) return;

    msg.feedback = type;

    if (type === 'like') {
        element.style.backgroundColor = "#1b5e20"; 
        element.style.borderColor = "#00e676";
    } else {
        element.style.backgroundColor = "#b71c1c"; 
        element.style.borderColor = "#ff5252";
    }

    const tokens = msg.content.toLowerCase().split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    await saveBrain();
}

async function saveBrain() {
    // Attempting to save to LocalStorage so it works even if school blocks the worker
    localStorage.setItem('jackson_brain', JSON.stringify(brain));

    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (err) {
        console.warn("Worker blocked by school filter. Saving to browser memory instead.");
    }
}

// Load brain from LocalStorage on startup
window.onload = () => {
    const saved = localStorage.getItem('jackson_brain');
    if (saved) brain = JSON.parse(saved);
};
