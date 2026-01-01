from fastapi import FastAPI

app = FastAPI(title="Blockadia API")


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}
