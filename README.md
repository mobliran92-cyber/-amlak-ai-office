# دفتر املاک هوشمند — FREE Render 1.1

نسخه رایگان برای راه‌اندازی اولیه روی Render Free.

- Node.js + Express
- ذخیره‌سازی سبک JSON محلی (بدون PostgreSQL پولی)
- ورود مدیر/کارشناس
- فایل ملک، مشتری، پیگیری
- تطبیق امتیازی مشتری/ملک
- جستجو و داشبورد
- PWA و رابط فارسی

## Render
Language: Docker
Branch: main
Compute: Free
Environment Variables:
- SESSION_SECRET = یک رشته تصادفی طولانی
- ADMIN_EMAIL = ایمیل مدیر
- ADMIN_PASSWORD = رمز مدیر

DATABASE_URL در این نسخه لازم نیست و می‌توان آن را حذف کرد.

نکته: Render Free برای تست و راه‌اندازی اولیه مناسب است و دیسک پایدار ندارد؛ داده‌های JSON ممکن است با restart/redeploy از بین بروند. برای داده واقعی دائمی، بعداً باید دیتابیس پایدار اضافه شود.
