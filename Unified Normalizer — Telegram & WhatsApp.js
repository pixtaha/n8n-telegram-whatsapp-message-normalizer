{
  "nodes": [
    {
      "parameters": {
        "jsCode": "const ENV = 'dev';\n\nconst CONFIG = {\n  dev: {\n    tgToken: 'YOUR-BOT-TOKEN',\n    numbersTable: '---'\n  },\n  prod: {\n    tgToken: 'YOUR-BOT-TOKEN',\n    numbersTable: '---'\n  }\n};\n\nif (!CONFIG[ENV]) {\n  throw new Error(`Invalid ENV: ${ENV}`);\n}\n\n// جيب داتا التريجر الشغال\nlet triggerData = null;\n\ntry {\n  const tg = $('TG • Trigger!').first()?.json;\n  if (tg) triggerData = tg;\n} catch(_) {}\n\nif (!triggerData) {\n  try {\n    const wa = $('WA • Trigger!').first()?.json;\n    if (wa) triggerData = wa;\n  } catch(_) {}\n}\n\nreturn [{\n  json: {\n    env: ENV,\n    ...CONFIG[ENV],\n    triggerData\n  }\n}];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        112,
        1216
      ],
      "id": "e188f4a2-587e-446b-af93-8212e7978d24",
      "name": "ENV • Config"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "cc16e542-7743-49f2-8f97-a21eb3b720e2",
                    "leftValue": "={{ $('Normalize • Patient Message').item.json.callback_context }}",
                    "rightValue": "back",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Back"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        752,
        880
      ],
      "id": "473df6e6-d05d-40c7-9048-a51c88e417b2",
      "name": "SW • CallBack Type"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.telegram.org/bot{{ $('ENV • Config').first().json.tgToken }}/answerCallbackQuery",
        "sendBody": true,
        "specifyBody": "=json",
        "bodyParameters": {
          "parameters": [
            {}
          ]
        },
        "jsonBody": "={\n  \"callback_query_id\": \"{{ $('Normalize • Telegram').item.json.raw.callback_query.id }}\",\n  \"text\": \"✅ تم التسجيل بنجاح!\",\n  \"show_alert\": false\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        960,
        880
      ],
      "id": "4eb3f9e3-3f45-4e16-a8b5-3026d9416044",
      "name": "TG • Answer Callback Query"
    },
    {
      "parameters": {
        "jsCode": "// ===============================\n// Normalize • Patient Message (Telegram + WhatsApp)\n// ===============================\n\nlet raw = $input.first().json.triggerData;\n\nif (!raw) {\n  throw new Error('No trigger data found');\n}\n\nconst env = $input.first().json.env;\n\n// ===============================\n// Helpers\n// ===============================\nfunction safeGet(obj, path) {\n  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);\n}\n\nfunction normalizeDigits(text) {\n  if (!text) return text;\n  return text\n    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())\n    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());\n}\n\n// ===============================\n// Init\n// ===============================\nlet source_channel        = null;\nlet user_id               = null;\nlet chat_id               = null;\nlet message_text          = null;\nlet message_type          = null;\nlet is_command            = false;\nlet command               = null;\nlet callback_data         = null;\nlet callback_context      = null;\nlet callback_action       = null;\nlet callback_sid          = null;\nlet has_photo             = false;\nlet photo_file_id         = null;\nlet has_video             = false;\nlet video_file_id         = null;\nlet audio_file_id         = null;\nlet caption               = null;\nlet is_reply              = false;\nlet replied_to_text       = null;\nlet replied_to_photo_id   = null;\nlet replied_to_video_id   = null;\nlet replied_to_audio_id   = null;\nlet replied_to_type       = null;\n\n// ===============================\n// Detection: WhatsApp or Telegram?\n// ===============================\nconst isWhatsApp = !!(raw.body?.data?.key?.remoteJid);\nconst isTelegram = !!(raw.message || raw.callback_query);\n\n// ===============================\n// WhatsApp Branch\n// ===============================\nif (isWhatsApp) {\n  source_channel = 'whatsapp';\n\n  const payload   = raw.body || {};\n  const data      = payload.data || {};\n  const key       = data.key || {};\n  const msg       = data.message || {};\n  const remoteJid = key.remoteJid || null;\n\n  user_id = remoteJid ? remoteJid.replace('@s.whatsapp.net', '') : null;\n  chat_id = user_id;\n\n  const text =\n    msg.conversation ||\n    msg.extendedTextMessage?.text ||\n    null;\n\n  message_text = normalizeDigits(text);\n\n  // Reply detection (WhatsApp)\n  const contextInfo =\n    data.contextInfo ||\n    msg.audioMessage?.contextInfo ||\n    msg.imageMessage?.contextInfo ||\n    msg.videoMessage?.contextInfo ||\n    msg.extendedTextMessage?.contextInfo ||\n    null;\n\n  if (contextInfo?.quotedMessage) {\n    is_reply = true;\n    const quoted = contextInfo.quotedMessage;\n\n    if (quoted.imageMessage) {\n      replied_to_type     = 'photo';\n      replied_to_photo_id = quoted.imageMessage.url || null;\n      replied_to_text     = quoted.imageMessage.caption || null;\n    } else if (quoted.videoMessage) {\n      replied_to_type     = 'video';\n      replied_to_video_id = quoted.videoMessage.url || null;\n      replied_to_text     = quoted.videoMessage.caption || null;\n    } else if (quoted.audioMessage) {\n      replied_to_type     = 'audio';\n      replied_to_audio_id = quoted.audioMessage.url || null;\n    } else {\n      replied_to_type = 'text';\n      replied_to_text =\n        quoted.conversation ||\n        quoted.extendedTextMessage?.text ||\n        null;\n    }\n  }\n\n  if (msg.imageMessage) {\n    has_photo     = true;\n    message_type  = 'photo';\n    photo_file_id = msg.imageMessage.url || null;\n    caption       = msg.imageMessage.caption || null;\n  } else if (msg.videoMessage) {\n    has_video     = true;\n    message_type  = 'video';\n    video_file_id = msg.videoMessage.url || null;\n    caption       = msg.videoMessage.caption || null;\n  } else if (msg.audioMessage) {\n    message_type  = 'audio';\n    audio_file_id = msg.audioMessage.url || null;\n  } else if (msg.documentMessage) {\n    message_type  = 'document';\n  } else if (msg.stickerMessage) {\n    message_type  = 'sticker';\n  } else if (key.fromMe) {\n    message_type  = 'from_me';\n  } else {\n    message_type  = 'message';\n  }\n\n  // لو في reply نغير الـ message_type\n  if (is_reply && message_type === 'message') {\n    message_type = 'reply';\n  }\n}\n\n// ===============================\n// Telegram Branch\n// ===============================\nelse if (isTelegram) {\n  source_channel = 'telegram';\n  const input = raw;\n\n  if (input.callback_query) {\n    message_type  = 'callback_query';\n    user_id       = safeGet(input, 'callback_query.from.id');\n    chat_id       = safeGet(input, 'callback_query.message.chat.id');\n    callback_data = safeGet(input, 'callback_query.data');\n    message_text  = normalizeDigits(callback_data);\n\n    if (callback_data) {\n      const parts  = callback_data.split(':');\n      callback_context = parts[0] || null;\n      callback_action  = parts[1] || null;\n      callback_sid     = parts[2] || null;\n    }\n\n  } else if (input.message) {\n    user_id      = safeGet(input, 'message.from.id');\n    chat_id      = safeGet(input, 'message.chat.id');\n    caption      = normalizeDigits(safeGet(input, 'message.caption'));\n    message_text = normalizeDigits(safeGet(input, 'message.text')) || caption;\n\n    // Reply detection (Telegram)\n    if (input.message.reply_to_message) {\n      is_reply = true;\n      const rep = input.message.reply_to_message;\n\n      if (rep.photo && Array.isArray(rep.photo)) {\n        replied_to_type     = 'photo';\n        const best          = rep.photo[rep.photo.length - 1];\n        replied_to_photo_id = best.file_id;\n        replied_to_text     = rep.caption || null;\n      } else if (rep.video) {\n        replied_to_type     = 'video';\n        replied_to_video_id = rep.video.file_id;\n        replied_to_text     = rep.caption || null;\n      } else if (rep.voice || rep.audio) {\n        replied_to_type     = 'audio';\n        replied_to_audio_id = rep.voice?.file_id || rep.audio?.file_id || null;\n      } else {\n        replied_to_type = 'text';\n        replied_to_text = rep.text || rep.caption || null;\n      }\n    }\n\n    if (input.message.photo && Array.isArray(input.message.photo)) {\n      has_photo     = true;\n      message_type  = 'photo';\n      const best    = input.message.photo[input.message.photo.length - 1];\n      photo_file_id = best.file_id;\n    } else if (input.message.video) {\n      has_video     = true;\n      message_type  = 'video';\n      video_file_id = input.message.video.file_id;\n    } else if (input.message.voice || input.message.audio) {\n      message_type  = 'audio';\n      audio_file_id = input.message.voice?.file_id || input.message.audio?.file_id || null;\n    } else if (input.message.document) {\n      message_type = 'document';\n    } else if (input.message.sticker) {\n      message_type = 'sticker';\n    } else {\n      const entities = safeGet(input, 'message.entities');\n      if (Array.isArray(entities)) {\n        const cmd = entities.find(e => e.type === 'bot_command' && e.offset === 0);\n        if (cmd && message_text) {\n          is_command   = true;\n          command      = message_text.split(' ')[0];\n          message_type = 'command';\n        }\n      }\n      if (!message_type && input.message.reply_to_message) message_type = 'reply';\n      if (!message_type) message_type = 'message';\n    }\n  }\n\n} else {\n  message_type = 'unknown';\n}\n\n// ===============================\n// Unified Output\n// ===============================\nreturn [{\n  json: {\n    env,\n    source_channel,\n    user_id,\n    chat_id,\n    message_text,\n    message_type,\n    is_command,\n    command,\n    callback_data,\n    callback_context,\n    callback_action,\n    callback_sid,\n    has_photo,\n    photo_file_id,\n    has_video,\n    video_file_id,\n    audio_file_id,\n    caption,\n    is_reply,\n    replied_to_type,\n    replied_to_text,\n    replied_to_photo_id,\n    replied_to_video_id,\n    replied_to_audio_id,\n    raw\n  }\n}];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        288,
        1216
      ],
      "id": "1c9b47a5-b3b7-45fa-a2f6-557c670f0c60",
      "name": "Normalize • Patient Message"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "b00276ed-403e-4e57-b3e0-e2586c568e3c",
                    "leftValue": "={{ $json.message_type }}",
                    "rightValue": "callback",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Callback"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "74a17bde-d7bd-4b3b-90ba-4a3690f7848d",
                    "leftValue": "={{ $json.message_type }}",
                    "rightValue": "command",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Command"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "ae14fb05-5fd8-4da4-aa6d-9a64c90ecd57",
                    "leftValue": "={{ ['photo', 'video', 'audio'].includes($json.message_type) }}",
                    "rightValue": "={{ $json.photo_file_id || $json.video_file_id || $json.audio_file_id }}",
                    "operator": {
                      "type": "boolean",
                      "operation": "true",
                      "singleValue": true
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Asset"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "c1d876f8-03e5-420c-b100-c258118c6c44",
                    "leftValue": "={{ $json.message_type }}",
                    "rightValue": "message",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Text"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "78c767ca-c5e0-4cee-8c0a-ab1b1c031f2b",
                    "leftValue": "={{ $json.message_type }}",
                    "rightValue": "reply",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Reply"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        480,
        1168
      ],
      "id": "3bfabfab-66f4-4bdb-8416-7aa93ae72b24",
      "name": "Switch • Action Type"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "52d6de14-ab22-4a7e-a04d-4cf08a7fe32e",
                    "leftValue": "={{ $('Normalize • Patient Message').item.json.command }}",
                    "rightValue": "/start",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              }
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        752,
        1040
      ],
      "id": "52574efe-7356-44eb-bd13-630148036dfe",
      "name": "SW • Command Type"
    },
    {
      "parameters": {
        "updates": [
          "message",
          "callback_query"
        ],
        "additionalFields": {}
      },
      "type": "n8n-nodes-base.telegramTrigger",
      "typeVersion": 1.2,
      "position": [
        -80,
        1120
      ],
      "id": "YOUR-TRIGGER-ID-ITS-MADED-AUTOMATICILLY",
      "name": "TG • Trigger!",
      "webhookId": "YOUR-WEBHOOK-ID-ITS-MADED-AUTOMATICILLY",
      "credentials": {
        "telegramApi": {
          "id": "YOUR-TELEGRAM-ID-CREDENTIAL",
          "name": "YOUR-TELEGRAM-NAME-CREDENTIAL"
        }
      }
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "change-this-to-complex-text-okay",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        -272,
        1328
      ],
      "id": "7d1c0e63-bcbe-455a-9f7d-c265dd5032f6",
      "name": "WA • Trigger!",
      "webhookId": "b0fcf028-845a-46db-9873-47781cd452d4"
    },
    {
      "parameters": {
        "url": "=https://api.telegram.org/file/bot{{ $('ENV • Config').item.json.tgToken }}/{{ $json.result.file_path }}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        1200,
        1296
      ],
      "id": "71743c02-8bf4-4d39-8b8c-340695c716e6",
      "name": "Convert • File Id to Binary"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "leftValue": "={{ $json.body.data.key.fromMe }}",
                    "rightValue": false,
                    "operator": {
                      "type": "boolean",
                      "operation": "false",
                      "singleValue": true
                    },
                    "id": "3919d295-2508-4b09-8714-0cfab5268fcc"
                  }
                ],
                "combinator": "and"
              }
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        -80,
        1328
      ],
      "id": "070facc4-80a2-439b-a368-d8c72fcebc62",
      "name": "Check Sender • Not Me"
    },
    {
      "parameters": {
        "resource": "audio",
        "operation": "transcribe",
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 2.1,
      "position": [
        1856,
        1264
      ],
      "id": "4b55b668-a89a-4228-ab3c-974dd693c319",
      "name": "Transcribe a recording",
      "credentials": {
        "openAiApi": {
          "id": "ynA7zawWB0nPJmwD",
          "name": "YOUR-OPEN-AI-API"
        }
      }
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "leftValue": "={{ $json.source_channel }}",
                    "rightValue": "whatsapp",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    },
                    "id": "68c2bf0c-c424-49c7-abe4-be90953a7ae8"
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "WhatsApp"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "34481387-83b1-4e26-9a18-33508b64d820",
                    "leftValue": "={{ $json.source_channel }}",
                    "rightValue": "telegram",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Telegram"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        752,
        1216
      ],
      "id": "181eff33-6512-40b7-84da-e096342fe790",
      "name": "Switch • Source Channel"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=http://148.230.123.189:8080/chat/getBase64FromMediaMessage/alzawahri?url={{ encodeURIComponent($('Normalize • Patient Message').first().json.photo_file_id) }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "PixTahaApiKey-2026#"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"message\": {\n    \"key\": {{ JSON.stringify($('Normalize • Patient Message').first().json.raw.body.data.key) }},\n    \"message\": {{ JSON.stringify($('Normalize • Patient Message').first().json.raw.body.data.message) }}\n  },\n  \"convertToMp4\": false\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        976,
        1136
      ],
      "id": "da69d292-211d-4a6a-a6a0-52cf1da917ba",
      "name": "WA • Download Asset"
    },
    {
      "parameters": {
        "jsCode": "const item = $input.first().json;\nconst base64 = item.base64;\nconst mimeType = item.mimetype || 'image/jpeg';\nconst fileName = item.fileName || 'photo.jpg';\n\nreturn [{\n  json: { fileName, mimeType },\n  binary: {\n    data: await this.helpers.prepareBinaryData(\n      Buffer.from(base64, 'base64'),\n      fileName,\n      mimeType\n    )\n  }\n}];"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1200,
        1136
      ],
      "id": "157dce90-6ebf-4401-a9bb-6705dcdc9a4b",
      "name": "Convert • Base64 to Binary"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://api.telegram.org/bot{{ $('ENV • Config').item.json.tgToken }}/getFile",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "file_id",
              "value": "={{ $json.photo_file_id || $json.video_file_id || $json.audio_file_id }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        976,
        1296
      ],
      "id": "531cc53d-9650-47ef-9b07-1ef8d9ae054e",
      "name": "TG • Download Asset"
    },
    {
      "parameters": {},
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3.2,
      "position": [
        1440,
        1232
      ],
      "id": "36d73495-6e32-4211-bfef-ccfc329bf468",
      "name": "Merge"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "leftValue": "={{ $('Normalize • Patient Message').item.json.message_type }}",
                    "rightValue": "photo",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    },
                    "id": "9910dacd-e8b2-4e9f-a300-f3a9d7dccdbd"
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Photo"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "ed17976a-a612-4834-9d17-0d1a0e41cd02",
                    "leftValue": "={{ $('Normalize • Patient Message').item.json.message_type }}",
                    "rightValue": "video",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Video"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 3
                },
                "conditions": [
                  {
                    "id": "88f95894-f495-4e53-bef4-697bf217f6d8",
                    "leftValue": "={{ $('Normalize • Patient Message').item.json.message_type }}",
                    "rightValue": "audio",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Audio"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [
        1616,
        1216
      ],
      "id": "315aeb19-0fb1-41de-9614-e1121be5fd1b",
      "name": "Switch • Asset Type"
    }
  ],
  "connections": {
    "ENV • Config": {
      "main": [
        [
          {
            "node": "Normalize • Patient Message",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "SW • CallBack Type": {
      "main": [
        [
          {
            "node": "TG • Answer Callback Query",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Normalize • Patient Message": {
      "main": [
        [
          {
            "node": "Switch • Action Type",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Switch • Action Type": {
      "main": [
        [
          {
            "node": "SW • CallBack Type",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "SW • Command Type",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Switch • Source Channel",
            "type": "main",
            "index": 0
          }
        ],
        [],
        []
      ]
    },
    "TG • Trigger!": {
      "main": [
        [
          {
            "node": "ENV • Config",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "WA • Trigger!": {
      "main": [
        [
          {
            "node": "Check Sender • Not Me",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Convert • File Id to Binary": {
      "main": [
        [
          {
            "node": "Merge",
            "type": "main",
            "index": 1
          }
        ]
      ]
    },
    "Check Sender • Not Me": {
      "main": [
        [
          {
            "node": "ENV • Config",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Switch • Source Channel": {
      "main": [
        [
          {
            "node": "WA • Download Asset",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "TG • Download Asset",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "WA • Download Asset": {
      "main": [
        [
          {
            "node": "Convert • Base64 to Binary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Convert • Base64 to Binary": {
      "main": [
        [
          {
            "node": "Merge",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "TG • Download Asset": {
      "main": [
        [
          {
            "node": "Convert • File Id to Binary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Merge": {
      "main": [
        [
          {
            "node": "Switch • Asset Type",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Switch • Asset Type": {
      "main": [
        [],
        [],
        [
          {
            "node": "Transcribe a recording",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "9b125712cc5502d4ab8f8406ba98d7ea6bb98e42e1546ea1fc6feab52f285a10"
  }
}