# دفتر املاک هوشمند — Cloud FINAL 1.0

این نسخه برای اجرای واقعی چندکاربره ساخته شده است:
- Node.js + Express
- PostgreSQL ابری از طریق DATABASE_URL
- ورود کاربران و نقش مدیر/کارشناس
- فایل ملک، مشتری، پیگیری
- تطبیق قانون‌محور واقعی مشتری/ملک
- جستجو
- داشبورد
- PWA برای افزودن به Home Screen
- ساختار قابل توسعه

## متغیرهای ضروری Render
DATABASE_URL = اتصال PostgreSQL
SESSION_SECRET = یک رشته تصادفی طولانی
ADMIN_EMAIL = ایمیل مدیر اولیه
ADMIN_PASSWORD = رمز مدیر اولیه

## Deploy
Build Command: npm install
Start Command: npm start

بعد از Deploy:
آدرس HTTPS را در Safari آیفون باز کنید و Share → Add to Home Screen را بزنید.

نکته: برای داده واقعی، PostgreSQL را به سرویس وصل کنید؛ از SQLite استفاده نشده است.
