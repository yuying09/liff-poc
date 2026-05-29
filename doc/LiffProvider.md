# LiffProvider

**路徑**：`src/components/LiffProvider.tsx`

整個檔案做一件事：**建立一個 React Context，讓整個 App 都能取得 LIFF 的狀態與功能**。

---

## 第一部分：型別定義

### 程式碼

```typescript
export type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type State = {
  liff: Liff | null;
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: Profile | null;
  error: Error | null;
};

type Action =
  | { type: "INIT_SUCCESS"; liff: Liff; isLoggedIn: boolean; isInClient: boolean; profile: Profile | null }
  | { type: "INIT_ERROR"; error: Error }
  | { type: "LOGOUT" };

const initialState: State = {
  liff: null,
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
  profile: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_SUCCESS":
      return {
        ...state,
        liff: action.liff,
        isReady: true,
        isLoggedIn: action.isLoggedIn,
        isInClient: action.isInClient,
        profile: action.profile,
      };
    case "INIT_ERROR":
      return { ...state, isReady: true, error: action.error };
    case "LOGOUT":
      return { ...state, isLoggedIn: false, profile: null };
    default:
      return state;
  }
}
```

### 說明

`State` 是整個 LIFF 的狀態快照，記錄當下 LIFF 實例、登入狀態、環境資訊與錯誤。

`Action` 是會觸發狀態變化的三種事件：

| Action | 觸發時機 |
|--------|---------|
| `INIT_SUCCESS` | LIFF 初始化成功 |
| `INIT_ERROR` | 初始化失敗（含 LIFF ID 未設定） |
| `LOGOUT` | 用戶登出 |

`reducer` 函式定義每種 Action 發生時，State 要怎麼變。採用 `useReducer` 而非多個 `useState`，確保所有狀態在同一次更新中一起變更，避免中間狀態不一致（例如 `isLoggedIn: true` 但 `profile` 還是 `null`）。

---

## 第二部分：初始化

### 程式碼

```typescript
export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

    async function init() {
      if (!liffId) {
        dispatch({ type: "INIT_ERROR", error: new Error("NEXT_PUBLIC_LIFF_ID is not set") });
        return;
      }
      try {
        const { getLiff } = await import("@/lib/liff");
        const liffInstance = await getLiff();
        await liffInstance.init({ liffId });

        const loggedIn = liffInstance.isLoggedIn();
        const profile = loggedIn ? await liffInstance.getProfile() : null;

        dispatch({
          type: "INIT_SUCCESS",
          liff: liffInstance,
          isLoggedIn: loggedIn,
          isInClient: liffInstance.isInClient(),
          profile,
        });
      } catch (err) {
        dispatch({ type: "INIT_ERROR", error: err instanceof Error ? err : new Error(String(err)) });
      }
    }

    init();
  }, []);
```

### 說明

App 載入後執行一次，流程如下：

1. 用 `initCalled` ref 防止 React Strict Mode 的雙重執行
2. 動態載入 `@line/liff`（避免 SSR 時 `window is not defined` 崩潰）
3. 呼叫 `liff.init({ liffId })` 完成 LIFF 初始化
4. 判斷用戶是否已登入（`isLoggedIn`）、是否在 LINE app 內（`isInClient`）
5. 若已登入則取得 profile
6. 將結果用單一 `dispatch(INIT_SUCCESS)` 一次更新所有狀態

> **為什麼用動態 import？**
> `@line/liff` 在模組載入時會嘗試存取 `window`，在 Next.js SSR 執行期間 `window` 不存在會直接崩潰。用 `await import(...)` 包起來，確保只有瀏覽器端才真正載入 SDK。

---

## 第三部分：對外提供的介面

### 程式碼

```typescript
export type LiffState = State & {
  login: () => void;
  logout: () => void;
};

export const LiffContext = createContext<LiffState | undefined>(undefined);

  const login = useCallback(() => {
    state.liff?.login();
  }, [state.liff]);

  const logout = useCallback(() => {
    if (!state.liff) return;
    state.liff.logout();
    dispatch({ type: "LOGOUT" });
  }, [state.liff]);

  return (
    <LiffContext.Provider value={{ ...state, login, logout }}>
      {children}
    </LiffContext.Provider>
  );
```

### 說明

透過 `LiffContext.Provider` 提供給所有子元件的資料：

| 屬性 / 方法 | 型別 | 說明 |
|------------|------|------|
| `liff` | `Liff \| null` | LIFF 實例，可直接呼叫所有 LIFF API |
| `isReady` | `boolean` | 初始化是否完成（可開始使用 LIFF） |
| `isLoggedIn` | `boolean` | 用戶是否已登入 |
| `isInClient` | `boolean` | 是否在 LINE app 內開啟 |
| `profile` | `Profile \| null` | 用戶資料（displayName、pictureUrl、userId） |
| `error` | `Error \| null` | 初始化錯誤訊息 |
| `login()` | `() => void` | 觸發 LINE OAuth 授權（外部瀏覽器會跳轉授權頁） |
| `logout()` | `() => void` | 登出並清除 profile |

這個 Provider 包在 `layout.tsx` 最外層，之後任何頁面透過 `useLiff()` hook 即可取得上述所有資料，不需要每個頁面自己初始化 LIFF。

```typescript
// 任意子元件內
const { isReady, isLoggedIn, profile, login } = useLiff();
```
