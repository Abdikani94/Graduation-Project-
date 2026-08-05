import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from enum import Enum


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

        direct_response = self._get_direct_admission_response(normalized)
        if direct_response:
            return IntentResult(
                intent=ChatIntent.ADMISSION_DIRECT_ANSWER,
                response=direct_response,
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
        normalized = text.lower().strip()
        normalized = normalized.replace("’", "'")
        normalized = re.sub(r"[^a-z0-9\s'$]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized)
        normalized = normalized.strip()

        compact_phrases = {
            "sethy": "sidee tahay",
            "sthy": "sidee tahay",
            "seethy": "sidee tahay",
            "sidethy": "sidee tahay",
            "sidetahy": "sidee tahay",
            "seetahy": "sidee tahay",
            "iskawaran": "iska waran",
            "mahadsnid": "mahadsanid",
            "mhdsanid": "mahadsanid",
            "isdiwangali": "is diiwaan geli",
            "isdiwaangali": "is diiwaan geli",
            "isdiiwangali": "is diiwaan geli",
            "isdiiwaangali": "is diiwaan geli",
            "sideiskudiwangaliyaa": "sidee isku diiwaan geliyaa",
            "sideiskudiwaangaliyaa": "sidee isku diiwaan geliyaa",
            "sideeiskudiwangaliyaa": "sidee isku diiwaan geliyaa",
            "sideeiskudiwaangaliyaa": "sidee isku diiwaan geliyaa",
            "sideloisdiwangaliyaa": "sidee loo isdiiwaangeliyaa",
            "maxaalaygaraba": "maxaa la iga rabaa",
        }
        compact = normalized.replace(" ", "")
        if compact in compact_phrases:
            return compact_phrases[compact]

        typo_aliases = {
            "admisson": "admission",
            "admision": "admission",
            "admissin": "admission",
            "admissionka": "admission",
            "jamacad": "jaamacad",
            "jamacada": "jaamacad",
            "jaamcad": "jaamacad",
            "jaamacda": "jaamacad",
            "kuliyad": "kulliyad",
            "kuliyada": "kulliyad",
            "kulliyada": "kulliyad",
            "kuliyadaha": "kulliyadaha",
            "shurud": "shuruud",
            "shuruudaha": "shuruud",
            "shurudaha": "shuruud",
            "diwan": "diiwaan",
            "diwaan": "diiwaan",
            "diiwangalin": "diiwaangelin",
            "diwaangalin": "diiwaangelin",
            "diwangeli": "diiwaangeli",
            "diwangaliyaa": "diiwaangeliyaa",
            "diwaangaliyaa": "diiwaangeliyaa",
            "lacg": "lacag",
            "lacaq": "lacag",
            "qiimo": "qiimaha",
            "xage": "xagee",
            "halke": "halkee",
            "xirir": "xiriir",
            "telphone": "telefoon",
            "telfoon": "telefoon",
            "progam": "program",
            "prgram": "program",
            "kafatan": "kaftan",
            "qosl": "qosol",
        }
        return " ".join(typo_aliases.get(word, word) for word in normalized.split())

    def _get_small_talk_response(self, normalized: str) -> str | None:
        compact = normalized.replace(" ", "")

        if any(
            term in normalized
            for term in ["kaftan", "qosol", "joke", "iga qosli", "sheeko qosol"]
        ):
            return (
                "Kaftan yar 😄: Arday ayaa yiri, “Exam-ku ma open book baa?” "
                "Macallinkii wuxuu yiri, “Haa—laakiin maskaxdaada fur marka hore!” "
                "Hadda su'aal JUST ama admission ah ii sheeg."
            )

        if any(
            term in normalized
            for term in ["magacaa", "magacaaga", "yaa tahay", "who are you"]
        ):
            return (
                "Waxaan ahay JUST Admission Assistant 🤖. Waxaan kaa caawin karaa "
                "isdiiwaangelinta, shuruudaha, kulliyadaha, lacagaha iyo adeegyada ardayda."
            )

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

        how_are_you_variants = {
            "sideetahay",
            "sidetahay",
            "seetahay",
            "setahay",
            "sethy",
            "seethy",
            "sidethy",
            "sthy",
        }
        if compact in how_are_you_variants or any(
            SequenceMatcher(None, compact, variant).ratio() >= 0.76
            for variant in how_are_you_variants
        ):
            return (
                "Waan fiicanahay walaal 😊, mahadsanid! Adiguna sidee tahay? "
                "Waxaan diyaar u ahay inaan kaa caawiyo JUST iyo admission-ka."
            )

        if normalized in thanks:
            return "Adaa mudan walaal 😊 Su’aal kale oo admission-ka JUST ah ii sheeg."

        return None

    def _get_direct_admission_response(self, normalized: str) -> str | None:
        registration_terms = [
            "side isku diwan",
            "sidee isku diwan",
            "side isku diiwaan",
            "sidee isku diiwaan",
            "side loo diwan",
            "sidee loo diwan",
            "side loo diiwaan",
            "sidee loo diiwaan",
            "is diwan gali",
            "isdiwan gali",
            "is diiwaan geli",
            "isdiiwaan geli",
            "isdiiwaangeli",
            "isdiiwaangel",
            "register",
            "apply",
            "codsadaa",
            "codsan",
        ]
        if any(term in normalized for term in registration_terms):
            return (
                "Si aad JUST iskaga diiwaangeliso:\n"
                "1. Guji “Apply Now” oo fur foomka admission-ka.\n"
                "2. Buuxi xogtaada shakhsiga iyo xiriirka.\n"
                "3. Geli xogta dugsiga sare oo dooro kulliyadda/barnaamijka.\n"
                "4. Soo geli sawirkaaga iyo shahaadada ama caddeynta loo baahan yahay.\n"
                "5. Bixi khidmadda diiwaangelinta oo ah $25 adigoo adeegsanaya EVC.\n"
                "6. Dib u eeg xogta, kadib gudbi codsiga oo keydi reference number-kaaga.\n"
                "Haddii aad ku xannibanto, la xiriir Admission Office: 618833500."
            )

        requirement_terms = [
            "shuruud",
            "maxaa la iga rabaa",
            "maxaa laga rabaa",
            "dukumenti",
            "document",
            "waxyaabaha loo baahan",
        ]
        if any(term in normalized for term in requirement_terms):
            return (
                "Shuruudaha guud ee admission-ka JUST waa: shahaadada dugsiga sare "
                "ama caddeynteeda, sawir passport-size ah, xog aqoonsi iyo xiriir oo sax ah, "
                "doorashada kulliyadda/barnaamijka, buuxinta foomka online-ka, iyo bixinta "
                "khidmadda diiwaangelinta ee $25. Program gaar ah wuxuu yeelan karaa "
                "shuruudo dheeraad ah."
            )

        program_terms = [
            "kulliyadaha",
            "kuliyadaha",
            "kulliyad",
            "kuliyad",
            "faculties",
            "faculty",
            "programs",
            "barnaamijyada",
        ]
        if any(term in normalized for term in program_terms):
            return (
                "JUST waxay bixisaa barnaamijyo ay ka mid yihiin Caafimaadka, Nursing, "
                "Public Health, Medical Laboratory, Medical Imaging, Computer & IT, "
                "Engineering, Agriculture, Business, Accounting iyo maamulka. "
                "Liiska hadda la qaadanayo waxaad ka arki kartaa Academic Programs ama "
                "Apply Now, maadaama programs-ku ku xiran yihiin admission period-ka furan."
            )

        location_terms = [
            "xagee",
            "xaggee",
            "halkee",
            "taalaa",
            "taallaa",
            "location",
            "cinwaan",
        ]
        if any(term in normalized for term in location_terms):
            return (
                "Jamhuriya University of Science & Technology (JUST) waxay ku taallaa "
                "Muqdisho, Degmada Hodan, Digfeer Street. Faahfaahin dheeraad ah kala "
                "xiriir Admission Office: 618833500."
            )

        contact_terms = [
            "contact",
            "xiriir",
            "telefoon",
            "taleefoon",
            "lambar",
            "number",
        ]
        if any(term in normalized for term in contact_terms):
            return "Waxaad Admission Office kala xiriiri kartaa lambarka 618833500."

        payment_terms = [
            "registration fee",
            "khidmadda diiwaan",
            "khidmada diwaan",
            "lacagta diiwaan",
            "lacagta diwaan",
            "qiimaha diiwaan",
            "imisa",
        ]
        if any(term in normalized for term in payment_terms):
            return (
                "Khidmadda diiwaangelinta dhammaan kulliyadaha waa $25. "
                "System-ka online-ka wuxuu kuu diyaarinayaa payment-ka EVC marka aad "
                "dhammeystirto qaybaha hore ee application-ka."
            )

        service_terms = [
            "maktabad",
            "library",
            "wifi",
            "wi fi",
            "gaadiid",
            "bus",
            "student portal",
        ]
        if any(term in normalized for term in service_terms):
            return (
                "JUST waxay ardayda u leedahay adeegyo ay ka mid yihiin maktabad, Wi-Fi, "
                "Student Portal iyo gaadiid arday oo ka shaqeeya gobolka Banaadir. "
                "Helitaanka adeeg gaar ah waxaad ka xaqiijin kartaa maamulka ardayda."
            )

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
