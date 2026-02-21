# 🤖 n8n Unified Message Normalizer
### Telegram + WhatsApp Dual-Channel Input Handler

> **اسم الريبو المقترح:** `n8n-unified-message-normalizer`
> **اسم الـ Workflow:** `Unified Message Normalizer — TG + WA`

---

## 📌 ما هو هذا الـ Workflow؟

هذا الـ workflow هو **طبقة تطبيع موحدة (Normalization Layer)** تستقبل الرسائل من **Telegram** و**WhatsApp** في نفس الوقت، وتحولها إلى **output موحد ومتسق** بغض النظر عن مصدر الرسالة.

الهدف: بدلاً من كتابة كود منفصل لكل قناة، كل الـ nodes التالية في الـ workflow تتعامل مع نفس البيانات بنفس الشكل.

---

## 🏗️ معمارية الـ Workflow

```
TG • Trigger! ──┐
                ├──→ Check / ENV • Config ──→ Normalize • Patient Message ──→ Switch • Action Type
WA • Trigger! ──┘
```

### Nodes الرئيسية:

| Node | النوع | الوظيفة |
|------|-------|----------|
| `TG • Trigger!` | Telegram Trigger | استقبال رسائل Telegram |
| `WA • Trigger!` | Webhook | استقبال رسائل WhatsApp عبر Evolution API |
| `Check Sender • Not Me` | Switch | فلترة رسائل الـ Bot نفسه من WhatsApp |
| `ENV • Config` | Code | إعدادات البيئة (dev/prod) + جلب بيانات الـ trigger |
| `Normalize • Patient Message` | Code | **القلب** — تطبيع الرسالة من الاتنين |
| `Switch • Action Type` | Switch | توجيه الرسالة حسب نوعها |
| `Switch • Source Channel` | Switch | تفريق WhatsApp عن Telegram للـ assets |
| `WA • Download Asset` | HTTP Request | تحميل الملفات من WhatsApp عبر Evolution API |
| `TG • Download Asset` | HTTP Request | جلب الـ file_path من Telegram API |
| `Convert • Base64 to Binary` | Code | تحويل base64 الواتساب لـ binary |
| `Convert • File Id to Binary` | HTTP Request | تحميل الملف من Telegram كـ binary |
| `Merge` | Merge | دمج الـ binary من الاتنين في مسار واحد |
| `Switch • Asset Type` | Switch | توجيه الـ asset (Photo / Video / Audio) |
| `Transcribe a recording` | OpenAI | تحويل الصوت لنص بـ Whisper |

---

## 🔄 الـ Normalize Node — القلب

الـ `Normalize • Patient Message` node هو أهم جزء في الـ workflow.

### المدخلات التي يعالجها:

**من Telegram:**
- ✅ Text message
- ✅ Command (e.g. `/start`)
- ✅ Callback Query (inline buttons)
- ✅ Photo
- ✅ Video
- ✅ Voice / Audio
- ✅ Document
- ✅ Sticker
- ✅ Reply to any message type

**من WhatsApp (عبر Evolution API):**
- ✅ Text message
- ✅ Image
- ✅ Video
- ✅ Audio / Voice
- ✅ Document
- ✅ Sticker
- ✅ Reply to any message type
- ✅ فلترة رسائل الـ `fromMe`

### الـ Output الموحد:

```json
{
  "env": "dev",
  "source_channel": "telegram | whatsapp",
  "user_id": 123456789,
  "chat_id": 123456789,
  "message_text": "نص الرسالة",
  "message_type": "message | command | callback_query | photo | video | audio | reply | document | sticker | from_me | unknown",
  "is_command": false,
  "command": "/start",
  "callback_data": "context:action:sid",
  "callback_context": "context",
  "callback_action": "action",
  "callback_sid": "sid",
  "has_photo": false,
  "photo_file_id": "file_id أو url",
  "has_video": false,
  "video_file_id": "file_id أو url",
  "audio_file_id": "file_id أو url",
  "caption": "كابشن الصورة أو الفيديو",
  "is_reply": false,
  "replied_to_type": "text | photo | video | audio",
  "replied_to_text": "نص الرسالة المردود عليها",
  "replied_to_photo_id": "file_id أو url",
  "replied_to_video_id": "file_id أو url",
  "replied_to_audio_id": "file_id أو url",
  "raw": {}
}
```

