# LIO_UI_AND_ANIMATION.md

## هدف

این فایل نحوه حضور بصری «لیو» در UI دستیار لیارا و استفاده از انیمیشن موجود را مشخص می‌کند.

## Assets

فایل‌های نهایی در پروژه:

```text
public/images/liv-wave-web-512.webp
public/images/liv-wave-web-small.webp
```

این فایل‌ها مرجع تصویری نهایی هستند و نباید بازطراحی، recolor، crop یا تبدیل شوند.

## نقش انیمیشن

انیمیشن فعلی «wave» برای:
- خوشامدگویی
- Home / Empty State
- معرفی اولیه لیو

استفاده می‌شود.

در خطای جدی، امنیت، پرداخت یا پیام‌های بحرانی، انیمیشن تزئینی نباید توجه را از پیام اصلی منحرف کند.

## Home

لیو در Hero/معرفی اصلی Home کنار پیام معرفی نمایش داده شود.

متن پیشنهادی:

> سلام، من لیو هستم 👋  
> توی تمام مراحل دیپلوی کنارت هستم. اگر سؤالی داشتی یا جایی به مشکل خوردی، کافیه بهم بگی.

و در همان تجربه اولیه، شعار رسمی فقط یک‌بار:

> نگران نباش، با هم دیپلویش می‌کنیم.

## Conversation

در Conversation یک حضور کوچک و ثابت برای هویت دستیار کافی است:
- header
- assistant identity
- یا avatar کوچک

نباید تصویر بزرگ لیو کنار تک‌تک پیام‌ها تکرار شود.

## Responsive

برای نمایش واکنش‌گرا از asset کوچک/بزرگ استفاده شود:

```jsx
<img
  src="/images/liv-wave-web-512.webp"
  srcSet="
    /images/liv-wave-web-small.webp 256w,
    /images/liv-wave-web-512.webp 512w
  "
  sizes="(max-width: 640px) 256px, 512px"
  alt="لیو، دستیار هوش مصنوعی لیارا"
  width="512"
  height="532"
/>
```

در صورت نیاز می‌توان از `<picture>` استفاده کرد.

## محدودیت‌ها

- preserve aspect ratio
- transparent background preserved
- no horizontal overflow
- no layout shift
- no animation library
- no JS animation system
- no decorative gradients solely for Lio
- no speech bubble unless existing UI already supports it
- no oversized mascot on mobile

## Accessibility

Primary instance:
`alt="لیو، دستیار هوش مصنوعی لیارا"`

Secondary decorative instance:
`alt=""`

## UI microcopy

لیو باید جای متن generic مثل «دستیار لیارا» را در بخش‌های اصلی identity بگیرد.

نمونه:
- «لیو، دستیار لیارا»
- «از لیو بپرس»
- «لیو داره بررسی می‌کنه…»

اما نام «لیو» نباید بی‌دلیل در هر پیام تکرار شود.

## Loading

به‌جای جملات robotic:
- «دارم بررسیش می‌کنم…»
- «یک لحظه، دارم منبع درستش رو پیدا می‌کنم.»

اگر loading indicator فعلی وجود دارد، حفظ شود؛ لازم نیست از wave animation برای loading استفاده شود.

## Success

نمونه:
> عالی شد! برنامه‌ات با موفقیت دیپلوی شد ✨

## Error

نمونه:
> یک مشکل پیدا کردم. اول علتش رو مشخص کنیم، بعد قدم بعدی رو با هم می‌ریم.

در خطای جدی لحن جدی‌تر و بدون ایموجی باشد.
