from pydantic import BaseModel, Field


class DatasetValidationReport(BaseModel):
    total_records: int = Field(ge=0)
    total_categories: int = Field(ge=0)

    required_columns: list[str]
    actual_columns: list[str]
    columns_valid: bool

    duplicate_ids: int = Field(ge=0)
    duplicate_questions: int = Field(ge=0)
    duplicate_question_answer_pairs: int = Field(ge=0)

    missing_ids: list[int]
    missing_values: int = Field(ge=0)
    empty_rows: int = Field(ge=0)

    ids_sequential: bool
    ids_unique: bool
    utf8_compatible: bool
    csv_readable: bool

    ready_for_chromadb: bool
    issues: list[str]