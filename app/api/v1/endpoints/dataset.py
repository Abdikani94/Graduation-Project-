from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.dataset.validation import DatasetValidationReport
from app.services.dataset.loader import DatasetLoader

router = APIRouter(prefix="/dataset", tags=["Dataset"])


@router.get("/validate", response_model=DatasetValidationReport)
def validate_dataset(
    settings: Settings = Depends(get_settings),
) -> DatasetValidationReport:
    loader = DatasetLoader(settings.dataset_path)
    return loader.validate()