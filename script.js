let brain = {
    words: {},
    patterns: [],
    history: []
};

async function sendMessage() {
    const inputField = document.getElementById("userInput");
    const input = inputField.value;

    if (!input || !input.trim()) return;

    // 1. Process and Display User Message
    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    
    inputField.value = "";

    // 2. Generate AI Response from learned data
    setTimeout(async () => {
        const aiText = generateResponse();
        
        // Only show a response if the AI actually has something learned to say
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

        // 3. Sync to Cloudflare/GitHub
        await saveBrain();
    }, 600);
}

// Strictly organic response generation
function generateResponse() {
    if (brain.patterns.length === 0) return null;
    
    // Selects a random pattern learned from the user or previous successful AI outputs
    const randomIndex = Math.floor(Math.random() * brain.patterns.length);
    const pattern = brain.patterns[randomIndex];
    
    // Returns the learned text, or null if nothing exists
    return typeof pattern === 'string' ? pattern : (pattern.text || null);
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
    } catch (err) {
        console.error("Sync error: Check CORS settings in Worker.", err);
    }
}
