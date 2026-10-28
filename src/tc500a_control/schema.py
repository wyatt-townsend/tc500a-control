import datetime
from enum import IntEnum, StrEnum

from pydantic import BaseModel


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
    UNKNOWN = 255


class Transition(BaseModel):
    """A change point: the state holds until the day's next transition."""

    time: datetime.time
    state: OccupancyState


# {"Mon": [{"time": "06:00:00", "state": 0}, ...], ..., "Sun": []}
WeeklySchedule = dict[Days, list[Transition]]
