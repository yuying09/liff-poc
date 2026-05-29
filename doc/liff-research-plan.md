# LINE LIFF 10 小時 MVP 研究計劃

## Context

目標：以「LINE 會員登入 + 個人資料展示」作為業務場景 PoC，在 10 小時內模擬完整 LIFF 開發流程，系統性挖掘以下兩大技術風險：
1. **Next.js 16 SSR / React Server Components 與 LIFF SDK 的相容性問題**
2. **LIFF 身份驗證流程（login、profile、token 管理）的行為差異**

現況：專案為全新 Next.js 16 + React 19 + Tailwind CSS v4 專案，尚無任何 LIFF 相關程式碼或 LINE Developers 帳號設定。

---

## 時間分配（10 小時）

### Hour 1 — 外部環境建置（帳號 & 工具）
**目標：** 完成所有開發前置條件，不觸碰程式碼

步驟：
1. 申請 [LINE Developers Console](https://developers.line.biz/) 帳號
2. 建立 Provider → 建立 **LINE Login Channel**
3. 在 Channel 內新增 LIFF App，設定：
   - Endpoint URL：`https://<ngrok-id>.ngrok-free.app`（暫定）
   - Scope：`profile openid`
   - Size：Full
4. 安裝 ngrok（`brew install ngrok`）並申請免費帳號取得 static domain
5. 建立 `.env.local`：
   ```
   NEXT_PUBLIC_LIFF_ID=xxxx-xxxxxxxx
   ```

**預期踩坑：**
- LINE Developers 審核 / 設定頁面不直覺（記錄截圖流程）
- ngrok free tier 每次重啟 URL 會變，需重新更新 LIFF Endpoint URL → 建議用 static domain 或 Cloudflare Tunnel

---

### Hour 2 — 研究 Next.js 16 文件 & 安裝 LIFF SDK
**目標：** 在動手前先確認 Next.js 16 的 breaking changes

步驟：
1. 閱讀 `node_modules/next/dist/docs/` 中與 App Router、Client Components、dynamic import 相關的章節（per AGENTS.md 要求）
2. 安裝 LIFF SDK：`pnpm add @line/liff`
3. 查閱 `@line/liff` 的 TypeScript 型別支援狀況
4. 記錄 Next.js 16 中與 LIFF 整合相關的 API 差異

**預期踩坑：**
- `@line/liff` 直接 import 在 Server Component 會拋 `window is not defined`
- Next.js 16 可能對 `dynamic()` 或 `'use client'` 有行為變更 → 需實際驗證

---

### Hour 3 — LIFF 初始化架構設計
**目標：** 建立可靠的 LIFF 初始化 pattern，解決 SSR 問題

檔案規劃：
- `src/lib/liff.ts` — LIFF singleton 封裝（僅限 client 執行）
- `src/components/LiffProvider.tsx` — `'use client'` Context Provider，負責 `liff.init()`
- `src/hooks/useLiff.ts` — 提供 `liff`, `isReady`, `error` 狀態的 hook

關鍵決策：
- 使用 `dynamic(() => import(...), { ssr: false })` 或純 `'use client'` + `useEffect` 來延遲 LIFF SDK 載入
- `liff.init()` 必須在 `useEffect` 內執行，避免 SSR hydration 錯誤

**預期踩坑：**
- Next.js 16 的 App Router 中，Provider 必須放在 `layout.tsx` 且標記 `'use client'`，但 layout 若為 Server Component 會造成整棵樹問題
- `liff.init()` 是 async，需處理 loading state 防止頁面閃爍

---

### Hour 4 — 身份驗證流程實作
**目標：** 完整實作 login/logout + profile 取得

功能：
- `liff.isLoggedIn()` → 未登入導向 `liff.login()`
- `liff.getProfile()` → 取得 `displayName`, `pictureUrl`, `userId`
- `liff.getAccessToken()` → 取得 token（後端 API 驗證用）
- `liff.getIDToken()` → 取得 ID token
- `liff.logout()` → 登出

環境差異測試矩陣（需實際測試並記錄結果）：

| 場景 | 行為 |
|------|------|
| LINE app 內開啟（in-client） | 自動登入，不跳轉 |
| 外部瀏覽器開啟 | 跳轉 LINE 授權頁 |
| 開發環境 localhost | 需 ngrok |

**預期踩坑：**
- `liff.login()` 在外部瀏覽器會做完整 OAuth redirect，state 會遺失 → 需用 `redirectUri` 帶回參數
- iOS LINE app 的 token refresh 行為與 Android 不同
- `liff.getProfile()` 需等 `liff.init()` 完成後才能呼叫，時序管理複雜

---

### Hour 5 — 會員資料展示 UI 實作
**目標：** 完成業務場景的視覺呈現

頁面：`src/app/page.tsx`（主頁，整合 LiffProvider）

UI 元件：
- 載入狀態 skeleton
- 登入前：LINE 品牌風格登入按鈕
- 登入後：頭像 + 顯示名稱 + userId + 登出按鈕
- 錯誤狀態：LIFF init 失敗的友善提示

環境偵測資訊顯示（DEBUG 用途）：
- `liff.isInClient()` — 是否在 LINE app 內
- `liff.getOS()` — ios / android / web
- `liff.getLineVersion()` — LINE 版本號

---

### Hour 6 — LIFF 進階 API 探索
**目標：** 驗證業務常用功能的可行性

測試項目：
- `liff.sendMessages()` — 代發訊息到聊天室（需 in-client）
- `liff.closeWindow()` — 關閉 LIFF 視窗
- `liff.openWindow({ url, external })` — 開啟外部連結
- `liff.getContext()` — 取得 userId、roomId、groupId 等對話上下文
- `liff.permanentLink.createUrl()` — 產生 LIFF 深層連結

**預期踩坑：**
- `sendMessages()` 只能在 in-client 環境使用，外部瀏覽器呼叫會報錯
- `getContext()` 在非對話觸發的場景下部分欄位為 null

---

### Hour 7 — HTTPS 本地開發流程驗證
**目標：** 建立可重複使用的本地測試流程

步驟：
1. `pnpm dev` 啟動本地 server（port 3000）
2. `ngrok http --domain=<static-domain> 3000` 建立 tunnel
3. 手機掃 QR code 或直接在 LINE 開啟 LIFF URL 進行測試
4. 記錄完整的本地開發 → 手機測試 SOP

**預期踩坑：**
- ngrok free static domain 每月有流量限制
- LINE app 的 in-app browser 有 cache，開發時需強制重新整理
- 某些 LIFF 功能只有在手機實機才能測試，模擬器無效

---

### Hour 8 — 錯誤處理 & 非 LINE 環境 Fallback
**目標：** 讓應用在各種環境下都有合理行為

情境處理：
- LIFF init 失敗（網路問題、LIFF ID 錯誤）
- 用戶拒絕授權
- 在一般瀏覽器直接輸入 URL 訪問
- LIFF SDK 版本過舊的 LINE app

Fallback 策略：
- `liff.isInClient() === false` → 顯示引導提示「請在 LINE 內開啟」或允許外部瀏覽器登入
- 開發環境 mock 策略（`NEXT_PUBLIC_MOCK_LIFF=true` 時跳過真實初始化）

---

### Hour 9 — Token 安全傳遞 & 後端驗證架構
**目標：** 確認前後端整合的安全模型

研究項目：
- `liff.getAccessToken()` vs `liff.getIDToken()` 的用途差異
- Next.js Route Handler（`app/api/`）如何接收並驗證 LINE token
- Token 有效期限與 refresh 機制
- userId 是否可作為唯一識別（可以，但 Channel 間不互通）

架構草圖：
```
LIFF App → getAccessToken() → POST /api/auth → LINE API 驗證 token → 回傳 session
```

**預期踩坑：**
- LIFF access token 有效期很短（約 1 小時），後端快取需注意
- 不同 Channel 的 userId 不同，跨服務整合需額外處理

---

### Hour 10 — 問題彙整 & 技術評估報告
**目標：** 輸出可供決策的研究成果

產出文件：`docs/liff-research-findings.md`

報告結構：
1. **已確認可行項目** — 列出成功驗證的功能清單
2. **已確認問題清單** — 每個問題附上：現象、根因、解法/workaround
3. **未解決風險** — 需要更多時間或真實 LINE 帳號才能驗證的項目
4. **架構建議** — 適合此技術棧的 LIFF 整合模式
5. **Go/No-Go 建議** — 是否建議在正式專案採用 LIFF，附理由

---

## 預期挖掘的關鍵問題清單

| # | 問題 | 風險等級 |
|---|------|---------|
| 1 | LIFF SDK `window is not defined` SSR 崩潰 | 高 |
| 2 | Next.js 16 `'use client'` 邊界管理 + LiffProvider 放置位置 | 高 |
| 3 | `liff.login()` OAuth redirect 在 SPA 中的 state 遺失 | 高 |
| 4 | 本地開發 HTTPS 流程繁瑣（ngrok 依賴） | 中 |
| 5 | iOS LINE in-app browser 特殊限制（部分 Web API 不支援） | 中 |
| 6 | LIFF ID 多環境（dev/staging/prod）管理策略 | 中 |
| 7 | `sendMessages()` 只能在 in-client 使用的功能限制 | 中 |
| 8 | Token 短效期導致後端 session 管理複雜 | 中 |
| 9 | `getContext()` 在不同入口的 null 欄位 | 低 |
| 10 | LINE 不同版本的 LIFF SDK 相容性 | 低 |

---

## 關鍵檔案（待建立）

- `src/lib/liff.ts` — LIFF SDK 封裝
- `src/components/LiffProvider.tsx` — Client Context Provider
- `src/hooks/useLiff.ts` — LIFF state hook
- `src/app/page.tsx` — 主頁面（改寫現有檔案）
- `.env.local` — 環境變數（含 LIFF ID）
- `docs/liff-research-findings.md` — 研究成果報告

---

## 驗證方式

1. **功能驗證**：`pnpm dev` + ngrok → 手機 LINE app 掃碼測試登入流程
2. **SSR 驗證**：`pnpm build && pnpm start` → 確認無 server-side `window` 錯誤
3. **型別驗證**：`pnpm tsc --noEmit` → TypeScript 零錯誤
4. **非 LINE 環境**：桌面瀏覽器直接訪問 → 確認 fallback 正常運作
