from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

# Mirrors questions.issue_on CHECK constraint.
IssueOn = Literal["yes", "no", "either"]
# Mirrors questions.type CHECK constraint.
QuestionType = Literal["yesno", "scale"]
# Mirrors questions.scale_threshold_direction CHECK constraint.
ThresholdDirection = Literal["gte", "lte"]


def _validate_scale_shape(
    qtype: str,
    scale_min: int | None,
    scale_max: int | None,
    scale_threshold: int | None,
    scale_threshold_direction: str | None,
) -> None:
    if qtype == "scale":
        missing = [
            name for name, value in (
                ("scale_min", scale_min),
                ("scale_max", scale_max),
                ("scale_threshold", scale_threshold),
                ("scale_threshold_direction", scale_threshold_direction),
            )
            if value is None
        ]
        if missing:
            raise ValueError(f"scale questions require: {', '.join(missing)}")
        if scale_min >= scale_max:  # type: ignore[operator]
            raise ValueError("scale_min must be less than scale_max")
        if not (scale_min <= scale_threshold <= scale_max):  # type: ignore[operator]
            raise ValueError("scale_threshold must lie between scale_min and scale_max (inclusive)")
    elif qtype == "yesno":
        for name, value in (
            ("scale_min", scale_min),
            ("scale_max", scale_max),
            ("scale_threshold", scale_threshold),
            ("scale_threshold_direction", scale_threshold_direction),
        ):
            if value is not None:
                raise ValueError(f"{name} must be null for yes/no questions")


class QuestionOut(BaseModel):
    id: UUID
    text: str
    section: str = ""
    issue_on: str
    notify_department_id: UUID | None = None
    department_id: UUID | None = None
    type: str = "yesno"
    scale_min: int | None = None
    scale_max: int | None = None
    scale_threshold: int | None = None
    scale_threshold_direction: str | None = None
    in_repository: bool

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    # An empty question is meaningless; reject at the schema layer.
    text: str = Field(min_length=1)
    section: str = ""
    issue_on: IssueOn = "either"
    notify_department_id: UUID | None = None
    department_id: UUID | None = None
    type: QuestionType = "yesno"
    scale_min: int | None = None
    scale_max: int | None = None
    scale_threshold: int | None = None
    scale_threshold_direction: ThresholdDirection | None = None
    in_repository: bool = False

    @model_validator(mode="after")
    def _validate(self) -> "QuestionCreate":
        _validate_scale_shape(
            self.type, self.scale_min, self.scale_max,
            self.scale_threshold, self.scale_threshold_direction,
        )
        return self


class QuestionUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    section: str | None = None
    issue_on: IssueOn | None = None
    notify_department_id: UUID | None = None
    department_id: UUID | None = None
    type: QuestionType | None = None
    scale_min: int | None = None
    scale_max: int | None = None
    scale_threshold: int | None = None
    scale_threshold_direction: ThresholdDirection | None = None
    in_repository: bool | None = None

    @model_validator(mode="after")
    def _validate(self) -> "QuestionUpdate":
        # Only validate scale-shape when the type is being set in this PATCH.
        # Partial updates that touch only e.g. text/notify shouldn't trip this.
        if self.type is not None:
            _validate_scale_shape(
                self.type, self.scale_min, self.scale_max,
                self.scale_threshold, self.scale_threshold_direction,
            )
        return self
