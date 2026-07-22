import re
from dataclasses import dataclass
from enum import Enum

from app.services.chat.text_normalization import normalize_query


class ChatIntent(str, Enum):
    SMALL_TALK = "small_talk"
    INAPPROPRIATE = "inappropriate"
    OUT_OF_SCOPE = "out_of_scope"
    ADMISSION_DIRECT_ANSWER = "admission_direct_answer"
    ADMISSION_QUESTION = "admission_question"


@dataclass(frozen=True)
class IntentResult:
    intent: ChatIntent
    response: str | None = None
    rewritten_query: str | None = None


class IntentService:
    def analyze(self, message: str) -> IntentResult:
        normalized = self._normalize(message)

        small_talk_response = self._get_small_talk_response(normalized)
        if small_talk_response:
            return IntentResult(
                intent=ChatIntent.SMALL_TALK,
                response=small_talk_response,
            )

        if self._is_out_of_scope(normalized):
            return IntentResult(
                intent=ChatIntent.OUT_OF_SCOPE,
                response=(
                    "Walaal waxaan halkan u joogaa inaan kaa caawiyo su’aalaha "
                    "la xiriira JUST admission-ka, kulliyadaha, lacagaha, "
                    "diiwaangelinta, scholarships, hostel, exams, graduation, "
                    "iyo adeegyada ardayda. Ii weydii su’aal la xiriirta JUST admission-ka."
                ),
            )

        if self._is_inappropriate(normalized):
            return IntentResult(
                intent=ChatIntent.INAPPROPRIATE,
                response=(
                    "Walaal 😊 waxaan halkan u joogaa inaan kaa caawiyo "
                    "su’aalaha la xiriira JUST admission-ka, kulliyadaha, "
                    "lacagaha, diiwaangelinta, scholarships, iyo adeegyada ardayda. "
                    "Su’aal admission ah ii sheeg."
                ),
            )

        if self._is_unknown_course_or_subject_question(normalized):
            return IntentResult(
                intent=ChatIntent.ADMISSION_DIRECT_ANSWER,
                response=(
                    "Walaal su’aashaas hadda uma hayo macluumaad rasmi ah. "
                    "Si aad u hesho faahfaahin sax ah, fadlan la xiriir qeybta Admission-ka: "
                    "618833500."
                ),
            )

        if self._is_registration_fee_question(normalized):
            return IntentResult(
                intent=ChatIntent.ADMISSION_DIRECT_ANSWER,
                response="Khidmadda diiwaangelinta dhamaan kulliyadaha waa $25.",
            )

        rewritten_query = self._rewrite_admission_query(normalized)

        return IntentResult(
            intent=ChatIntent.ADMISSION_QUESTION,
            rewritten_query=rewritten_query,
        )

    def _normalize(self, text: str) -> str:
        return normalize_query(text)
        normalized = text.lower().strip()
        normalized = normalized.replace("’", "'")
        normalized = re.sub(r"[^a-z0-9\s'$]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()

    def _get_small_talk_response(self, normalized: str) -> str | None:
        greetings = {
            "asc",
            "asalaamu calaykum",
            "assalamu alaikum",
            "salaam",
            "salaan",
            "hello",
            "hi",
        }

        replies_to_greeting = {
            "wcs",
            "wacalaykum salaam",
            "wa calaykum salaam",
            "wa alaikum salaam",
        }

        thanks = {
            "mahadsanid",
            "mahadsanidiin",
            "thanks",
            "thank you",
            "jazakallah",
        }

        if normalized in greetings:
            return "WCS 👋 Soo dhawoow. Su’aashaada admission-ka JUST ii sheeg."

        if normalized in replies_to_greeting:
            return "Soo dhawoow walaal 😊 Maxaan kaaga caawiyaa admission-ka JUST?"

        if "sidee tahay" in normalized or "seetahay" in normalized or "see tahay" in normalized:
            return "Waan fiicanahay walaal 😊 diyaar ayaan u ahay inaan kaa caawiyo admission-ka JUST."

        capability_phrases = [
            "maxaa haysa",
            "maxaad haysaa",
            "maxaa qabataa",
            "maxaad qabataa",
            "maxaad qaban kartaa",
            "maxaa iga caawin kartaa",
            "what can you do",
            "how can you help",
        ]
        if any(phrase in normalized for phrase in capability_phrases):
            return (
                "Waxaan kaa caawin karaa macluumaadka JUST sida kulliyadaha, "
                "shuruudaha admission-ka, diiwaangelinta, lacagaha, scholarship-ka, "
                "hostel-ka, imtixaannada, iyo goobta jaamacadda. Maxaad rabtaa inaad ogaato?"
            )

        if normalized in thanks:
            return "Adaa mudan walaal 😊 Su’aal kale oo admission-ka JUST ah ii sheeg."

        return None

    def _is_out_of_scope(self, normalized: str) -> bool:
        admission_terms = [
            "just",
            "jaamacad",
            "jamacad",
            "university",
            "admission",
            "diiwaan",
            "diwaan",
            "isdiiwaan",
            "isdiwaan",
            "kulliyad",
            "kuliyad",
            "faculty",
            "program",
            "barnaamij",
            "fee",
            "fees",
            "lacag",
            "qiimaha",
            "kharash",
            "khidmad",
            "scholarship",
            "deeq",
            "hostel",
            "exam",
            "imtixaan",
            "graduation",
            "qalin",
            "student",
            "arday",
            "location",
            "xagee",
            "halkee",
            "taalaa",
            "campus",
            "xarun",
            "medicine",
            "computer",
            "it",
            "ict",
            "nursing",
            "public health",
            "accounting",
            "business",
            "engineering",
        ]

        unrelated_terms = [
            "java",
            "python",
            "react",
            "javascript",
            "macalin",
            "teacher",
            "ai",
            "chatgpt",
            "football",
            "ciyaar",
            "music",
            "youtube",
            "facebook",
            "tiktok",
            "politics",
            "siyaasad",
            "crypto",
            "trading",
            "bitcoin",
        ]

        has_admission_term = any(term in normalized for term in admission_terms)
        has_unrelated_term = any(term in normalized for term in unrelated_terms)

        return has_unrelated_term and not has_admission_term

    def _is_inappropriate(self, normalized: str) -> bool:
        inappropriate_terms = [
            "gabdho shidan",
            "gabdha shidan",
            "gabar shidan",
            "hablo shidan",
            "girls shidan",
            "shidan miya",
            "shukaansi",
            "dating",
            "gabar qurux",
            "gabdho qurux",
        ]

        return any(term in normalized for term in inappropriate_terms)

    def _is_unknown_course_or_subject_question(self, normalized: str) -> bool:
        course_terms = [
            "php",
            "java",
            "python",
            "react",
            "javascript",
            "laravel",
            "flutter",
            "node",
            "database",
            "sql",
        ]

        university_terms = [
            "kuliyadda",
            "kulliyadda",
            "faculty",
            "it",
            "computer",
            "jaamacad",
            "jamacad",
            "dhigaa",
            "lagu dhigaa",
            "subject",
            "maado",
            "maadada",
        ]

        has_course_term = any(term in normalized for term in course_terms)
        has_university_term = any(term in normalized for term in university_terms)

        return has_course_term and has_university_term

    def _is_registration_fee_question(self, normalized: str) -> bool:
        registration_terms = [
            "isdiiwaangalin",
            "isdiiwaangelin",
            "is diiwaangalin",
            "is diiwaangelin",
            "diiwaangalin",
            "diiwaangelin",
            "diwaangalin",
            "diwaangelin",
            "diiwaan",
            "diwaan",
            "register",
            "registration",
            "codsi",
        ]

        money_terms = [
            "qiimaha",
            "lacag",
            "kharash",
            "khidmad",
            "khidmadda",
            "fee",
            "fees",
            "cost",
            "amount",
            "imisa",
        ]

        return any(term in normalized for term in registration_terms) and any(
            term in normalized for term in money_terms
        )

    def _rewrite_admission_query(self, normalized: str) -> str:
        query = normalized

        requirement_terms = [
            "requirement",
            "requirements",
            "shuruud",
            "shuruudaha",
            "maxaa loo baahan",
            "waxyaabaha loo baahan",
        ]

        registration_terms = [
            "isdiiwaangalin",
            "isdiiwaangelin",
            "is diiwaangalin",
            "is diiwaangelin",
            "diiwaangalin",
            "diiwaangelin",
            "diwaangalin",
            "diwaangelin",
            "diiwaan",
            "diwaan",
            "register",
            "registration",
            "codsi",
        ]

        money_terms = [
            "qiimaha",
            "lacag",
            "kharash",
            "khidmad",
            "khidmadda",
            "fee",
            "fees",
            "cost",
            "amount",
            "imisa",
        ]

        is_registration_question = any(
            term in normalized for term in registration_terms
        )
        is_money_question = any(term in normalized for term in money_terms)

        program_replacements = {
            "it": "Computer and IT",
            "ict": "Computer and IT",
            "computer": "Computer and IT",
            "kombiyuutar": "Computer and IT",
            "medicine": "Medicine",
            "caafimaad": "Health Sciences",
        }

        for source, target in program_replacements.items():
            query = re.sub(rf"\b{re.escape(source)}\b", target, query)

        if is_registration_question:
            query = (
                f"{query} registration admission application form "
                "required documents diiwaangelinta foomka codsiga"
            )

        if any(term in normalized for term in requirement_terms):
            query = (
                f"{query} admission requirements shuruudaha gelitaanka "
                "shahaadada dugsiga sare sawiro aqoonsi buuxinta foomka"
            )

        if any(
            term in normalized
            for term in ["xagee", "xaggee", "halkee", "taalaa", "taallaa"]
        ):
            query = (
                f"{query} university location address Muqdisho Hodan Digfeer Street"
            )

        if is_money_question:
            query = f"{query} fee amount cost"

        return query
