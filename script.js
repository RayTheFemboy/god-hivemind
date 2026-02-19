let brain = {
    words: {},
    patterns: [],
    history: []
};

// 1. GENERATOR: Uses "Weighted" links (favors Green/Liked words)
function generateResponse(userInput) {
    const wordKeys = Object.keys(brain.words);
    if (wordKeys.length < 3) return null;

    const inputWords = userInput.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    let currentWord = inputWords.find(w => brain.words[w]) || wordKeys[Math.floor(Math.random() * wordKeys.length)];
    
    let sentence = [currentWord];
    let limit = 12; 

    for (let i = 0; i < limit; i++) {
        const wordData = brain.words[currentWord];
        
        // Random jump (15% chance) to keep things fresh
        if (!wordData || !wordData.links || wordData.links.length === 0 || Math.random() > 0.85) {
            currentWord = wordKeys[Math.floor(Math.random() * wordKeys.length)];
            continue; 
        }

        // WEIGHTED SELECTION: Favor links with better sentiment
        const sortedLinks = [...wordData.links].sort((a, b) => {
            const sentA = brain.words[a]?.sentiment || 0;
            const sentB = brain.words[b]?.sentiment || 0;
            return sentB - sentA; 
        });

        // 70% chance to pick the "best" (liked) word, 30% to pick a random link
        const nextWord = Math.random() > 0.3 ? sortedLinks[0] : sortedLinks[Math.floor(Math.random() * sortedLinks.length)];
        
        if (nextWord !== currentWord) {
            sentence.push(nextWord);
            currentWord = nextWord;
        }
        if (i > 5 && Math.random() > 0.6) break;
    }
    return sentence.join(" ");
}

// 2. FEEDBACK: Boosts sentiment scores for words in liked sentences
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
            // Jackson "learns" to like/avoid these words
            brain.words[word].sentiment += (type === 'like' ? 2 : -2);
        }
    });
    await saveBrain();
}

// 3. UPLOAD/DOWNLOAD: For moving the brain between Home and School
function downloadBrain() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(brain));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "jackson_brain.json");
    dlAnchor.click();
}

function uploadBrain(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        brain = JSON.parse(e.target.result);
        localStorage.setItem('jackson_brain', JSON.stringify(brain));
        alert("Brain Uploaded! Jackson is ready.");
        location.reload(); // Refresh to apply the new brain
    };
    reader.readAsText(file);
}

// 4. STORAGE & SYNC
async function saveBrain() {
    localStorage.setItem('jackson_brain', JSON.stringify(brain));
    try {
        await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain })
        });
    } catch (err) {
        console.warn("Sync failed (likely school firewall).");
    }
}

window.onload = () => {
    const saved = localStorage.getItem('jackson_brain');
    if (saved) brain = JSON.parse(saved);
};
