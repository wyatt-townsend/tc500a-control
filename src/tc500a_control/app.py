from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request

from tc500a_control.schema import WeeklySchedule
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


@api.get("/temp")
async def read_temp(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    temp = await thermostat.get_temperature()

    return {"Temp": temp}


@api.get("/occupancy")
async def read_occupancy(request: Request):
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    occ = await thermostat.get_occupancy_status()

    return {"Occupancy": occ}


@api.get("/schedule")
async def read_schedule(request: Request) -> WeeklySchedule:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    return await thermostat.get_weekly_schedule()


@api.put("/schedule")
async def write_schedule(request: Request, schedule: WeeklySchedule) -> None:
    thermostat: TC500AThermostat = request.app.state.thermostats["lobby"]
    await thermostat.set_weekly_schedule(schedule)


app.include_router(api)
