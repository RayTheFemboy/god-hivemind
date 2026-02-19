import json
import subprocess
import os

def merge_word(existing, new):
    existing["seen"] = existing.get("seen", 0) + new.get("seen", 0)
    # Average the sentiment or sum it
    existing["sentiment"] = existing.get("sentiment", 0) + new.get("sentiment", 0)
    
    if existing.get("definition") is None:
        existing["definition"] = new.get("definition")
    
    if "links" not in existing: existing["links"] = []
    for link in new.get("links", []):
        if link not in existing["links"]:
            existing["links"].append(link)

# Initialize master brain
merged = {"words": {}, "patterns": [], "history": []}

try:
    output = subprocess.check_output(["git", "log", "--pretty=format:%H", "--", "brain.json"])
    commits = output.decode().splitlines()
except:
    commits = []

for commit in commits:
    subprocess.run(["git", "checkout", commit, "--", "brain.json"], capture_output=True)
    if not os.path.exists("brain.json"): continue
    
    try:
        with open("brain.json", "r") as f:
            data = json.load(f)
        
        # Merge Words with Sentiment
        if "words" in data:
            for w, info in data["words"].items():
                if w not in merged["words"]:
                    merged["words"][w] = {
                        "definition": info.get("definition"),
                        "seen": info.get("seen", 0),
                        "links": info.get("links", [])[:],
                        "sentiment": info.get("sentiment", 0)
                    }
                else:
                    merge_word(merged["words"][w], info)
        
        # Merge Patterns (checking for 'text' and 'author' structure)
        if "patterns" in data:
            for p in data["patterns"]:
                # Handle old string format vs new object format
                p_text = p["text"] if isinstance(p, dict) else p
                if p_text not in [pt if isinstance(pt, str) else pt.get("text") for pt in merged["patterns"]]:
                    merged["patterns"].append(p)

    except Exception as e:
        print(f"Skipping commit {commit}: {e}")

# Return to main branch
subprocess.run(["git", "checkout", "main", "--", "brain.json"], capture_output=True)

with open("brain.json", "w") as f:
    json.dump(merged, f, indent=4)
