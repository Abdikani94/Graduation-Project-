import re
from typing import Any

from app.repositories.chroma_repository import ChromaRepository
from app.schemas.retrieval.result import RetrievedDocument, RetrievalResult
from app.services.chat.text_normalization import normalize_query
from app.services.embedding.embedding_service import EmbeddingService


class RetrievalService:
    def __init__(
        self,
        chroma_db_path: str,
        collection_name: str,
        embedding_model_name: str,
    ) -> None:
        self.embedding_service = EmbeddingService(embedding_model_name)
        self.chroma_repository = ChromaRepository(
            db_path=chroma_db_path,
            collection_name=collection_name,
        )
        self._collection = self.chroma_repository.get_collection()
        self._cached_documents = self._keyword_search(collection=self._collection)
        self._corpus_vocabulary = {
            token
            for document in self._cached_documents
            for token in self._normalize(
                f"{document.question} {document.answer} {document.category}"
            ).split()
            if len(token) >= 3
        }

    def retrieve(self, query: str, top_k: int = 5) -> RetrievalResult:
        original_query = query.strip()
        cleaned_query = normalize_query(query)

        if not cleaned_query:
            raise ValueError("Query cannot be empty.")

        collection = self._collection

        keyword_results = self._cached_documents
        cleaned_query = normalize_query(cleaned_query, self._corpus_vocabulary)

        vector_results = []
        if not self._has_keyword_match(cleaned_query, keyword_results):
            vector_results = self._vector_search(
                collection=collection,
                query=cleaned_query,
                top_k=max(top_k * 10, 50),
            )

        merged_results = self._merge_results(vector_results + keyword_results)
        ranked_results = self._rank_results(cleaned_query, merged_results)

        final_results = ranked_results[:top_k]

        return RetrievalResult(
            query=original_query,
            total_results=len(final_results),
            results=final_results,
        )

    def _has_keyword_match(
        self,
        query: str,
        documents: list[RetrievedDocument],
    ) -> bool:
        stop_words = {
            "waa", "maxay", "maxaa", "sidee", "sideen", "isku", "iyo",
            "the", "is", "just", "admission", "university",
        }
        terms = {
            term for term in self._normalize(query).split()
            if len(term) >= 4 and term not in stop_words
        }
        if not terms:
            return False

        for document in documents:
            text = self._normalize(
                f"{document.question} {document.answer} {document.category}"
            )
            if any(term in text for term in terms):
                return True
        return False

    def _vector_search(
        self,
        collection: Any,
        query: str,
        top_k: int,
    ) -> list[RetrievedDocument]:
        query_embedding = self.embedding_service.embed_text(query)

        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        return self._parse_query_result(result)

    def _keyword_search(self, collection: Any) -> list[RetrievedDocument]:
        result = collection.get(include=["documents", "metadatas"])

        ids = result.get("ids", [])
        documents = result.get("documents", [])
        metadatas = result.get("metadatas", [])

        results: list[RetrievedDocument] = []

        for document_id, content, metadata in zip(
            ids,
            documents,
            metadatas,
            strict=False,
        ):
            results.append(
                self._build_document(
                    document_id=str(document_id),
                    content=str(content),
                    metadata=metadata,
                    distance=None,
                )
            )

        return results

    def _parse_query_result(self, result: dict[str, Any]) -> list[RetrievedDocument]:
        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        results: list[RetrievedDocument] = []

        for document_id, content, metadata, distance in zip(
            ids,
            documents,
            metadatas,
            distances,
            strict=False,
        ):
            results.append(
                self._build_document(
                    document_id=str(document_id),
                    content=str(content),
                    metadata=metadata,
                    distance=float(distance) if distance is not None else None,
                )
            )

        return results

    def _build_document(
        self,
        document_id: str,
        content: str,
        metadata: dict[str, Any],
        distance: float | None,
    ) -> RetrievedDocument:
        question = ""
        answer = ""

        if "Question:" in content and "Answer:" in content:
            question_part, answer_part = content.split("Answer:", maxsplit=1)
            question = question_part.replace("Question:", "").strip()
            answer = answer_part.strip()

        return RetrievedDocument(
            id=document_id,
            question=question,
            answer=answer,
            category=str(metadata.get("category", "")),
            content=content,
            distance=distance,
            metadata=metadata,
        )

    def _merge_results(
        self,
        documents: list[RetrievedDocument],
    ) -> list[RetrievedDocument]:
        merged: dict[str, RetrievedDocument] = {}

        for document in documents:
            if document.id not in merged:
                merged[document.id] = document
            elif merged[document.id].distance is None:
                merged[document.id].distance = document.distance

        return list(merged.values())

    def _rank_results(
        self,
        query: str,
        documents: list[RetrievedDocument],
    ) -> list[RetrievedDocument]:
        query_text = self._normalize(query)

        def score(document: RetrievedDocument) -> tuple[float, float]:
            document_text = self._normalize(
                f"{document.question} {document.answer} {document.category}"
            )

            final_score = 0.0

            final_score += self._keyword_score(query_text, document_text)
            final_score += self._intent_score(query_text, document_text, document)
            final_score -= self._wrong_intent_penalty(query_text, document_text)

            distance = document.distance if document.distance is not None else 0.5

            return final_score, -distance

        return sorted(documents, key=score, reverse=True)

    def _keyword_score(self, query_text: str, document_text: str) -> float:
        stop_words = {"waa", "maxay", "maxaa", "sideen", "isku", "iyo", "the", "is"}
        terms = {
            term
            for term in query_text.split()
            if len(term) >= 4 and term not in stop_words
        }

        score = 0.0

        for term in terms:
            if term in document_text:
                score += 2.0

        return score

    def _intent_score(
        self,
        query_text: str,
        document_text: str,
        document: RetrievedDocument,
    ) -> float:
        score = 0.0

        if any(term in query_text for term in ["xagee", "xaggee", "taalaa", "taallaa", "halkee"]):
            if "muqdisho" in document_text:
                score += 40.0
            if "hodan" in document_text:
                score += 30.0
            if "digfeer" in document_text:
                score += 30.0

        if any(term in query_text for term in ["diiwaangeliyaa", "diiwaangelin", "diiwaan", "register", "registration"]):
            if "foomka" in document_text:
                score += 35.0
            if "dukumentiyada" in document_text:
                score += 35.0
            if "lacagta diiwaangelinta" in document_text:
                score += 20.0

        if any(term in query_text for term in ["fee", "monthly", "bishii", "lacag", "imisa"]):
            if document.category == "Fees":
                score += 20.0
            if "monthly fee" in document_text:
                score += 20.0

        if "computer application" in query_text and "computer application" in document_text:
            score += 30.0

        if "medicine" in query_text and "medicine" in document_text:
            score += 30.0

        return score

    def _wrong_intent_penalty(self, query_text: str, document_text: str) -> float:
        penalty = 0.0

        if any(term in query_text for term in ["xagee", "xaggee", "taallaa", "halkee"]):
            if "ururro" in document_text or "kooxo" in document_text:
                penalty += 60.0

        if "diiwaangeli" in query_text:
            if "website" in document_text or "facebook" in document_text:
                penalty += 40.0
            if "rasmi ah u diiwaangashan" in document_text:
                penalty += 30.0

        return penalty

    def _normalize(self, text: str) -> str:
        normalized = text.lower()
        normalized = normalized.replace("'", "")
        normalized = re.sub(r"[^a-z0-9$]+", " ", normalized)
        return normalized.strip()
