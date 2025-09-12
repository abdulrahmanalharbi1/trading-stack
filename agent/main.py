import os, time
from fastapi import FastAPI, Request
import httpx
import uvicorn

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID   = os.environ["TELEGRAM_CHAT_ID"]
N8N_WEBHOOK_URL    = os.environ["N8N_WEBHOOK_URL"]

app = FastAPI(title="Strategy Agent")

async def tg_send(text: str):
    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"}
        )

@app.get("/health")
async def health():
    return {"ok": True, "t": int(time.time())}

@app.post("/signal")
async def receive_signal(payload: dict):
    """
    توقع Payload مثل:
    {
      "symbol": "AAPL",
      "side": "CALL" | "PUT",
      "rr": 3.0,
      "note": "اختياري"
    }
    """
    symbol = payload.get("symbol", "UNKNOWN")
    side   = payload.get("side", "N/A")
    rr     = payload.get("rr", 3.0)
    note   = payload.get("note", "")

    # تنبيه فوري
    text = f"🚀 Signal: <b>{symbol}</b> | {side} | RR={rr}"
    if note:
        text += f"\n🗝 {note}"
    await tg_send(text)

    # تمرير إلى n8n للتسجيل/التقارير
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(N8N_WEBHOOK_URL, json=payload)

    return {"ok": True}
    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
