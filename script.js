// Your AI's brain object
let brain = {
    messages: []
};

// Called when the user clicks the Send button
async function sendMessage() {
    const input = document.getElementById("userInput").value;

    if (!input.trim()) return;

    // Add message to brain
    brain.messages.push({
        role: "user",
        content: input
    });

    // Save brain to Cloudflare Worker
    await saveBrain();

    console.log("Message sent and brain saved.");
}

// Sends the brain to your Cloudflare Worker
async function saveBrain() {
    try {
        const response = await fetch("https://cloudy-boi.raythefemboy.workers.dev/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ brain })
        });

        const text = await response.text();
        console.log("Worker response:", text);

    } catch (err) {
        console.error("Error saving brain:", err);
    }
}
