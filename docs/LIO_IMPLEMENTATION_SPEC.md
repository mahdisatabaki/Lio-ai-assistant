# LIO_IMPLEMENTATION_SPEC.md

## هدف

تغییر هویت دستیار موجود از یک «Liara AI Assistant» عمومی به شخصیت محصول «لیو» بدون تغییر Scope اصلی MVP.

## Source of Truth

فایل‌های مرجع:

- `docs/LIO_CHARACTER_GUIDE.md`
- `docs/LIO_SYSTEM_PROMPT.md`
- `docs/LIO_UI_AND_ANIMATION.md`

## محدوده تغییر

### 1. Product identity
- نام نمایشی دستیار در UI به «لیو» تغییر کند.
- معرفی Home با شخصیت لیو هماهنگ شود.
- generic assistant copy با Lio microcopy جایگزین شود.
- نام فنی پروژه، API routes و architecture لازم نیست rename شوند.

### 2. System prompt
- پرامپت generation/troubleshooting بر اساس `LIO_SYSTEM_PROMPT.md` بازنویسی شود.
- Grounding، abstention، source policy و cost budget فعلی حفظ شوند.
- شخصیت نباید باعث hallucination یا verbosity شود.

### 3. Deterministic responses
تمام پاسخ‌های deterministic مهم باید با لحن لیو هماهنگ شوند:
- welcome
- deployment journey
- clarification
- troubleshooting
- success
- failure
- rate limit
- oversized input
- unsupported framework
- confirmation

### 4. Confirmation boundary
هویت لیو نباید محدودیت محصول را تغییر دهد.
هر عملیات اثرگذار همچنان نیازمند تأیید صریح است.

### 5. Animation/UI
Assets موجود در `public/images` استفاده شوند.
Home: حضور اصلی
Conversation: حضور کوچک
Mobile: asset کوچک
No redesign.

### 6. Existing product behavior to preserve
- RAG grounding
- source cards
- deterministic journey
- Build on Liara
- troubleshooting flow
- side-question preservation
- rate limiting
- health
- cost budget
- Persian RTL + technical LTR
- no persistent memory unless already in scope

### 7. Tests
تست‌های رفتاری موجود نباید شکسته شوند.
برای شخصیت، فقط تست‌های باارزش اضافه شوند:
- welcome copy contains Lio identity
- serious error has no playful emoji
- destructive/paid action asks confirmation
- slogan not repeated in every response
- technical tokens remain untouched

### 8. Non-goals
- backend rewrite
- new agent framework
- persistent profile
- multi-agent
- new animation states
- new mascot assets
- voice
- TTS
- auth
- streaming
