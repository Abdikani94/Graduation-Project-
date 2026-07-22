import re

from google import genai
from google.genai import types

from app.schemas.retrieval.result import RetrievedDocument


class GeminiService:
    def __init__(
        self,
        api_key: str,
        model_name: str,
        admission_contact_phone: str,
    ) -> None:
        if not api_key:
            raise ValueError("Gemini API key is not configured.")

        self.model_name = model_name
        self.admission_contact_phone = admission_contact_phone
        self.client = genai.Client(api_key=api_key)

    def generate_answer(
        self,
        question: str,
        retrieved_documents: list[RetrievedDocument],
    ) -> str:
        fallback_answer = self.fallback_answer()

        if not retrieved_documents:
            return fallback_answer
        

        if self._looks_out_of_scope(question, retrieved_documents):
            return fallback_answer
        

        # Critical rule:
        # If the best retrieved answer already contains an exact money value,
        # return it directly instead of letting Gemini rewrite it.
        best_answer = retrieved_documents[0].answer.strip()

        if self._question_requests_money(question) and self._contains_money_value(best_answer):
         return best_answer

        if self._question_requests_location(question) and self._answer_contains_location(best_answer):
         return best_answer

        if self._question_requests_registration(question) and self._answer_contains_registration_steps(best_answer):
         return best_answer

        context = self._build_context(retrieved_documents)

        prompt = f"""
You are a university admission chatbot for JUST.

STRICT RULES:
1. Answer ONLY using the retrieved context.
2. Do not use outside knowledge.
3. Do not guess.
4. Do not change numbers, fees, years, phone numbers, or money values.
5. If the answer exists clearly in the context, copy the exact answer from the context.
6. If the answer is not clearly found in the context, reply exactly with:
"{fallback_answer}"

USER QUESTION:
{question}

RETRIEVED CONTEXT:
{context}

FINAL ANSWER:
""".strip()

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=250,
                ),
            )

            answer = response.text.strip() if response.text else ""

        except Exception:
            return self._safe_retrieved_or_fallback(
                retrieved_documents=retrieved_documents,
                fallback_answer=fallback_answer,
            )

        if not answer:
            return fallback_answer

        if self._is_partial_fallback(answer):
            return fallback_answer

        if self._changed_money_value(answer, retrieved_documents):
            return self._best_context_answer(retrieved_documents)

        if self._lost_money_value(answer, retrieved_documents):
            return self._best_context_answer(retrieved_documents)

        return answer

    def fallback_answer(self) -> str:
        return (
            "Walaal su’aashaas hadda uma hayo macluumaad rasmi ah. "
            "Si aad u hesho faahfaahin sax ah, fadlan la xiriir qeybta Admission-ka: "
            f"{self.admission_contact_phone}."
        )

    def _build_context(self, retrieved_documents: list[RetrievedDocument]) -> str:
        context_parts: list[str] = []

        for index, document in enumerate(retrieved_documents, start=1):
            context_parts.append(
                f"""
[Context {index}]
Question: {document.question}
Answer: {document.answer}
Category: {document.category}
Distance: {document.distance}
""".strip()
            )

        return "\n\n".join(context_parts)

    def _best_context_answer(
        self,
        retrieved_documents: list[RetrievedDocument],
    ) -> str:
        return retrieved_documents[0].answer.strip()

    def _contains_money_value(self, text: str) -> bool:
        return bool(re.search(r"\$\d+", text))

    def _safe_retrieved_or_fallback(
        self,
        retrieved_documents: list[RetrievedDocument],
        fallback_answer: str,
    ) -> str:
        if not retrieved_documents:
            return fallback_answer

        best_answer = self._best_context_answer(retrieved_documents).strip()

        if best_answer:
            return best_answer

        return fallback_answer

    def _is_partial_fallback(self, answer: str) -> bool:
        normalized = answer.lower().strip()
        fallback = self.fallback_answer().lower().strip()

        if not normalized:
            return True

        partial_fallback_starts = [
            "walaal su",
            "walaal su’a",
            "walaal su'a",
            "walaal su’aashaas",
            "walaal su'aashaas",
            "macluumaadkaas",
            "macluumaadkaas hadda",
        ]

        if any(normalized.startswith(prefix) for prefix in partial_fallback_starts):
            return True

        # If Gemini starts writing the fallback but stops early,
        # replace it with the complete fallback answer.
        if fallback.startswith(normalized):
            return True

        return False

    def _changed_money_value(
        self,
        answer: str,
        retrieved_documents: list[RetrievedDocument],
    ) -> bool:
        answer_money_values = set(re.findall(r"\$\d+", answer))

        context_text = " ".join(document.answer for document in retrieved_documents)
        context_money_values = set(re.findall(r"\$\d+", context_text))

        if not answer_money_values:
            return False

        return not answer_money_values.issubset(context_money_values)

    def _lost_money_value(
        self,
        answer: str,
        retrieved_documents: list[RetrievedDocument],
    ) -> bool:
        context_text = " ".join(document.answer for document in retrieved_documents)
        context_money_values = set(re.findall(r"\$\d+", context_text))

        if not context_money_values:
            return False

        answer_money_values = set(re.findall(r"\$\d+", answer))

        # Example bad answer: "Medicine monthly fee waa $"
        if "$" in answer and not answer_money_values:
            return True

        # If the best context has a money value but Gemini removed it, reject Gemini.
        return not answer_money_values and self._contains_money_value(
            retrieved_documents[0].answer,
        )
    def _question_requests_money(self, question: str) -> bool:
        normalized = question.lower()

        money_terms = [
            "fee",
            "fees",
            "monthly",
            "bishii",
            "lacag",
            "qiimaha",
            "kharash",
            "khidmad",
            "khidmadda",
            "tuition",
        ]

        return any(term in normalized for term in money_terms)

    def _question_requests_location(self, question: str) -> bool:
        normalized = question.lower()

        location_terms = [
            "xagee",
            "xaggee",
            "halkee",
            "taalaa",
            "taallaa",
            "meesha",
            "location",
            "address",
        ]

        return any(term in normalized for term in location_terms)

    def _answer_contains_location(self, answer: str) -> bool:
        normalized = answer.lower()

        location_terms = [
            "muqdisho",
            "hodan",
            "digfeer",
            "street",
        ]

        return any(term in normalized for term in location_terms)

    def _question_requests_registration(self, question: str) -> bool:
        normalized = question.lower()

        registration_terms = [
            "diiwaan",
            "diwaan",
            "isdiiwaan",
            "isdiwaan",
            "diiwaangelin",
            "diwaangelin",
            "register",
            "registration",
            "admission",
            "codsi",
        ]

        return any(term in normalized for term in registration_terms)

    def _answer_contains_registration_steps(self, answer: str) -> bool:
        normalized = answer.lower()

        step_terms = [
            "foomka",
            "dukumentiyada",
            "diiwaangelinta",
            "diwaangelinta",
            "lacagta",
            "admission",
        ]

        return any(term in normalized for term in step_terms)

    def _looks_out_of_scope(
        self,
        question: str,
        retrieved_documents: list[RetrievedDocument],
    ) -> bool:
        normalized_question = question.lower()

        out_of_scope_terms = [
            "phd",
            "space engineering",
            "master in space",
            "doctorate",
        ]

        if any(term in normalized_question for term in out_of_scope_terms):
            combined_context = " ".join(
                f"{document.question} {document.answer}".lower()
                for document in retrieved_documents
            )

            return not any(term in combined_context for term in out_of_scope_terms)

        return False