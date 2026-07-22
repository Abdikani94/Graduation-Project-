from pathlib import Path

import pandas as pd

from app.schemas.dataset.validation import DatasetValidationReport


REQUIRED_COLUMNS: list[str] = ["id", "question", "answer", "category"]


class DatasetLoader:
    def __init__(self, dataset_path: str | Path) -> None:
        self.dataset_path = Path(dataset_path)

    def load(self) -> pd.DataFrame:
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {self.dataset_path}")

        return pd.read_csv(
            self.dataset_path,
            encoding="utf-8-sig",
            dtype={
                "id": "int64",
                "question": "string",
                "answer": "string",
                "category": "string",
            },
        )

    def validate(self) -> DatasetValidationReport:
        issues: list[str] = []

        try:
            dataframe = self.load()
            csv_readable = True
            utf8_compatible = True
        except UnicodeDecodeError:
            return DatasetValidationReport(
                total_records=0,
                total_categories=0,
                required_columns=REQUIRED_COLUMNS,
                actual_columns=[],
                columns_valid=False,
                duplicate_ids=0,
                duplicate_questions=0,
                duplicate_question_answer_pairs=0,
                missing_ids=[],
                missing_values=0,
                empty_rows=0,
                ids_sequential=False,
                ids_unique=False,
                utf8_compatible=False,
                csv_readable=False,
                ready_for_chromadb=False,
                issues=["CSV file is not UTF-8 compatible."],
            )
        except Exception as error:
            return DatasetValidationReport(
                total_records=0,
                total_categories=0,
                required_columns=REQUIRED_COLUMNS,
                actual_columns=[],
                columns_valid=False,
                duplicate_ids=0,
                duplicate_questions=0,
                duplicate_question_answer_pairs=0,
                missing_ids=[],
                missing_values=0,
                empty_rows=0,
                ids_sequential=False,
                ids_unique=False,
                utf8_compatible=True,
                csv_readable=False,
                ready_for_chromadb=False,
                issues=[f"CSV file could not be read: {error}"],
            )

        actual_columns = list(dataframe.columns)
        columns_valid = actual_columns == REQUIRED_COLUMNS

        if not columns_valid:
            issues.append(
                f"Invalid columns. Expected {REQUIRED_COLUMNS}, got {actual_columns}."
            )

        total_records = len(dataframe)
        empty_rows = int(dataframe.isna().all(axis=1).sum())
        missing_values = int(dataframe.isna().sum().sum())

        duplicate_ids = 0
        duplicate_questions = 0
        duplicate_question_answer_pairs = 0
        missing_ids: list[int] = []
        ids_unique = False
        ids_sequential = False
        total_categories = 0

        if columns_valid:
            duplicate_ids = int(dataframe["id"].duplicated().sum())
            duplicate_questions = int(dataframe["question"].duplicated().sum())
            duplicate_question_answer_pairs = int(
                dataframe.duplicated(subset=["question", "answer"]).sum()
            )

            ids = dataframe["id"].dropna().astype(int).tolist()
            ids_unique = duplicate_ids == 0

            if ids:
                expected_ids = list(range(min(ids), max(ids) + 1))
                missing_ids = sorted(set(expected_ids) - set(ids))
                ids_sequential = (
                    ids == expected_ids
                    and min(ids) == 1
                    and max(ids) == 800
                    and total_records == 800
                )
            else:
                issues.append("No IDs found in dataset.")

            total_categories = int(dataframe["category"].nunique())

            if duplicate_ids > 0:
                issues.append(f"Duplicate IDs found: {duplicate_ids}")

            if missing_ids:
                issues.append(f"Missing IDs found: {missing_ids}")

            if missing_values > 0:
                issues.append(f"Missing values found: {missing_values}")

            if empty_rows > 0:
                issues.append(f"Empty rows found: {empty_rows}")

            if total_records != 800:
                issues.append(f"Expected 800 records, found {total_records}")

            if not ids_sequential:
                issues.append("IDs are not sequential from 1 to 800.")

        ready_for_chromadb = (
            csv_readable
            and utf8_compatible
            and columns_valid
            and total_records == 800
            and missing_values == 0
            and empty_rows == 0
            and duplicate_ids == 0
            and ids_unique
            and ids_sequential
        )

        return DatasetValidationReport(
            total_records=total_records,
            total_categories=total_categories,
            required_columns=REQUIRED_COLUMNS,
            actual_columns=actual_columns,
            columns_valid=columns_valid,
            duplicate_ids=duplicate_ids,
            duplicate_questions=duplicate_questions,
            duplicate_question_answer_pairs=duplicate_question_answer_pairs,
            missing_ids=missing_ids,
            missing_values=missing_values,
            empty_rows=empty_rows,
            ids_sequential=ids_sequential,
            ids_unique=ids_unique,
            utf8_compatible=utf8_compatible,
            csv_readable=csv_readable,
            ready_for_chromadb=ready_for_chromadb,
            issues=issues,
        )