# AMLAK AI OFFICE — FREE_RENDER_2

نسخه ارتقایافته پروژه FREE_RENDER_1_1 برای دفتر املاک.

## قابلیت‌های اضافه‌شده
- Role واقعی Admin / Staff و محدودسازی داده‌های پرسنل
- مدیریت پرسنل و فعال/غیرفعال کردن حساب‌ها
- ثبت Activity Log / Audit برای ورود، ایجاد، ویرایش، تخصیص و انجام پیگیری
- گزارش عملکرد جداگانه هر پرسنل با بازه زمانی دلخواه
- گزارش HTML قابل چاپ و Save as PDF از مرورگر
- Backup / Restore کامل JSON از داخل پنل مدیر
- تخصیص ملک و مشتری به پرسنل
- Matching دوطرفه مشتری→ملک و ملک→مشتری با دلیل تطبیق
- پیگیری، موعد، انجام‌شدن و تشخیص عقب‌افتادگی
- جستجوی چندکلمه‌ای
- Health endpoint برای بررسی اجرای سرویس
- schema_version برای مهاجرت‌های بعدی و توسعه بدون شکستن داده‌ها

## Environment
- SESSION_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD
- DATA_FILE (اختیاری؛ پیش‌فرض ./data.json)

این نسخه عمداً PostgreSQL / pg / connect-pg-simple / DATABASE_URL ندارد.

## Render
Start command: `npm start`
Dockerfile: Node 20 Alpine و پورت `PORT`.

## محدودیت مهم Free Render
Filesystem سرویس Free پایدار نیست؛ بنابراین data.json بعد از restart/redeploy/spin-down تضمین ماندگاری ندارد. برای همین Backup/Restore داخل Admin اضافه شده است. برای استفاده عملی و دائمی، باید بعداً datastore پایدار اضافه شود؛ این کار بدون تغییر APIهای اصلی قابل انجام است.
