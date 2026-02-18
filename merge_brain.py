import json
import subprocess

# Get all commits that touched brain.json
output = subprocess.check_output(["git", "log", "--pretty=format:%H", "--", "brain.json"])
commits = output.decode().splitlines()

merged = {
    "words": {},
    "patterns": [],
    "history": []
}

def merge_word(existing, new):
    # Additive seen count
    existing["seen"] += new.get("seen", 0)

    # Conservative definition
    if existing["definition"] is None and new.get("definition"):
        existing["definition"] = new["definition"]

    # Additive links
    for link in new.get("links", []):
        if link not in existing["links"]:
            existing["links"].append(link)

for commit in commits:
    subprocess.run(["git", "checkout", commit, "--", "brain.json"])
    with open("brain.json", "r") as f:
        data = json.load(f)

    # Merge words
    for w, info in data["words"].items():
        if w not in merged["words"]:
            merged["words"][w] = {
                "definition": info["definition"],
                "seen": info["seen"],
                "links": info["links"][:]
            }
        else:
            merge_word(merged["words"][w], info)

    # Merge patterns (additive)
    for p in data["patterns"]:
        if p not in merged["patterns"]:
            merged["patterns"].append(p)

# Write final merged brain
with open("brain.json", "w") as f:
    json.dump(merged, f, indent=4)
