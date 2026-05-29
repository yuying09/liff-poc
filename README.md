# LINE LIFF PoC — Next.js

以 Next.js 實作的 LINE LIFF 最小可行性研究專案，驗證 LIFF 與 Next.js App Router 的整合可行性。

## 專案說明

- **框架**：Next.js 16 + React 19 + TypeScript
- **樣式**：Tailwind CSS v4
- **部署**：Vercel
- **研究目標**：LINE LIFF 身份驗證流程、SSR/RSC 相容性問題

## 環境設定

建立 `.env.local`：

```
NEXT_PUBLIC_LIFF_ID=你的LIFF-ID
```

LIFF ID 從 [LINE Developers Console](https://developers.line.biz/console/) 取得。

## 本地開發

```bash
pnpm install
pnpm dev
```

> LIFF 需要 HTTPS，本地測試請搭配 ngrok 或 Vercel 部署後測試。

## 專案結構

```
src/
├── app/
│   ├── layout.tsx        # 包含 LiffProvider
│   └── page.tsx          # 主頁面（登入 / 會員資料）
├── components/
│   └── LiffProvider.tsx  # LIFF 初始化與狀態管理
├── hooks/
│   └── useLiff.ts        # 取用 LIFF 狀態的 hook
└── lib/
    └── liff.ts           # LIFF SDK 動態載入封裝
```

## 測試方式

用手機 LINE 開啟：

```
https://liff.line.me/<LIFF-ID>
```

或瀏覽器直接開啟 Vercel 網址測試外部瀏覽器登入流程。

## 快速初始化（Claude Code Skill）

[doc/liff-next-init.md](doc/liff-next-init.md) 是一份 Claude Code 自訂指令，可協助在新的 Next.js 專案中快速完成 LINE LIFF 初始化。

將檔案複製到 `~/.claude/commands/` 後，在 Claude Code 輸入 `/liff-next-init` 即可啟動引導流程。

```bash
cp doc/liff-next-init.md ~/.claude/commands/liff-next-init.md
```

## 文件

- [研究計劃](doc/liff-research-plan.md)
- [LiffProvider 說明](doc/LiffProvider.md)
- [開發研究筆記](doc/line-liff-init.md)
- [LIFF Next.js 初始化指令](doc/liff-next-init.md)
