from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request

from tc500a_control.schema import OccupancyState, WeeklySchedule
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
def health() -> dict[str, str]:
    return {"status": "ok"}


# Environment
@api.get("/temperature")
async def read_temp(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    temp = await thermostat.get_temperature()

    return {"temperature": temp}


@api.get("/humidity")
async def read_humidity(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    value = await thermostat.get_humidity()

    return {"humidity": value}


# Setpoints
@api.get("/effective_cool_setpoint")
async def read_effective_cool_setpoint(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    value = await thermostat.get_effective_cool_setpoint()

    return {"setpoint": value}


@api.get("/effective_heat_setpoint")
async def read_effective_heat_setpoint(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    value = await thermostat.get_effective_heat_setpoint()

    return {"setpoint": value}


@api.get("/cool_setpoint")
async def read_cool_setpoint(request: Request, state: OccupancyState):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    value = await thermostat.get_cool_setpoint(state)

    return {"setpoint": value}


@api.get("/heat_setpoint")
async def read_heat_setpoint(request: Request, state: OccupancyState):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    value = await thermostat.get_heat_setpoint(state)

    return {"setpoint": value}


@api.put("/cool_setpoint")
async def write_cool_setpoint(request: Request, state: OccupancyState, value: float):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_cool_setpoint(state, value)

    setpoint = await thermostat.get_cool_setpoint(state)

    return {"setpoint": setpoint}


@api.put("/heat_setpoint")
async def write_heat_setpoint(request: Request, state: OccupancyState, value: float):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_heat_setpoint(state, value)

    setpoint = await thermostat.get_heat_setpoint(state)

    return {"setpoint": setpoint}


# Occupancy
@api.get("/occupancy")
async def read_occupancy(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    occ = await thermostat.get_occupancy_status()

    return {"occupancy": occ}


@api.get("/schedule")
async def read_schedule(request: Request) -> WeeklySchedule:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    return await thermostat.get_weekly_schedule()


@api.put("/schedule")
async def write_schedule(request: Request, schedule: WeeklySchedule) -> None:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_weekly_schedule(schedule)


app.include_router(api)
