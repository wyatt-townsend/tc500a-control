from fastapi import FastAPI

app = FastAPI(title="TC500A Control")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
