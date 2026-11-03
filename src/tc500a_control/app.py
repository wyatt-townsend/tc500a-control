from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request

from tc500a_control.schema import (
    HealthStatus,
    HumidityValue,
    OccupancyState,
    OccupancyValue,
    SetpointValue,
    TemperatureValue,
    WeeklySchedule,
)
from tc500a_control.thermostat import THERMOSTAT, TC500AThermostat, create_bacnet_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    bacnet = create_bacnet_client()

    app.state.thermostats = {
        "lobby": TC500AThermostat(bacnet, THERMOSTAT),
    }
    yield

    bacnet.close()


app = FastAPI(title="TC500A Control", lifespan=lifespan)
api = APIRouter(prefix="/api")


@app.get("/health")
def health() -> HealthStatus:
    return HealthStatus(status="ok")


# Environment
@api.get("/temperature")
async def read_temp(request: Request) -> TemperatureValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_temperature()

    return TemperatureValue(temperature=current)


@api.get("/humidity")
async def read_humidity(request: Request) -> HumidityValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_humidity()

    return HumidityValue(humidity=current)


# Setpoints
setpoints = APIRouter(prefix="/setpoints")


@setpoints.get("/cool/effective")
async def read_effective_cool_setpoint(request: Request) -> SetpointValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_effective_cool_setpoint()

    return SetpointValue(setpoint=current)


@setpoints.get("/heat/effective")
async def read_effective_heat_setpoint(request: Request) -> SetpointValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_effective_heat_setpoint()

    return SetpointValue(setpoint=current)


@setpoints.get("/cool/{state}")
async def read_cool_setpoint(request: Request, state: OccupancyState) -> SetpointValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_cool_setpoint(state)

    return SetpointValue(setpoint=current)


@setpoints.get("/heat/{state}")
async def read_heat_setpoint(request: Request, state: OccupancyState) -> SetpointValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_heat_setpoint(state)

    return SetpointValue(setpoint=current)


@setpoints.put("/cool/{state}")
async def write_cool_setpoint(
    request: Request, state: OccupancyState, target: SetpointValue
) -> SetpointValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_cool_setpoint(state, target.setpoint)

    current = await thermostat.get_cool_setpoint(state)

    return SetpointValue(setpoint=current)


@setpoints.put("/heat/{state}")
async def write_heat_setpoint(
    request: Request, state: OccupancyState, target: SetpointValue
) -> SetpointValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_heat_setpoint(state, target.setpoint)

    current = await thermostat.get_heat_setpoint(state)

    return SetpointValue(setpoint=current)


# Occupancy
@api.get("/occupancy")
async def read_occupancy(request: Request) -> OccupancyValue:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    current = await thermostat.get_occupancy_status()

    return OccupancyValue(occupancy=current)


@api.get("/schedule")
async def read_schedule(request: Request) -> WeeklySchedule:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    return await thermostat.get_weekly_schedule()


@api.put("/schedule")
async def write_schedule(request: Request, schedule: WeeklySchedule) -> WeeklySchedule:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_weekly_schedule(schedule)

    return await thermostat.get_weekly_schedule()


api.include_router(setpoints)
app.include_router(api)
