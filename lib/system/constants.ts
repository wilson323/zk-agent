export const SUPPORTED_LANGUAGES = [
  { code: "zh-CN", name: "中文(简体)" },
  { code: "zh-TW", name: "中文(繁体)" },
  { code: "en-US", name: "英语(美国)" },
  { code: "en-GB", name: "英语(英国)" },
  { code: "ja-JP", name: "日语" },
  { code: "ko-KR", name: "韩语" },
  { code: "fr-FR", name: "法语" },
  { code: "de-DE", name: "德语" },
  { code: "es-ES", name: "西班牙语" },
  { code: "ru-RU", name: "俄语" },
]

export const AUDIO_FORMATS = [
  { value: "wav", label: "WAV (推荐)" },
  { value: "mp3", label: "MP3" },
  { value: "flac", label: "FLAC (高质量)" },
  { value: "webm", label: "WebM" },
]

export const ENCODING_FORMATS = [
  { value: "LINEAR16", label: "LINEAR16 (推荐)" },
  { value: "FLAC", label: "FLAC" },
  { value: "MULAW", label: "MULAW" },
  { value: "AMR", label: "AMR" },
]
