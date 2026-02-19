let brain = {
    words: {},
    patterns: [],
    history: []
};

async function sendMessage() {
    const input = document.getElementById("userInput").value;
    
    // Check if input is empty
    if (!input || !input.trim()) {
        console.log("Input is empty, stopping.");
        return;
    }

    console.log("Sending message:", input);

    // 1. Create the data object
    const userMessage = {
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    
    // 2. Add to history and process
    brain.history.push(userMessage);
    processInput(input, "user");

    // 3. Show it on the screen
    renderMessage(userMessage);

    // 4. Clear the text area immediately
    document.getElementById("userInput").value = "";

    // 5. Send to Cloudflare
    await saveBrain();
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
        
        tokens.forEach(link => {
            if (link !== word && !brain.words[word].links.includes(link)) {
                brain.words[word].links.push(link);
            }
        });
    });

    brain.patterns.push({ text: cleanText, author: role });
}

function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) {
        console.error("Could not find chatBox element!");
        return;
    }

    const index = brain.history.length - 1;
    
    // This creates the message bubble
    const html = `
        <div id="msg-${index}" class="message user">
            <div class="msg-content">${msg.content}</div>
            <div class="feedback-btns">
                <button onclick="giveFeedback(${index}, 'like')">(+)</button>
                <button onclick="giveFeedback(${index}, 'dislike')">(-)</button>
            </div>
        </div>
    `;
    
    chatBox.innerHTML += html;
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function giveFeedback(index, type) {
    const msg = brain.history[index];
    if (!msg) return;

    msg.feedback = type;
    const tokens = msg.content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    console.log(`Rated message ${index} as ${type}`);
    await saveBrain();
    
    // Visual feedback for the rating
    const element = document.getElementById(`msg-${index}`);
    if (element) {
        element.style.borderLeft = type === 'like' ? "4px solid #03dac6" : "4px solid #cf6679";
    }
}

async function saveBrain() {
    try {
        const response = await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
        console.log("Cloudflare Response:", await response.text());
    } catch (err) {
        console.error("Failed to sync brain:", err);
    }
}
