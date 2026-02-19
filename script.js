let brain = {
    words: {},
    patterns: [], // We keep this for history, but won't use it for generating
    history: []
};

async function sendMessage() {
    const inputField = document.getElementById("userInput");
    const input = inputField.value;

    if (!input || !input.trim()) return;

    const userMsg = { role: "user", content: input };
    brain.history.push(userMsg);
    processInput(input, "user");
    renderMessage(userMsg);
    
    inputField.value = "";

    setTimeout(async () => {
        // AI strictly builds a sentence from word associations
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

// THE GENERATOR: Builds a sentence word by word
function generateResponse(userInput) {
    const wordKeys = Object.keys(brain.words);
    if (wordKeys.length < 3) return null;

    // Try to start with a word the user just typed
    const inputWords = userInput.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    let currentWord = inputWords.find(w => brain.words[w]) || wordKeys[Math.floor(Math.random() * wordKeys.length)];
    
    let sentence = [currentWord];
    let limit = 10; // Max sentence length

    for (let i = 0; i < limit; i++) {
        const wordData = brain.words[currentWord];
        
        // If the word has no links (it was the end of a sentence), stop or pick random
        if (!wordData || !wordData.links || wordData.links.length === 0) break;

        // Pick a "link" (a word that followed this word before)
        const nextWord = wordData.links[Math.floor(Math.random() * wordData.links.length)];
        
        sentence.push(nextWord);
        currentWord = nextWord;

        // Randomly decide to end the sentence if it's long enough
        if (i > 3 && Math.random() > 0.7) break;
    }

    return sentence.join(" ");
}

// THE LEARNER: Maps how words connect to each other
function processInput(text, role) {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/gi, '');
    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        const nextWord = tokens[i + 1]; // The word that follows

        if (!brain.words[word]) {
            brain.words[word] = { seen: 1, links: [], sentiment: 0 };
        } else {
            brain.words[word].seen += 1;
        }

        // IMPORTANT: This records that 'nextWord' follows 'word'
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
    element.style.backgroundColor = type === 'like' ? "#1b5e20" : "#b71c1c";
    element.style.borderColor = type === 'like' ? "#00e676" : "#ff5252";

    const tokens = msg.content.toLowerCase().split(/\s+/);
    tokens.forEach(word => {
        if (brain.words[word]) {
            brain.words[word].sentiment += (type === 'like' ? 1 : -1);
        }
    });

    await saveBrain();
}

async function saveBrain() {
    // Backup to LocalStorage because of school filters
    localStorage.setItem('jackson_brain', JSON.stringify(brain));

    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (err) {
        console.warn("Sync blocked by firewall. Saving locally.");
    }
}

// Reload brain from memory when opening the page
window.onload = () => {
    const saved = localStorage.getItem('jackson_brain');
    if (saved) brain = JSON.parse(saved);
};
