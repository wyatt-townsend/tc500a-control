from contextlib import asynccontextmanager
from typing import Annotated

from bacpypes3.pdu import Address
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request

from tc500a_control.schema import (
    HealthStatus,
    HumidityValue,
    OccupancyState,
    OccupancyValue,
    SetpointValue,
    TemperatureValue,
    ThermostatList,
    WeeklySchedule,
)
from tc500a_control.settings import get_settings
from tc500a_control.thermostat import TC500AThermostat, create_bacnet_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    if not settings.thermostats:
        raise RuntimeError("No thermostats configured; see thermostats.example.toml")

    bacnet = create_bacnet_client(settings.bacnet_bind_interface)

    app.state.thermostats = {
        thermostat_id: TC500AThermostat(bacnet, Address(str(config.address)))
        for thermostat_id, config in settings.thermostats.items()
    }
    yield

    bacnet.close()


def get_thermostat(request: Request, thermostat_id: str) -> TC500AThermostat:
    thermostat = request.app.state.thermostats.get(thermostat_id)

    if thermostat is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown thermostat: {thermostat_id}"
        )

    return thermostat


ThermostatDep = Annotated[TC500AThermostat, Depends(get_thermostat)]

app = FastAPI(title="TC500A Control", lifespan=lifespan)
api = APIRouter(prefix="/api")
device = APIRouter(prefix="/thermostats/{thermostat_id}")


@app.get("/health")
def health() -> HealthStatus:
    return HealthStatus(status="ok")


@api.get("/thermostats")
async def list_thermostats(request: Request) -> ThermostatList:
    return ThermostatList(thermostats=list(request.app.state.thermostats))


# Environment
@device.get("/temperature")
async def read_temp(thermostat: ThermostatDep) -> TemperatureValue:
    current = await thermostat.get_temperature()

    return TemperatureValue(temperature=current)


@device.get("/humidity")
async def read_humidity(thermostat: ThermostatDep) -> HumidityValue:
    current = await thermostat.get_humidity()

    return HumidityValue(humidity=current)


# Setpoints
setpoints = APIRouter(prefix="/setpoints")


@setpoints.get("/cool/effective")
async def read_effective_cool_setpoint(thermostat: ThermostatDep) -> SetpointValue:
    current = await thermostat.get_effective_cool_setpoint()

    return SetpointValue(setpoint=current)


@setpoints.get("/heat/effective")
async def read_effective_heat_setpoint(thermostat: ThermostatDep) -> SetpointValue:
    current = await thermostat.get_effective_heat_setpoint()

    return SetpointValue(setpoint=current)


@setpoints.get("/cool/{state}")
async def read_cool_setpoint(
    thermostat: ThermostatDep, state: OccupancyState
) -> SetpointValue:
    current = await thermostat.get_cool_setpoint(state)

    return SetpointValue(setpoint=current)


@setpoints.get("/heat/{state}")
async def read_heat_setpoint(
    thermostat: ThermostatDep, state: OccupancyState
) -> SetpointValue:
    current = await thermostat.get_heat_setpoint(state)

    return SetpointValue(setpoint=current)


@setpoints.put("/cool/{state}")
async def write_cool_setpoint(
    thermostat: ThermostatDep, state: OccupancyState, target: SetpointValue
) -> SetpointValue:
    await thermostat.set_cool_setpoint(state, target.setpoint)

    current = await thermostat.get_cool_setpoint(state)

    return SetpointValue(setpoint=current)


@setpoints.put("/heat/{state}")
async def write_heat_setpoint(
    thermostat: ThermostatDep, state: OccupancyState, target: SetpointValue
) -> SetpointValue:
    await thermostat.set_heat_setpoint(state, target.setpoint)

    current = await thermostat.get_heat_setpoint(state)

    return SetpointValue(setpoint=current)


# Occupancy
@device.get("/occupancy")
async def read_occupancy(thermostat: ThermostatDep) -> OccupancyValue:
    current = await thermostat.get_occupancy_status()

    return OccupancyValue(occupancy=current)


@device.get("/schedule")
async def read_schedule(thermostat: ThermostatDep) -> WeeklySchedule:
    return await thermostat.get_weekly_schedule()


@device.put("/schedule")
async def write_schedule(
    thermostat: ThermostatDep, schedule: WeeklySchedule
) -> WeeklySchedule:
    await thermostat.set_weekly_schedule(schedule)

    return await thermostat.get_weekly_schedule()


device.include_router(setpoints)
api.include_router(device)
app.include_router(api)
