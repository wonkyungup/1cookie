import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';
import { useTranslation } from 'react-i18next';
import './i18n';

type Item = {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  session: boolean;
  expirationDate?: number;
  checked: boolean;
  expanded: boolean;
};
type Group = { origin: string; items: Item[]; open: boolean };


const ExpiryBadge = ({ label }: { label: string }) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 6 }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <span style={{ fontSize: 11, cursor: 'default' }}>⌛</span>
      {visible && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', fontSize: 11, padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>
          {label}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '4px solid transparent', borderTopColor: '#333' }} />
        </span>
      )}
    </span>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', gap: 6, fontSize: 11, lineHeight: '18px' }}>
    <span style={{ color: '#999', flexShrink: 0, width: 80 }}>{label}</span>
    <span style={{ color: '#333', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

const App = () => {
  const { t } = useTranslation();
  const [tabOrigin, setTabOrigin] = React.useState('');
  const [tabId, setTabId] = React.useState<number>(0);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [queried, setQueried] = React.useState(false);

  const runQuery = async (id: number, origin: string) => {
    let scriptResult: any[] = [];
    try {
      scriptResult = await (chrome.scripting as any).executeScript({
        target: { tabId: id, allFrames: true },
        func: () => location.origin,
      }) ?? [];
    } catch {}

    const pageOrigins: string[] = [
      ...new Set<string>(
        [origin, ...scriptResult.map((r) => r?.result).filter((o) => o && o !== 'null')]
      ),
    ];

    const loaded: Group[] = [];
    for (const pageOrigin of pageOrigins) {
      const cookies = await chrome.cookies.getAll({ url: pageOrigin });
      if (!cookies.length) continue;
      loaded.push({
        origin: pageOrigin,
        open: false,
        items: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite ?? 'no_restriction',
          session: c.session,
          expirationDate: c.expirationDate,
          checked: false,
          expanded: false,
        })),
      });
    }

    setGroups(loaded);
    setQueried(true);
  };

  React.useEffect(() => {
    (async () => {
      const [tab] = await Browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.url || !tab.id) return;
      const origin = new URL(tab.url).origin;
      setTabOrigin(origin);
      setTabId(tab.id);
      await runQuery(tab.id, origin);
    })();
  }, []);

  const query = () => runQuery(tabId, tabOrigin);

  const toggleGroup = (origin: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.origin === origin
          ? { ...g, open: !g.open, items: g.open ? g.items.map((i) => ({ ...i, expanded: false })) : g.items }
          : g
      )
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

  const toggleExpanded = (origin: string, name: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.origin === origin
          ? { ...g, items: g.items.map((i) => (i.name === name ? { ...i, expanded: !i.expanded } : i)) }
          : g
      )
    );
  };

  const toggleGroupAll = (origin: string, checked: boolean) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.origin === origin ? { ...g, items: g.items.map((i) => ({ ...i, checked })) } : g
      )
    );
  };

  const allChecked = groups.length > 0 && groups.every((g) => g.items.every((i) => i.checked));
  const toggleAll = () => {
    setGroups((prev) =>
      prev.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, checked: !allChecked })) }))
    );
  };

  const [copyMenuOpen, setCopyMenuOpen] = React.useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!copyMenuOpen) return;
    const close = () => setCopyMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [copyMenuOpen]);

  React.useEffect(() => {
    if (!saveMenuOpen) return;
    const close = () => setSaveMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [saveMenuOpen]);

  const timestamp = () => {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}_${p(now.getMinutes())}_${p(now.getSeconds())}`;
  };

  const download = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1cookies_${timestamp()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checkedGroups = groups.filter((g) => g.items.some((i) => i.checked));

  const formatTxt = () =>
    checkedGroups.map((g) => {
      const blocks = g.items.filter((i) => i.checked).map((i) => {
        const expires = i.session || !i.expirationDate ? 'session' : new Date(i.expirationDate * 1000).toLocaleString();
        return [
          `[name] ${i.name}`,
          `[value] ${i.value}`,
          `[domain] ${i.domain}`,
          `[path] ${i.path}`,
          `[secure] ${i.secure}`,
          `[httpOnly] ${i.httpOnly}`,
          `[sameSite] ${i.sameSite}`,
          `[expires] ${expires}`,
        ].join('\n');
      }).join('\n---\n');
      return `# ${g.origin}\n${blocks}`;
    }).join('\n\n');

  const copyAsTxt = async () => {
    await navigator.clipboard.writeText(formatTxt());
    setCopyMenuOpen(false);
  };

  const copyAsJson = async () => {
    const data = checkedGroups.map((g) => ({
      origin: g.origin,
      cookies: g.items.filter((i) => i.checked).map(({ checked, expanded, ...rest }) => rest),
    }));
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopyMenuOpen(false);
  };

  const copyAsCsv = async () => {
    const header = 'origin,name,value,domain,path,secure,httpOnly,sameSite,session,expires';
    const rows = checkedGroups.flatMap((g) =>
      g.items.filter((i) => i.checked).map((i) => {
        const expires = i.session || !i.expirationDate ? '' : new Date(i.expirationDate * 1000).toISOString();
        return [g.origin, i.name, i.value, i.domain, i.path, i.secure, i.httpOnly, i.sameSite, i.session, expires]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
    );
    await navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopyMenuOpen(false);
  };

  const saveAsTxt = () => {
    download(formatTxt(), 'txt', 'text/plain');
    setSaveMenuOpen(false);
  };

  const saveAsJson = () => {
    const data = checkedGroups.map((g) => ({
      origin: g.origin,
      cookies: g.items.filter((i) => i.checked).map(({ checked, expanded, ...rest }) => rest),
    }));
    download(JSON.stringify(data, null, 2), 'json', 'application/json');
    setSaveMenuOpen(false);
  };

  const saveAsCsv = () => {
    const header = 'origin,name,value,domain,path,secure,httpOnly,sameSite,session,expires';
    const rows = checkedGroups.flatMap((g) =>
      g.items.filter((i) => i.checked).map((i) => {
        const expires = i.session || !i.expirationDate ? '' : new Date(i.expirationDate * 1000).toISOString();
        return [g.origin, i.name, i.value, i.domain, i.path, i.secure, i.httpOnly, i.sameSite, i.session, expires]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
    );
    download([header, ...rows].join('\n'), 'csv', 'text/csv');
    setSaveMenuOpen(false);
  };

  const hasChecked = groups.some((g) => g.items.some((i) => i.checked));

  return (
    <div style={{ minWidth: 340, maxHeight: 500, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>1Cookie</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{tabOrigin || '—'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {queried && groups.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = !allChecked && hasChecked; }}
                onChange={toggleAll}
              />
              {t('btn_select_all')}
            </label>
          )}
          <button
            onClick={query}
            style={{ padding: '4px 12px', background: '#fff', color: '#1976d2', border: '1px solid #1976d2', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            {t('btn_query')}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!queried ? (
          <div style={{ padding: 16, fontSize: 13, color: '#999' }}>{t('msg_query_prompt')}</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: '#999' }}>{t('msg_no_cookies')}</div>
        ) : (
          <>
            {groups.map((g) => {
              const groupAllChecked = g.items.every((i) => i.checked);
              const groupSomeChecked = g.items.some((i) => i.checked);
              return (
                <div key={g.origin} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', background: g.open ? 'rgba(245,245,245,0.92)' : 'rgba(255,255,255,0.92)', userSelect: 'none', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(4px)', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={groupAllChecked}
                        ref={(el) => { if (el) el.indeterminate = !groupAllChecked && groupSomeChecked; }}
                        onChange={(e) => toggleGroupAll(g.origin, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        onClick={() => toggleGroup(g.origin)}
                        style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', flex: 1 }}
                      >
                        {g.origin}
                      </span>
                    </div>
                    <span
                      onClick={() => toggleGroup(g.origin)}
                      style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }}
                    >
                      {g.items.filter((i) => i.checked).length}/{g.items.length} {g.open ? '▲' : '▼'}
                    </span>
                  </div>
                  {g.open && (
                    <div style={{ paddingLeft: 16 }}>
                      {g.items.map((item) => (
                        <div key={item.name} style={{ borderBottom: '1px solid #f9f9f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px 5px 0', fontSize: 12 }}>
                            <input type="checkbox" checked={item.checked} onChange={() => toggleItem(g.origin, item.name)} style={{ flexShrink: 0 }} />
                            <span onClick={() => toggleExpanded(g.origin, item.name)} style={{ flex: 1, wordBreak: 'break-all', cursor: 'pointer', userSelect: 'none' }}>
                              {item.name}
                              <span style={{ marginLeft: 4, fontSize: 10, color: '#bbb' }}>{item.domain}</span>
                              {!item.session && item.expirationDate && item.expirationDate * 1000 - Date.now() < 86400000 && (
                                <ExpiryBadge label={t('label_expiring')} />
                              )}
                            </span>
                            <button
                              onClick={() => toggleExpanded(g.origin, item.name)}
                              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: item.expanded ? '#bbb' : '#1976d2', padding: '0 4px', lineHeight: 1 }}
                            >
                              ⓘ
                            </button>
                          </div>
                          {item.expanded && (
                            <div style={{ margin: '0 8px 8px 24px', padding: '8px 10px', background: '#f9f9f9', borderRadius: 4, border: '1px solid #eee' }}>
                              <DetailRow label="value" value={item.value || '(empty)'} />
                              <DetailRow label="domain" value={item.domain} />
                              <DetailRow label="path" value={item.path} />
                              <DetailRow label="sameSite" value={item.sameSite} />
                              <DetailRow label="secure" value={item.secure ? 'true' : 'false'} />
                              <DetailRow label="httpOnly" value={item.httpOnly ? 'true' : 'false'} />
                              <DetailRow label="session" value={item.session ? 'true' : 'false'} />
                              <DetailRow label="expires" value={item.session || !item.expirationDate ? '(session)' : new Date(item.expirationDate * 1000).toLocaleString()} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <div style={{ position: 'relative' }}>
          {copyMenuOpen && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10, minWidth: 100, overflow: 'hidden' }}>
              {(['TXT', 'JSON', 'CSV'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={fmt === 'TXT' ? copyAsTxt : fmt === 'JSON' ? copyAsJson : copyAsCsv}
                  style={{ display: 'block', width: '100%', padding: '7px 14px', background: '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, color: '#333' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); hasChecked && (setSaveMenuOpen(false), setCopyMenuOpen((v) => !v)); }}
            disabled={!hasChecked}
            style={{ padding: '4px 12px', background: '#fff', color: hasChecked ? '#555' : '#bbb', border: `1px solid ${hasChecked ? '#ddd' : '#eee'}`, borderRadius: 4, cursor: hasChecked ? 'pointer' : 'default', fontSize: 12 }}
          >
            {t('btn_copy')}
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          {saveMenuOpen && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10, minWidth: 100, overflow: 'hidden' }}>
              {(['TXT', 'JSON', 'CSV'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={fmt === 'TXT' ? saveAsTxt : fmt === 'JSON' ? saveAsJson : saveAsCsv}
                  style={{ display: 'block', width: '100%', padding: '7px 14px', background: '#fff', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, color: '#333' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); hasChecked && (setCopyMenuOpen(false), setSaveMenuOpen((v) => !v)); }}
            disabled={!hasChecked}
            style={{ padding: '4px 12px', background: hasChecked ? '#1976d2' : '#ccc', color: '#fff', border: 'none', borderRadius: 4, cursor: hasChecked ? 'pointer' : 'default', fontSize: 12 }}
          >
            {t('btn_save_file')}
          </button>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('popup')!).render(<App />);
