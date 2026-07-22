from app.services.chat.intent_service import ChatIntent, IntentService
from app.services.chat.text_normalization import normalize_query


def test_general_typo_normalization_handles_location_question() -> None:
    normalized = normalize_query("Xage ku tla jamhuriya")
    assert "xagee" in normalized
    assert "taalaa" in normalized
    result = IntentService().analyze("Xage ku tla jamhuriya")
    assert result.intent == ChatIntent.ADMISSION_QUESTION
    assert "university location address" in (result.rewritten_query or "")


def test_general_typo_normalization_handles_registration_question() -> None:
    normalized = normalize_query("side isku diwan galiya")
    assert "diiwaangeliyaa" in normalized
    result = IntentService().analyze("side isku diwan galiya")
    assert result.intent == ChatIntent.ADMISSION_QUESTION
    assert "required documents" in (result.rewritten_query or "")


def test_english_domain_typos_are_corrected() -> None:
    normalized = normalize_query("admision requirment and registrtion")
    assert normalized == "admission requirement and registration"


def test_requirement_typo_gets_grounding_synonyms() -> None:
    result = IntentService().analyze("admision requirment maxay yihiin")
    assert result.intent == ChatIntent.ADMISSION_QUESTION
    assert "shuruudaha gelitaanka" in (result.rewritten_query or "")
