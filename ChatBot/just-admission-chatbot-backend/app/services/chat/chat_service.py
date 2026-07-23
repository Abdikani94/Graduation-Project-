import logging
from concurrent.futures import ThreadPoolExecutor

from app.repositories.chat_history_repository import ChatHistoryRepository
from app.schemas.chat.history import build_chat_history_record
from app.schemas.chat.response import ChatResponse
from app.services.chat.intent_service import ChatIntent, IntentService
from app.services.gemini.gemini_service import GeminiService
from app.services.retrieval.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)
history_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="chat-history")


class ChatService:
    def __init__(
        self,
        chroma_db_path: str,
        collection_name: str,
        embedding_model_name: str,
        gemini_api_key: str,
        gemini_model_name: str,
        admission_contact_phone: str,
        mongodb_uri: str,
        mongodb_database: str,
    ) -> None:
        self.gemini_model_name = gemini_model_name

        self.intent_service = IntentService()

        try:
            self.retrieval_service = RetrievalService(
                chroma_db_path=chroma_db_path,
                collection_name=collection_name,
                embedding_model_name=embedding_model_name,
            )
        except Exception:
            # Keep greetings, direct admission answers, and the safe fallback
            # available when the embedding model cannot be downloaded.
            logger.exception(
                "Semantic retrieval is unavailable; chatbot will run in direct-answer mode"
            )
            self.retrieval_service = None

        self.gemini_service = GeminiService(
            api_key=gemini_api_key,
            model_name=gemini_model_name,
            admission_contact_phone=admission_contact_phone,
        )

        self.chat_history_repository = ChatHistoryRepository(
            mongodb_uri=mongodb_uri,
            database_name=mongodb_database,
        )
        try:
            self.chat_history_repository.client.admin.command("ping")
        except Exception:
            logger.warning("MongoDB warm-up failed; chat answers remain available")

    def ask(
        self,
        question: str,
        top_k: int = 5,
    ) -> ChatResponse:
        cleaned_question = question.strip()

        if not cleaned_question:
            raise ValueError("Question cannot be empty.")

        intent_result = self.intent_service.analyze(cleaned_question)

        if intent_result.intent in {
            ChatIntent.SMALL_TALK,
            ChatIntent.INAPPROPRIATE,
            ChatIntent.OUT_OF_SCOPE,
            ChatIntent.ADMISSION_DIRECT_ANSWER,
        }:


            response = ChatResponse(
                question=cleaned_question,
                answer=intent_result.response or self.gemini_service.fallback_answer(),
                context_found=intent_result.intent == ChatIntent.ADMISSION_DIRECT_ANSWER,
                retrieved_documents=[],
            )

            self._save_chat_history(response)
            return response

        search_query = intent_result.rewritten_query or cleaned_question

        if self.retrieval_service is None:
            response = ChatResponse(
                question=cleaned_question,
                answer=self.gemini_service.fallback_answer(),
                context_found=False,
                retrieved_documents=[],
            )
            self._save_chat_history(response)
            return response

        retrieval_result = self.retrieval_service.retrieve(query=search_query, top_k=top_k)

        direct_answer = self._grounded_direct_answer(
            cleaned_question,
            retrieval_result.results,
        )
        if direct_answer:
            response = ChatResponse(
                question=cleaned_question,
                answer=direct_answer,
                context_found=True,
                retrieved_documents=retrieval_result.results,
            )
            self._save_chat_history(response)
            return response

        answer = self.gemini_service.generate_answer(
            question=cleaned_question,
            retrieved_documents=retrieval_result.results,
        )

        fallback_answer = self.gemini_service.fallback_answer()
        context_found = answer.strip() != fallback_answer.strip()

        response = ChatResponse(
            question=cleaned_question,
            answer=answer,
            context_found=context_found,
            retrieved_documents=retrieval_result.results,
        )

        self._save_chat_history(response)

        return response

    def _grounded_direct_answer(self, query: str, documents: list) -> str | None:
        if not documents:
            return None

        # Retrieval already ranks the official dataset semantically. Returning
        # its complete top answer avoids LLM truncation and keeps every reply
        # grounded, including questions phrased in new or misspelled ways.
        answer = documents[0].answer.strip()
        return answer or None

    def _save_chat_history(self, response: ChatResponse) -> None:
        try:
            retrieved_source_ids = []
            retrieved_categories = []

            for document in response.retrieved_documents:
                source_id = document.metadata.get("source_id")

                if isinstance(source_id, int):
                    retrieved_source_ids.append(source_id)

                if document.category and document.category not in retrieved_categories:
                    retrieved_categories.append(document.category)

            record = build_chat_history_record(
                question=response.question,
                answer=response.answer,
                context_found=response.context_found,
                retrieved_source_ids=retrieved_source_ids,
                retrieved_categories=retrieved_categories,
                model_name=self.gemini_model_name,
            )

            # History persistence must never delay the answer shown to users.
            history_executor.submit(self._insert_history_record, record)

        except Exception:
            logger.exception("Failed to save chat history")

    def _insert_history_record(self, record: dict) -> None:
        try:
            self.chat_history_repository.insert_chat_record(record)
        except Exception:
            logger.exception("Failed to persist chat history")
