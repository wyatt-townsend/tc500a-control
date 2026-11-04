import asyncio

from bacpypes3.apdu import ErrorRejectAbortNack
from bacpypes3.ipv4.app import NormalApplication
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import ObjectIdentifier

from tc500a_control.settings import get_settings
from tc500a_control.thermostat import create_bacnet_client


async def _read(
    bacnet: NormalApplication,
    address: Address,
    device: ObjectIdentifier,
    prop: str,
) -> str:
    try:
        return str(await bacnet.read_property(address, device, prop))
    except ErrorRejectAbortNack:
        return "unknown"


async def discover() -> None:
    """Print a thermostats.toml block for each BACnet device on the local subnet."""
    bacnet = create_bacnet_client(get_settings().bacnet_bind_interface)

    try:
        replies = await bacnet.who_is()

        if not replies:
            print("No BACnet devices replied")

        for reply in replies:
            address = reply.pduSource
            device = reply.iAmDeviceIdentifier
            name = await _read(bacnet, address, device, "object-name")
            model = await _read(bacnet, address, device, "model-name")

            print(f"# {name}, model {model}")
            print(f"[thermostats.device-{device[1]}]")
            print(f'address = "{address}"')
            print()
    finally:
        bacnet.close()


def main() -> None:
    asyncio.run(discover())
