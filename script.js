let brain = {
    words: {},
    patterns: [],
    history: []
};

async function sendMessage() {
    const input = document.getElementById("userInput").value;
    if (!input.trim()) return;

    // 1. Create User Data
    const userMessage = {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    
    // 2. Process and Learn (Silent)
    processInput(input, "user");
    brain.history.push(userMessage);

    // 3. Update UI (Only shows User)
    renderMessage(userMessage);
    document.getElementById("userInput").value = "";

    // 4. Sync to Cloudflare/GitHub
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
        
        tokens.forEach(link => {
            if (link !== word && !brain.words[word].links.includes(link)) {
                brain.words[word].links.push(link);
            }
        });
    });

    brain.patterns.push({ text: cleanText, author: role });
}

async function giveFeedback(index, type) {
    const msg = brain.history[index];
    msg.feedback = type;

    const tokens = msg.content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    await saveBrain();
    document.getElementById(`msg-${index}`).style.borderLeft = type === 'like' ? "4px solid #03dac6" : "4px solid #cf6679";
}

function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    const index = brain.history.length - 1;
    
    const html = `
        <div id="msg-${index}" class="message user">
            <div>${msg.content}</div>
            <div class="feedback-btns">
                <button onclick="giveFeedback(${index}, 'like')">(+)</button>
                <button onclick="giveFeedback(${index}, 'dislike')">(-)</button>
            </div>
        </div>
    `;
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;
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
