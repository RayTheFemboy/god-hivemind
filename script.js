let brain = {
    words: {},
    patterns: [],
    history: [] // Now tracks 'role' to tell who is talking
};

async function sendMessage() {
    const input = document.getElementById("userInput").value;
    if (!input.trim()) return;

    // 1. Process User Input
    const userMessage = {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    
    processInput(input, "user");
    brain.history.push(userMessage);

    // 2. Display message and Clear Input
    renderMessage(userMessage);
    document.getElementById("userInput").value = "";

    // 3. Simple AI "Response" Logic (For demonstration)
    // In a real setup, your Worker or Java backend would generate this
    const aiResponse = {
        role: "assistant",
        content: "I am learning from: " + input,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    
    processInput(aiResponse.content, "assistant");
    brain.history.push(aiResponse);
    renderMessage(aiResponse);

    // 4. Sync to GitHub
    await saveBrain();
}

function processInput(text, role) {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    const tokens = cleanText.split(/\s+/);

    tokens.forEach(word => {
        if (!brain.words[word]) {
            brain.words[word] = { seen: 1, links: [], sentiment: 0 };
        } else {
            brain.words[word].seen += 1;
        }
        
        // Associate words
        tokens.forEach(link => {
            if (link !== word && !brain.words[word].links.includes(link)) {
                brain.words[word].links.push(link);
            }
        });
    });

    // Patterns now track who said them
    brain.patterns.push({ text: cleanText, author: role });
}

// Feedback Logic
async function giveFeedback(index, type) {
    const msg = brain.history[index];
    msg.feedback = type; // 'like' or 'dislike'

    // Adjust word sentiment based on feedback
    const tokens = msg.content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    console.log(`Message ${index} ${type}d`);
    await saveBrain();
    // Refresh UI to show active button state
    document.getElementById(`msg-${index}`).classList.add(type);
}

// UI Rendering
function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const index = brain.history.length - 1;
    
    const html = `
        <div id="msg-${index}" class="message ${msg.role}">
            <p>${msg.content}</p>
            <div class="feedback-btns">
                <button onclick="giveFeedback(${index}, 'like')">👍</button>
                <button onclick="giveFeedback(${index}, 'dislike')">👎</button>
            </div>
        </div>
    `;
    chatBox.innerHTML += html;
}

async function saveBrain() {
    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (err) { console.error("Sync error:", err); }
}
