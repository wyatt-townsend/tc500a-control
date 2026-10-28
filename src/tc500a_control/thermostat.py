import datetime

from bacpypes3.basetypes import DailySchedule, TimeValue
from bacpypes3.constructeddata import AnyAtomic, ArrayOf
from bacpypes3.ipv4.app import NormalApplication
from bacpypes3.local.device import DeviceObject
from bacpypes3.pdu import Address, IPv4Address
from bacpypes3.primitivedata import Null, Time, Unsigned

from tc500a_control.schema import Days, OccupancyState, Transition, WeeklySchedule

LOCAL_ADDRESS = "192.168.0.2/24"  # this PC's IP + subnet prefix
THERMOSTAT = Address("192.168.0.181")  # one TC500A
OCC_SCHEDULE = "schedule,2"


def _day(changes: list[Transition]) -> DailySchedule:
    """Build one day from transitions.

    Each entry is a change point, not a block: the value holds until the next entry,
    so an occupied workday needs two -- one to switch on, one to switch back.
    """
    return DailySchedule(
        daySchedule=[
            TimeValue(time=Time(c.time.isoformat()), value=AnyAtomic(Unsigned(c.state)))
            for c in changes
        ]
    )  # ty: ignore[invalid-return-type]


class TC500AThermostat:
    def __init__(self, bacnet: NormalApplication, address: Address):
        self.app = bacnet
        self.address = address

    async def get_temperature(self) -> float:

        temp = await self.app.read_property(
            self.address, "analog-output,18", "present-value"
        )

        return float(temp)

    async def get_occupancy_status(self) -> OccupancyState:
        occ: AnyAtomic = await self.app.read_property(
            self.address, OCC_SCHEDULE, "present-value"
        )

        value = occ.get_value()

        if isinstance(value, Null):
            return OccupancyState.UNKNOWN

        return OccupancyState(value)

    async def get_weekly_schedule(self) -> WeeklySchedule:
        """Return each day's transitions, Monday first."""
        week = await self.app.read_property(
            self.address, OCC_SCHEDULE, "weekly-schedule"
        )

        schedule = {}
        for name, entry in zip(Days, week):
            schedule[name] = [
                Transition(
                    time=datetime.time(*tv.time[:2]),
                    state=int(tv.value.get_value()),
                )
                for tv in entry.daySchedule
            ]

        return schedule

    async def set_weekly_schedule(self, week: WeeklySchedule) -> None:
        """Write the weekly program. Needs an entry for every day in Days."""
        if set(week) != set(Days):
            raise ValueError(
                f"weekly schedule needs {', '.join(Days)}, got {list(week)}"
            )

        await self.app.write_property(
            self.address,
            OCC_SCHEDULE,
            "weekly-schedule",
            ArrayOf(DailySchedule)([_day(week[name]) for name in Days]),
        )


def create_bacnet_client() -> NormalApplication:

    device = DeviceObject(
        objectIdentifier=("device", 599),  # must be unique on the network
        objectName="tc500a-control",
    )

    return NormalApplication(device, IPv4Address(LOCAL_ADDRESS))
