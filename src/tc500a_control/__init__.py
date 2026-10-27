def main() -> None:
    import uvicorn

    uvicorn.run("tc500a_control.app:app", host="127.0.0.1", port=8000)
