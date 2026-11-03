import datetime
from enum import IntEnum, StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Days(StrEnum):
    MONDAY = "Mon"
    TUESDAY = "Tue"
    WEDNESDAY = "Wed"
    THURSDAY = "Thu"
    FRIDAY = "Fri"
    SATURDAY = "Sat"
    SUNDAY = "Sun"


class OccupancyState(IntEnum):
    OCCUPIED = 0
    UNOCCUPIED = 1
    STANDBY = 3


class Transition(BaseModel):
    """A change point: the state holds until the day's next transition."""

    time: datetime.time
    state: OccupancyState


class WeeklySchedule(BaseModel):
    """One list of transitions per day. All seven are required; use [] for none.

    Fields are Monday first, matching the order of the BACnet weekly-schedule array.
    """

    # {"Mon": [{"time": "06:00:00", "state": 0}, ...], ..., "Sun": []}
    model_config = ConfigDict(extra="forbid")

    monday: list[Transition] = Field(alias=Days.MONDAY)
    tuesday: list[Transition] = Field(alias=Days.TUESDAY)
    wednesday: list[Transition] = Field(alias=Days.WEDNESDAY)
    thursday: list[Transition] = Field(alias=Days.THURSDAY)
    friday: list[Transition] = Field(alias=Days.FRIDAY)
    saturday: list[Transition] = Field(alias=Days.SATURDAY)
    sunday: list[Transition] = Field(alias=Days.SUNDAY)


class HealthStatus(BaseModel):
    status: Literal["ok"]


class TemperatureValue(BaseModel):
    temperature: float


class HumidityValue(BaseModel):
    humidity: float


class SetpointValue(BaseModel):
    setpoint: float = Field(ge=40, le=120)


class OccupancyValue(BaseModel):
    occupancy: OccupancyState
