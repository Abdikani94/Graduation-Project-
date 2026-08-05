from app.services.chat.intent_service import ChatIntent, IntentService


def test_typo_registration_question_gets_step_by_step_answer() -> None:
    result = IntentService().analyze("side isku diwan galiyaa")

    assert result.intent == ChatIntent.ADMISSION_DIRECT_ANSWER
    assert "Apply Now" in (result.response or "")
    assert "$25" in (result.response or "")
    assert "reference number" in (result.response or "")


def test_admission_requirements_have_a_direct_answer() -> None:
    result = IntentService().analyze("maxaa la iga rabaa admissionka?")

    assert result.intent == ChatIntent.ADMISSION_DIRECT_ANSWER
    assert "shahaadada dugsiga sare" in (result.response or "")


def test_joke_request_gets_friendly_bounded_reply() -> None:
    result = IntentService().analyze("kaftan iga qosli")

    assert result.intent == ChatIntent.SMALL_TALK
    assert "😄" in (result.response or "")


def test_common_small_talk_typos_are_understood() -> None:
    for message in ["sethy", "sthy", "see thy", "side thy", "sidetahy"]:
        result = IntentService().analyze(message)

        assert result.intent == ChatIntent.SMALL_TALK
        assert "Waan fiicanahay" in (result.response or "")


def test_common_admission_typos_are_normalized() -> None:
    for message in [
        "sideiskudiwangaliyaa",
        "side isku diwan galiyaa",
        "sidee isku diwaangaliyaa",
    ]:
        result = IntentService().analyze(message)

        assert result.intent == ChatIntent.ADMISSION_DIRECT_ANSWER
        assert "Apply Now" in (result.response or "")


def test_university_location_has_a_direct_answer() -> None:
    result = IntentService().analyze("jaamacaddu xaggee ku taallaa?")

    assert result.intent == ChatIntent.ADMISSION_DIRECT_ANSWER
    assert "Hodan" in (result.response or "")
