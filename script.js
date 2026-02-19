let brain = {
    words: {},
    patterns: [],
    history: []
};

// 1. THE SEND FUNCTION
async function sendMessage() {
    const inputField = document.getElementById("userInput");
    const input = inputField ? inputField.value : "";

    if (!input || !input.trim()) return;

    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    
    inputField.value = ""; 

    setTimeout(async () => {
        const aiText = generateResponse(input);
        
        if (aiText) {
            const aiMsg = { role: "assistant", content: aiText, feedback: null };
            brain.history.push(aiMsg);
            processInput(aiText, "assistant");
            renderMessage(aiMsg);
        }
        await saveBrain();
    }, 600);
}

// 2. GENERATOR (Weighted Logic)
function generateResponse(userInput) {
    const wordKeys = Object.keys(brain.words);
    if (wordKeys.length < 3) return "I am still learning...";

    const inputWords = userInput.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    let currentWord = inputWords.find(w => brain.words[w]) || wordKeys[Math.floor(Math.random() * wordKeys.length)];
    
    let sentence = [currentWord];
    let limit = 12; 

    for (let i = 0; i < limit; i++) {
        const wordData = brain.words[currentWord];
        
        if (!wordData || !wordData.links || wordData.links.length === 0 || Math.random() > 0.85) {
            currentWord = wordKeys[Math.floor(Math.random() * wordKeys.length)];
            continue; 
        }

        const sortedLinks = [...wordData.links].sort((a, b) => {
            const sentA = brain.words[a]?.sentiment || 0;
            const sentB = brain.words[b]?.sentiment || 0;
            return sentB - sentA; 
        });

        const nextWord = Math.random() > 0.3 ? sortedLinks[0] : sortedLinks[Math.floor(Math.random() * sortedLinks.length)];
        
        if (nextWord !== currentWord) {
            sentence.push(nextWord);
            currentWord = nextWord;
        }
        if (i > 5 && Math.random() > 0.6) break;
    }
    return sentence.join(" ");
}

// 3. LEARNER
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

        if (nextWord && !brain.words[word].links.includes(nextWord)) {
            brain.words[word].links.push(nextWord);
        }
    }
}

// 4. UI RENDERING
function renderMessage(msg) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

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

// 5. FEEDBACK
async function giveFeedback(index, type) {
    const msg = brain.history[index];
    const element = document.getElementById(`msg-${index}`);
    if (!msg || !element) return;

    msg.feedback = type;
    element.style.backgroundColor = type === 'like' ? "#1b5e20" : "#b71c1c";
    element.style.borderColor = type === 'like' ? "#00e676" : "#ff5252";

    const tokens = msg.content.toLowerCase().split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 2 : -2);
        }
    });
    await saveBrain();
}

// 6. SYNC SAVING (No LocalStorage)
async function saveBrain() {
    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (err) {
        console.warn("Sync blocked by network.");
    }
}

// 7. LOAD FROM GITHUB (Worker)
window.onload = async () => {
    try {
        // We add a random number to the URL to prevent the browser from caching the JSON
        const response = await fetch("https://raw.githubusercontent.com/RayTheFemboy/god-hivemind/main/brain.json?nocache=" + Math.random());
        if (response.ok) {
            brain = await response.json();
            console.log("Brain synced from GitHub!");
        }
    } catch (e) {
        console.error("Could not load brain from GitHub. Starting fresh.");
    }
};
