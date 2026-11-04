import functools
from ipaddress import IPv4Address, IPv4Interface
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    TomlConfigSettingsSource,
)

Port = Annotated[int, Field(ge=1025, le=65535)]
ThermostatId = Annotated[str, StringConstraints(pattern=r"^[a-z0-9-]+$")]


class ThermostatConfig(BaseModel):
    address: IPv4Address


class Settings(BaseSettings):
    api_host: IPv4Address
    api_port: Port
    bacnet_bind_interface: IPv4Interface
    thermostats: dict[ThermostatId, ThermostatConfig] = {}

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", toml_file="thermostats.toml"
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
            TomlConfigSettingsSource(settings_cls),
        )


@functools.cache
def get_settings() -> Settings:
    return Settings()
