def main() -> None:
    import uvicorn

    from tc500a_control.settings import get_settings

    settings = get_settings()

    uvicorn.run(
        "tc500a_control.app:app", host=f"{settings.api_host}", port=settings.api_port
    )
