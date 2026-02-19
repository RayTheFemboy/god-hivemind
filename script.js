let brain = {
    words: {},
    patterns: [],
    history: []
};

// Main function triggered by the Send button
async function sendMessage() {
    const inputField = document.getElementById("userInput");
    const input = inputField.value;

    if (!input || !input.trim()) return;

    // 1. Process and Display User Message
    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    
    // Clear input immediately for better UX
    inputField.value = "";

    // 2. Generate and Display AI Response
    // We wait a moment to simulate the AI "thinking"
    setTimeout(async () => {
        const aiText = generateResponse(input);
        const aiMsg = { 
            role: "assistant", 
            content: aiText, 
            feedback: null 
        };
        
        brain.history.push(aiMsg);
        processInput(aiText, "assistant"); // AI learns from its own structure
        renderMessage(aiMsg);

        // 3. Sync the updated brain to Cloudflare/GitHub
        await saveBrain();
    }, 600);
}

// Simple logic to make the AI talk using patterns it has learned
function generateResponse(input) {
    if (brain.patterns.length < 2) {
        return "I am still listening and learning from you.";
    }
    
    // Picks a random pattern previously learned
    const randomIndex = Math.floor(Math.random() * brain.patterns.length);
    const pattern = brain.patterns[randomIndex];
    
    // Patterns are stored as objects {text: "...", author: "..."}
    return pattern.text || "Tell me more about that.";
}

// Breaks down sentences into words and patterns for the JSON brain
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

// Handles the visual side of the chat
function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const index = brain.history.length - 1;
    const isAi = msg.role === "assistant";
    
    // Only AI messages get the rating buttons (+) and (-)
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

// Updates sentiment and highlights the box (Green for Like, Red for Dislike)
async function giveFeedback(index, type) {
    const msg = brain.history[index];
    const element = document.getElementById(`msg-${index}`);
    
    if (!msg || !element) return;

    msg.feedback = type;

    // Apply the "Selected" colors
    if (type === 'like') {
        element.style.backgroundColor = "#1b5e20"; // Deep Green
        element.style.borderColor = "#00e676";
    } else {
        element.style.backgroundColor = "#b71c1c"; // Deep Red
        element.style.borderColor = "#ff5252";
    }

    // Adjust word sentiment in the brain
    const tokens = msg.content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    // Save the sentiment change to GitHub
    await saveBrain();
}

// Sends the data to your Cloudflare Worker
async function saveBrain() {
    try {
        const response = await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ brain })
        });
        
        if (!response.ok) {
            console.error("Worker rejected the sync:", response.status);
        }
    } catch (err) {
        console.error("Sync error: Ensure your Worker has CORS enabled.", err);
    }
}