---

## 🔀 منطق التوجيه (Routing)

```
Switch • Action Type
├── Callback  → SW • CallBack Type → TG • Answer Callback Query
├── Command   → SW • Command Type  → (your command handlers)
├── Asset     → Switch • Source Channel
│               ├── WhatsApp → WA • Download Asset → Convert • Base64 to Binary ──┐
│               └── Telegram → TG • Download Asset  → Convert • File Id to Binary ──┤
│                                                                                    ↓
│                                                                                  Merge
│                                                                                    ↓
│                                                                          Switch • Asset Type
│                                                                          ├── Photo
│                                                                          ├── Video
│                                                                          └── Audio → Transcribe (OpenAI Whisper)
├── Text      → (your text handlers)
└── Reply     → (your reply handlers)
```

---

## ⚙️ الإعداد والتهيئة

### 1. متطلبات

- n8n (self-hosted أو cloud)
- Telegram Bot Token
- Evolution API (لـ WhatsApp)
- OpenAI API Key (للـ Transcription — اختياري)

### 2. إعداد البيئة في `ENV • Config`

```javascript
const ENV = 'dev'; // غير لـ 'prod' في الإنتاج

const CONFIG = {
  dev: {
    tgToken: 'YOUR-BOT-TOKEN',
    numbersTable: '---'
  },
  prod: {
    tgToken: 'YOUR-BOT-TOKEN',
    numbersTable: '---'
  }
};
```

### 3. إعداد WhatsApp Webhook

في Evolution API، اضبط الـ webhook URL على:
```
https://your-n8n-domain/webhook/change-this-to-complex-text-okay
```

> ⚠️ **مهم:** غيّر الـ `change-this-to-complex-text-okay` لنص عشوائي معقد لأمان أكبر.

### 4. إعداد الـ Credentials

- **Telegram:** أضف Bot Token في node الـ `TG • Trigger!`
- **OpenAI:** أضف API Key في node الـ `Transcribe a recording`
- **Evolution API:** الـ `apikey` موجود في الـ headers بتاع `WA • Download Asset`

---

## 🔧 تفاصيل تقنية مهمة

### لماذا `ENV • Config` يجيب بيانات الـ Trigger؟

n8n لا يسمح بالإشارة لـ node لم يتم تنفيذه في نفس الـ execution. لذلك الـ `ENV • Config` يستخدم `try/catch` لجلب بيانات الـ trigger الشغال ويمررها كـ `triggerData`.

### تطبيع الأرقام العربية

الـ `normalizeDigits` function تحول الأرقام العربية والفارسية لأرقام إنجليزية:
- `٠١٢٣٤٥٦٧٨٩` → `0123456789`
- `۰۱۲۳۴۵۶۷۸۹` → `0123456789`

### تحميل الملفات من WhatsApp

WhatsApp يرسل الملفات مشفرة (encrypted). نستخدم Evolution API لفك التشفير وإرجاع الملف كـ base64:

```
POST /chat/getBase64FromMediaMessage/{instance}
```

ثم نحوله لـ binary في الـ `Convert • Base64 to Binary` node.

### تحميل الملفات من Telegram

Telegram يستخدم `file_id` وليس URL مباشر. العملية خطوتان:
1. `getFile` API → نحصل على `file_path`
2. تحميل الملف من `https://api.telegram.org/file/bot{TOKEN}/{file_path}`

---

## 📝 ملاحظات للتطوير

- الـ `message_type` الممكنة: `message`, `command`, `callback_query`, `photo`, `video`, `audio`, `reply`, `document`, `sticker`, `from_me`, `unknown`
- الـ `callback_data` يتبع format: `context:action:sid`
- لإضافة قناة جديدة: أضف branch جديد في الـ `Normalize` node
- الـ `raw` field يحتوي على البيانات الأصلية كاملة للـ debugging

---

## 🤝 المساهمة

هذا الـ workflow مفتوح المصدر. يسعدني استقبال:
- Bug reports
- اقتراحات لأنواع رسائل جديدة
- تحسينات على الكود

---

*تم بناء هذا الـ workflow بـ ❤️ لمساعدة مطوري n8n العرب*
