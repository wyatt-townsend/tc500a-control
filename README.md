# TC500A Control

A fastAPI-based web server for controlling the TC500A thermostat.

## Configuration

Copy `.env.example` to `.env` and set the server and BACnet network settings.

Copy `thermostats.example.toml` to `thermostats.toml` and list your thermostats. Each id
is used in API URLs, such as `/api/thermostats/lobby/temperature`.

## Finding thermostats

With the server stopped, run:

```sh
uv run tc500a-discover
```

This lists the BACnet devices on the local subnet as TOML to paste into `thermostats.toml`.
Replace each `device-<instance>` id with a name of your choice. Devices on other subnets
won't reply and must be added by hand.
