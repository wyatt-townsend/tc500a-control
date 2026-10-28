from bacpypes3.basetypes import DailySchedule, TimeValue
from bacpypes3.constructeddata import AnyAtomic, ArrayOf
from bacpypes3.ipv4.app import NormalApplication
from bacpypes3.local.device import DeviceObject
from bacpypes3.pdu import Address, IPv4Address
from bacpypes3.primitivedata import Null, Time, Unsigned

LOCAL_ADDRESS = "192.168.0.2/24"  # this PC's IP + subnet prefix
THERMOSTAT = Address("192.168.0.181")  # one TC500A
OCC_SCHEDULE = "schedule,2"
OCCUPIED, UNOCCUPIED, STANDBY = 0, 1, 3
SCHEDULE_VALUES = {0: "Occupied", 1: "UnOccupied", 3: "StandBy", 255: "Null"}
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# {"Mon": [("06:00", OCCUPIED), ("18:00", UNOCCUPIED)], ..., "Sun": []}
WeeklySchedule = dict[str, list[tuple[str, int]]]


def _day(changes: list[tuple[str, int]]) -> DailySchedule:
    """Build one day from (time, value) transitions.

    Each entry is a change point, not a block: the value holds until the next entry,
    so an occupied workday needs two -- one to switch on, one to switch back.
    """
    return DailySchedule(
        daySchedule=[
            TimeValue(time=Time(t), value=AnyAtomic(Unsigned(v))) for t, v in changes
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

    async def get_occupancy_status(self) -> str:
        occ: AnyAtomic = await self.app.read_property(
            self.address, OCC_SCHEDULE, "present-value"
        )

        value = occ.get_value()

        if isinstance(value, Null):
            return "Null"

        return SCHEDULE_VALUES.get(value, "?")

    async def get_weekly_schedule(self) -> WeeklySchedule:
        """Return each day's (time, value) transitions, Monday first."""
        week = await self.app.read_property(
            self.address, OCC_SCHEDULE, "weekly-schedule"
        )

        schedule = {}
        for name, entry in zip(DAYS, week):
            schedule[name] = [
                (f"{tv.time[0]:02d}:{tv.time[1]:02d}", int(tv.value.get_value()))
                for tv in entry.daySchedule
            ]

        return schedule

    async def set_weekly_schedule(self, week: WeeklySchedule) -> None:
        """Write the weekly program. Needs an entry for every day in DAYS."""
        if set(week) != set(DAYS):
            raise ValueError(f"weekly schedule needs exactly {DAYS}, got {list(week)}")

        await self.app.write_property(
            self.address,
            OCC_SCHEDULE,
            "weekly-schedule",
            ArrayOf(DailySchedule)([_day(week[name]) for name in DAYS]),
        )


def create_bacnet_client() -> NormalApplication:

    device = DeviceObject(
        objectIdentifier=("device", 599),  # must be unique on the network
        objectName="tc500a-control",
    )

    return NormalApplication(device, IPv4Address(LOCAL_ADDRESS))
