import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';
import { useTranslation } from 'react-i18next';
import './i18n';

type Item = { name: string; value: string; domain: string; checked: boolean };
type Group = { origin: string; items: Item[]; open: boolean };
type SavedCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  hostOnly: boolean;
  session: boolean;
  sameSite: string;
  storeId: string;
  expirationDate?: number;
};
type CookieEntry = { cookies: SavedCookie[]; savedAt: string };
// { tabOrigin: { cookieOrigin: CookieEntry } }
type CookieStore = Record<string, Record<string, CookieEntry>>;

const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', fontSize: 11, padding: '4px 8px', borderRadius: 4, whiteSpace: 'normal', width: 160, textAlign: 'center', pointerEvents: 'none', zIndex: 10 }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '4px solid transparent', borderTopColor: '#333' }} />
        </div>
      )}
    </div>
  );
};

const formatDate = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const App = () => {
  const { t } = useTranslation();
  const [tabOrigin, setTabOrigin] = React.useState('');
  const [tabId, setTabId] = React.useState<number>(0);
  const [tabUrl, setTabUrl] = React.useState('');
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [savedMap, setSavedMap] = React.useState<Record<string, Set<string>>>({});
  const [savedAtMap, setSavedAtMap] = React.useState<Record<string, string>>({});
  const [queried, setQueried] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [tab] = await Browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.url || !tab.id) return;

      const origin = new URL(tab.url).origin;
      setTabOrigin(origin);
      setTabId(tab.id);
      setTabUrl(tab.url);

      const result = await chrome.storage.local.get('cookies');
      const allCookies = (result.cookies ?? {}) as CookieStore;
      const saved = allCookies[origin] ?? {};
      const map: Record<string, Set<string>> = {};
      const atMap: Record<string, string> = {};
      for (const [o, entry] of Object.entries(saved)) {
        map[o] = new Set(entry.cookies.map((c) => c.name));
        atMap[o] = entry.savedAt;
      }
      setSavedMap(map);
      setSavedAtMap(atMap);
    })();
  }, []);

  const query = async () => {
    const result = await chrome.storage.local.get('cookies');
    const allCookies = (result.cookies ?? {}) as CookieStore;
    const savedInner = allCookies[tabOrigin] ?? {};

    let scriptResult: any[] = [];
    try {
      scriptResult = await (chrome.scripting as any).executeScript({
        target: { tabId, allFrames: true },
        func: () => location.origin,
      }) ?? [];
    } catch {}

    const pageOrigins: string[] = [
      ...new Set<string>(
        [tabOrigin, ...scriptResult.map((r) => r?.result).filter((o) => o && o !== 'null')]
      ),
    ];

    const loaded: Group[] = [];

    for (const pageOrigin of pageOrigins) {
      const cookies = await chrome.cookies.getAll({ url: pageOrigin });
      if (!cookies.length) continue;

      const savedNames = new Set((savedInner[pageOrigin]?.cookies ?? []).map((c) => c.name));

      loaded.push({
        origin: pageOrigin,
        open: false,
        items: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          checked: savedNames.has(c.name),
        })),
      });
    }

    const map: Record<string, Set<string>> = {};
    const atMap: Record<string, string> = {};
    for (const [o, entry] of Object.entries(savedInner)) {
      map[o] = new Set(entry.cookies.map((c) => c.name));
      atMap[o] = entry.savedAt;
    }
    setSavedMap(map);
    setSavedAtMap(atMap);
    setGroups(loaded);
    setQueried(true);
  };

  const toggleGroup = (origin: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.origin === origin ? { ...g, open: !g.open } : g))
    );
  };

  const toggleItem = (origin: string, name: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.origin === origin
          ? { ...g, items: g.items.map((i) => (i.name === name ? { ...i, checked: !i.checked } : i)) }
          : g
      )
    );
  };

  const injectCookie = async (c: SavedCookie) => {
    const domain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
    const url = `${c.secure ? 'https' : 'http'}://${domain}${c.path || '/'}`;
    try {
      const existing = await chrome.cookies.get({ url, name: c.name });
      if (existing && existing.value === c.value && existing.domain === c.domain) return;
      await chrome.cookies.set({
        url, name: c.name, value: c.value,
        ...(c.domain.startsWith('.') ? { domain: c.domain } : {}),
        path: c.path, secure: c.secure, httpOnly: c.httpOnly,
        sameSite: c.sameSite as chrome.cookies.SameSiteStatus,
        expirationDate: c.expirationDate,
      });
    } catch (e) {
      console.error(`[1Cookie] inject failed: ${c.name}`, e);
    }
  };

  const inject = async () => {
    const result = await chrome.storage.local.get('cookies');
    const allCookies = (result.cookies ?? {}) as CookieStore;
    const savedInner = allCookies[tabOrigin] ?? {};

    if (groups.length === 0) {
      for (const entry of Object.values(savedInner)) {
        for (const c of entry.cookies) await injectCookie(c);
      }
    } else {
      for (const g of groups) {
        const checkedNames = new Set(g.items.filter((i) => i.checked).map((i) => i.name));
        const entry = savedInner[g.origin];
        if (!entry) continue;
        for (const c of entry.cookies) {
          if (checkedNames.has(c.name)) await injectCookie(c);
        }
      }
    }
    chrome.tabs.reload(tabId);
  };

  const copy = async () => {
    let parts: string[];

    if (groups.length === 0) {
      const result = await chrome.storage.local.get('cookies');
      const allCookies = (result.cookies ?? {}) as CookieStore;
      const savedInner = allCookies[tabOrigin] ?? {};
      parts = Object.entries(savedInner).map(([origin, entry]) => {
        const cookies = entry.cookies.map((c) => `${c.name}=${c.value}`).join(';\n');
        return `# ${origin}\n${cookies}`;
      });
    } else {
      parts = groups
        .filter((g) => g.items.some((i) => i.checked))
        .map((g) => {
          const cookies = g.items
            .filter((i) => i.checked)
            .map((i) => `${i.name}=${i.value}`)
            .join(';\n');
          return `# ${g.origin}\n${cookies}`;
        });
    }

    await navigator.clipboard.writeText(parts.join('\n\n'));
  };

  const save = async () => {
    const result = await chrome.storage.local.get('cookies');
    const allCookies = { ...(result.cookies ?? {}) } as CookieStore;

    allCookies[tabOrigin] = allCookies[tabOrigin] ?? {};

    for (const g of groups) {
      const browserCookies = await chrome.cookies.getAll({ url: g.origin });
      const browserMap: Record<string, chrome.cookies.Cookie> = {};
      for (const c of browserCookies) browserMap[c.name] = c;

      const checked = g.items.filter((i) => i.checked).map((i) => i.name);

      if (checked.length === 0) {
        delete allCookies[tabOrigin][g.origin];
      } else {
        allCookies[tabOrigin][g.origin] = {
          savedAt: formatDate(new Date()),
          cookies: checked
            .filter((name) => browserMap[name])
            .map((name) => {
              const c = browserMap[name];
              return {
                name: c.name, value: c.value, domain: c.domain,
                path: c.path, secure: c.secure, httpOnly: c.httpOnly,
                hostOnly: c.hostOnly, session: c.session,
                sameSite: c.sameSite ?? 'no_restriction',
                storeId: c.storeId, expirationDate: c.expirationDate,
              };
            }),
        };
      }
    }

    if (Object.keys(allCookies[tabOrigin]).length === 0) {
      delete allCookies[tabOrigin];
    }

    await chrome.storage.local.set({ cookies: allCookies });

    const map: Record<string, Set<string>> = {};
    const atMap: Record<string, string> = {};
    for (const [o, entry] of Object.entries(allCookies[tabOrigin] ?? {})) {
      map[o] = new Set(entry.cookies.map((c) => c.name));
      atMap[o] = entry.savedAt;
    }
    setSavedMap(map);
    setSavedAtMap(atMap);
  };

  return (
    <div style={{ minWidth: 340, maxHeight: 500, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>1Cookie</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{tabOrigin || '—'}</div>
        </div>
        <button
          onClick={query}
          style={{ padding: '4px 12px', background: '#fff', color: '#1976d2', border: '1px solid #1976d2', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          {t('btn_query')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!queried ? (
          <div style={{ padding: 16, fontSize: 13, color: '#999' }}>{t('msg_query_prompt')}</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: '#999' }}>쿠키가 없습니다.</div>
        ) : (
          groups.map((g) => (
            <div key={g.origin} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <div
                onClick={() => toggleGroup(g.origin)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', cursor: 'pointer', background: g.open ? '#f5f5f5' : '#fff', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.origin}</span>
                  {savedMap[g.origin]?.size > 0 && (
                    <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>{t('label_saved')}</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {g.items.filter((i) => i.checked).length}/{g.items.length} {g.open ? '▲' : '▼'}
                </span>
              </div>
              {g.open && (
                <div style={{ paddingLeft: 16 }}>
                  {g.items.map((item) => (
                    <label
                      key={item.name}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 16px 5px 0', borderBottom: '1px solid #f9f9f9', cursor: 'pointer', fontSize: 12 }}
                    >
                      <input type="checkbox" checked={item.checked} onChange={() => toggleItem(g.origin, item.name)} />
                      <span style={{ flex: 1, wordBreak: 'break-all' }}>
                        {item.name}
                        <span style={{ marginLeft: 4, fontSize: 10, color: '#bbb' }}>{item.domain}</span>
                      </span>
                      {savedMap[g.origin]?.has(item.name) && (
                        <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap' }}>{savedAtMap[g.origin]}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {(() => {
        const hasChecked = groups.some((g) => g.items.some((i) => i.checked));
        const hasSaved = Object.values(savedMap).some((s) => s.size > 0);
        const canSave = queried && groups.length > 0;
        const canInject = hasSaved && (groups.length === 0 || hasChecked);
        const canCopy = groups.length === 0 ? hasSaved : hasChecked;
        return (
          <div style={{ padding: '8px 16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={save}
                disabled={!canSave}
                style={{ padding: '4px 12px', background: canSave ? '#1976d2' : '#ccc', color: '#fff', border: 'none', borderRadius: 4, cursor: canSave ? 'pointer' : 'default', fontSize: 12 }}
              >
                {t('btn_save')}
              </button>
              <Tooltip text={t('tooltip_apply')}>
                <button
                  onClick={inject}
                  disabled={!canInject}
                  style={{ padding: '4px 12px', background: canInject ? '#388e3c' : '#ccc', color: '#fff', border: 'none', borderRadius: 4, cursor: canInject ? 'pointer' : 'default', fontSize: 12 }}
                >
                  {t('btn_apply')}
                </button>
              </Tooltip>
            </div>
            <button
              onClick={copy}
              disabled={!canCopy}
              style={{ padding: '4px 12px', background: '#fff', color: canCopy ? '#555' : '#bbb', border: `1px solid ${canCopy ? '#ddd' : '#eee'}`, borderRadius: 4, cursor: canCopy ? 'pointer' : 'default', fontSize: 12 }}
            >
              {t('btn_copy')}
            </button>
          </div>
        );
      })()}
    </div>
  );
};

createRoot(document.getElementById('popup')!).render(<App />);
