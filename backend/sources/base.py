from abc import ABC, abstractmethod
from typing import Optional
from ..models import Job, WorkType


class BaseJobSource(ABC):
    name: str = "unknown"

    @abstractmethod
    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        work_type: WorkType = WorkType.any,
        page: int = 1,
    ) -> list[Job]:
        pass

    def _normalize_work_type(self, raw: Optional[str]) -> Optional[str]:
        if not raw:
            return None
        raw = raw.lower()
        if "remote" in raw:
            return "remote"
        if "hybrid" in raw:
            return "hybrid"
        if any(x in raw for x in ["on-site", "onsite", "office", "in person"]):
            return "onsite"
        return raw
