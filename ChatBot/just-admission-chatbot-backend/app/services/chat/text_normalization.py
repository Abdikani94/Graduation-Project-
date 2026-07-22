import re
from difflib import get_close_matches
from typing import Iterable


# Frequent Somali keyboard spellings plus common English admission typos.
# Canonicalization improves retrieval only; answers still come from the dataset.
ALIASES = {
    "xage": "xagee", "xagey": "xagee", "halke": "halkee",
    "side": "sidee", "sidn": "sideen", "tla": "taalaa",
    "tala": "taalaa", "talaa": "taalaa",
    "jamacada": "jaamacadda", "jamacadda": "jaamacadda",
    "diwan": "diiwaan", "diwaan": "diiwaan", "diiwan": "diiwaan",
    "isdiiwan": "isdiiwaan", "isdiwan": "isdiiwaan",
    "galiya": "geliyaa", "galiyaa": "geliyaa", "gelia": "geliyaa",
    "dokument": "dukumenti", "document": "dukumenti",
    "lacg": "lacag", "lacgta": "lacagta",
    "kuliyad": "kulliyad", "kulyad": "kulliyad",
    "caafimad": "caafimaad", "scholership": "scholarship",
    "requirment": "requirement", "admision": "admission",
    "addmission": "admission", "registrtion": "registration",
    "universty": "university",
}

DOMAIN_VOCABULARY = {
    "admission", "application", "apply", "campus", "certificate",
    "computer", "department", "diiwaan", "diiwaangelin", "documents",
    "engineering", "faculty", "fees", "graduation", "halkee", "hostel",
    "jaamacadda", "jamhuriya", "kulliyad", "lacag", "medicine", "nursing",
    "program", "register", "registration", "requirement", "scholarship",
    "student", "taalaa", "university", "xagee",
}


def normalize_query(text: str, extra_vocabulary: Iterable[str] = ()) -> str:
    normalized = text.lower().strip().replace("â€™", "'")
    normalized = re.sub(r"[^a-z0-9\s'$]", " ", normalized)
    tokens = re.sub(r"\s+", " ", normalized).strip().split()
    vocabulary = DOMAIN_VOCABULARY | {
        word.lower() for word in extra_vocabulary if len(word) >= 3
    }

    corrected: list[str] = []
    for token in tokens:
        if token in ALIASES:
            corrected.append(ALIASES[token])
        elif token in vocabulary or len(token) < 3:
            corrected.append(token)
        else:
            cutoff = 0.68 if len(token) <= 4 else 0.76
            match = get_close_matches(token, vocabulary, n=1, cutoff=cutoff)
            corrected.append(match[0] if match else token)

    result = " ".join(corrected)
    for source, target in {
        "is diiwaan": "isdiiwaan",
        "isku diiwaan geliyaa": "isku diiwaangeliyaa",
        "diiwaan geliyaa": "diiwaangeliyaa",
    }.items():
        result = result.replace(source, target)
    return result
