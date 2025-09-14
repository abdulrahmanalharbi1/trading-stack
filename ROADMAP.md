

⸻

PLAN.md

1) الرؤية
	•	المرحلة 1 (محلي): سكربت بايثون يحسب KPIs ويكتبها إلى:
	•	Postgres محلي (اختيار --out postgres)
	•	Google Sheets (اختيار --out sheet)
	•	أو طباعة (--out print) للاختبار.
	•	المرحلة 2 (سيرفر): تشغيل مجدول + مستقر، تجهيز API خفيف للداشبورد، وسحب فوري (webhooks/queue) بدون n8n.

2) الوضع الحالي (Completed)
	•	main.py يحوي:
	•	تحميل إعدادات من .env عبر dotenv.
	•	compute_kpis() (نموذج قابل للاستبدال).
	•	write_postgres() ينشئ جدول kpis ويدخل البيانات.
	•	write_sheet() يضيف صفوفًا إلى تبويب KPIs في Google Sheets.
	•	اختيار المخرج بـ --out print|postgres|sheet.
	•	ملفات مساندة مقترحة:
	•	requirements.txt (python-dotenv, psycopg2-binary, gspread, google-auth)
	•	.env (قيم PG_* و Google_*)

3) التشغيل محليًا (Now)
	1.	ثبّت الاعتمادات:

pip install -r requirements.txt


	2.	جهّز .env من .env.example وعدّل القيم.
	3.	شغّل:
	•	طباعة: python main.py --out print
	•	قاعدة: python main.py --out postgres
	•	شيت: python main.py --out sheet
	4.	جدولة مجانية:
	•	macOS/Linux (cron): شغّل أمرًا يوميًا مثل

0 7 * * * /usr/bin/python3 /path/to/main.py --out postgres >> /path/to/log.txt 2>&1


	•	Windows: Task Scheduler (Program: python، Arguments: path\to\main.py –out postgres)

4) النقل إلى سيرفر لاحقًا (Roadmap)
	•	استخدام Docker لثبات البيئة وترحيل أسهل:
	•	Image للتطبيق (Python + requirements).
	•	خدمة Postgres (أو RDS/Cloud SQL حسب الحاجة).
	•	Jobs قصيرة العمر:
	•	app_postgres: python main.py --out postgres
	•	app_sheet: python main.py --out sheet
	•	جدولة عبر:
	•	cron على السيرفر، أو
	•	systemd timers، أو
	•	GitHub Actions (Self-hosted) إذا رغبت.

5) الداشبورد والسحب الفوري (Next)
	•	خيارات مجانية لبناء داشبورد:
	•	Streamlit (سهل وسريع) أو FastAPI + أي واجهة.
	•	استهلاك بيانات من Postgres مباشرة.
	•	السحب الفوري:
	•	إضافة Endpoint بسيط (FastAPI) يستقبل Webhooks (TradingView/أي مصدر)، يحفظ الحدث فورًا في Postgres، ويعرضه في الداشبورد.
	•	لاحقًا يمكن إضافة Queue (Redis) لو زاد الحمل.

6) الأمان والسرية
	•	لا تحفظ أسرارًا في Git؛ استخدم .env أو Secrets على السيرفر.
	•	قصر منفذ Postgres على الشبكة الداخلية (بدون نشر 5432 علنًا).
	•	مفاتيح Google: ملف JSON بمسار آمن أو كسلسلة في ENV.

7) التطوير والتحسين (Brainstorm لاحقًا)
	•	استبدال منطق compute_kpis() بالمنطق الفعلي من بياناتك.
	•	إضافة تنبيهات تيليجرام/إيميل بعد الإدخال.
	•	صفحة داشبورد حيّة لعرض KPIs/Logs.
	•	اختبارات وحدات + Logging أكثر تفصيلًا + قياس وقت التنفيذ.

8) Checklist
	•	تشغيل محلي بدون n8n
	•	إخراج Postgres/Sheets
	•	استبدال compute_kpis() بالمنطق الحقيقي
	•	إنشاء .env للإنتاج على السيرفر
	•	حاويّات Docker للتطبيق + Postgres (إن لزم)
	•	جدولة على السيرفر (cron/systemd)
	•	Endpoint لاستقبال Webhooks (FastAPI)
	•	داشبورد (Streamlit أو واجهة مخصصة)

⸻

طريقة إضافته إلى GitHub بسرعة

عبر الواجهة:
	•	افتح مستودع trading-stack → Code → Add file → Create new file
	•	الاسم: PLAN.md
	•	الصق المحتوى أعلاه → Commit changes إلى main.

عبر Git (محليًا):

cd trading-stack
printf "%s\n" '# PLAN' > PLAN.md  # أو افتح الملف والصق المحتوى كاملاً
git add PLAN.md
git commit -m "docs: add PLAN.md (local-to-server roadmap and checklist)"
git push origin main

جاهز للدور الثاني: “مود العصف الذهني” للبناء على الخطة (إضافة API للويبهوك + داشبورد حي + تنبيهات).
