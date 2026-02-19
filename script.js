// NEW: AI favors words with higher sentiment (likes)
function generateResponse(userInput) {
    const wordKeys = Object.keys(brain.words);
    if (wordKeys.length < 3) return null;

    const inputWords = userInput.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    let currentWord = inputWords.find(w => brain.words[w]) || wordKeys[Math.floor(Math.random() * wordKeys.length)];
    
    let sentence = [currentWord];
    let limit = 12; 

    for (let i = 0; i < limit; i++) {
        const wordData = brain.words[currentWord];
        
        // Random jump chance (reduced to 15% to allow learning to shine)
        if (!wordData || !wordData.links || wordData.links.length === 0 || Math.random() > 0.85) {
            currentWord = wordKeys[Math.floor(Math.random() * wordKeys.length)];
            continue; 
        }

        // WEIGHTED SELECTION: Favor links with better sentiment
        // We sort the links so words with higher sentiment have a better chance
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

// Updated Feedback: Now affects word weights immediately
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
            // Stronger weight: +2 for like, -2 for dislike
            brain.words[word].sentiment += (type === 'like' ? 2 : -2);
        }
    });

    console.log("Brain updated with sentiment. Jackson will now favor/avoid these words.");
    await saveBrain();
}

// NEW: Manual Download Function for school use
function downloadBrain() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(brain, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "jackson_brain.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
