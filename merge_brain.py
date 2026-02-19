import json
import subprocess
import os

# Get all commits that touched brain.json
try:
    output = subprocess.check_output(["git", "log", "--pretty=format:%H", "--", "brain.json"])
    commits = output.decode().splitlines()
except:
    commits = []

merged = {
    "words": {},
    "patterns": [],
    "history": []
}

def merge_word(existing, new):
    existing["seen"] = existing.get("seen", 0) + new.get("seen", 0)
    if existing.get("definition") is None:
        existing["definition"] = new.get("definition")
    
    # Ensure links exist
    if "links" not in existing: existing["links"] = []
    for link in new.get("links", []):
        if link not in existing["links"]:
            existing["links"].append(link)

for commit in commits:
    # Safely get file from commit
    subprocess.run(["git", "checkout", commit, "--", "brain.json"], capture_output=True)
    if not os.path.exists("brain.json"): continue
    
    try:
        with open("brain.json", "r") as f:
            data = json.load(f)
        
        # Guard against different JSON structures
        if "words" in data:
            for w, info in data["words"].items():
                if w not in merged["words"]:
                    merged["words"][w] = {
                        "definition": info.get("definition"),
                        "seen": info.get("seen", 0),
                        "links": info.get("links", [])[:]
                    }
                else:
                    merge_word(merged["words"][w], info)
        
        if "patterns" in data:
            for p in data["patterns"]:
                if p not in merged["patterns"]:
                    merged["patterns"].append(p)
                    
    except Exception as e:
        print(f"Skipping messy commit {commit}: {e}")

# Return to head before saving
subprocess.run(["git", "checkout", "main", "--", "brain.json"], capture_output=True)

with open("brain.json", "w") as f:
    json.dump(merged, f, indent=4)
