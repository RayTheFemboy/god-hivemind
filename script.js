let brain = {
    words: {},
    patterns: [],
    history: []
};

// Main function to handle sending messages
async function sendMessage() {
    const inputField = document.getElementById("userInput");
    const input = inputField.value;

    if (!input || !input.trim()) return;

    // 1. Process and Display User Message
    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    
    inputField.value = ""; // Clear input immediately

    // 2. Generate AI Response (Organic only)
    setTimeout(async () => {
        const aiText = generateResponse();
        
        // Only render if the AI has actually learned a pattern to say
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

// Strictly organic: only uses what it has learned from patterns
function generateResponse() {
    if (brain.patterns.length === 0) return null;
    
    // Selects a random pattern learned from the user
    const randomIndex = Math.floor(Math.random() * brain.patterns.length);
    const pattern = brain.patterns[randomIndex];
    
    // Returns the text if it's a string, or the text property if it's an object
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
    
    // Only AI messages get the (+) and (-) rating buttons
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
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
}

async function giveFeedback(index, type) {
    const msg = brain.history[index];
    const element = document.getElementById(`msg-${index}`);
    
    if (!msg || !element) return;

    msg.feedback = type;

    // "Color in" the box based on selection
    if (type === 'like') {
        element.style.backgroundColor = "#1b5e20"; // Dark Green
        element.style.borderColor = "#00e676";
    } else {
        element.style.backgroundColor = "#b71c1c"; // Dark Red
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
        const response = await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
        
        if (!response.ok) console.error("Sync failed:", response.status);
    } catch (err) {
        console.error("CORS/Sync error: Check your Cloudflare Worker headers.", err);
    }
}
