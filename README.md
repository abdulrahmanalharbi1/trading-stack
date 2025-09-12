# trading-stack

n8n + PostgreSQL + Strategy Agent (FastAPI) لتجهيز تدفّق إشاراتك (تيليجرام/ويبهوكات) وتشغيله بسهولة عبر Docker.

## التشغيل السريع (محلي)
1) انسخ `.env.example` إلى `.env` وعدّل القيم (توكن تيليجرام + chat_id).
2) شغّل:
```bash
docker compose up -d --build
```
3) افتح n8n: http://localhost:5678
   - أنشئ حساب أوّل مرة.
   - أنشئ Credentials → Telegram.
   - استورد `n8n/workflows/strategy-signal.json`.
   - فعّل الووركفلو.

## اختبار سريع
```bash
curl -X POST http://localhost:8000/signal \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","side":"CALL","rr":3.0,"note":"test"}'
```

ستصلك رسالة على تيليجرام + يظهر تنفيذ داخل n8n.

ملاحظات:
- التوقيت مضبوط على `Asia/Riyadh`.
- في الإنتاج: نطاق + Reverse Proxy + HTTPS، وحدّث `N8N_HOST/N8N_PROTOCOL/WEBHOOK_URL`.
- لا ترفع أسرارك للـGit؛ استخدم `.env`. 
