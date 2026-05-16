<div align="center">
  <img width="80" alt="icon_main" src="https://user-images.githubusercontent.com/34180230/222903851-bc1b56d4-480f-4f4d-b408-33db18fc151b.png">
</div>

<h1>쿠키 데이터 저장 및 로드</h1>
<p>특정 사이트의 쿠키를 저장하고, 다시 불러와 자동으로 로그인 상태를 복원하는 Chrome 확장 프로그램입니다.</p>

---

### 기능

- **쿠키 저장** : 현재 탭의 도메인 쿠키를 `chrome.storage`에 저장
- **쿠키 로드** : 저장된 쿠키를 불러와 현재 탭에 자동 주입
- **쿠키 삭제** : 저장된 쿠키 데이터 초기화
- **다중 도메인** : 도메인별로 독립적으로 쿠키 관리

---

### 사용 방법

1. 로그인이 필요한 사이트에 접속 후 로그인
2. 확장 프로그램 팝업 열기 → **저장** 버튼 클릭
3. 이후 재접속 시 팝업 열기 → **로드** 버튼 클릭
4. 쿠키가 자동으로 주입되어 로그인 상태 복원

---

### 권한

| 권한 | 용도 |
|------|------|
| `cookies` | 쿠키 읽기 / 쓰기 |
| `storage` | 쿠키 데이터 로컬 저장 |
| `tabs` | 현재 탭 URL 및 도메인 확인 |
| `host_permissions` | 대상 도메인 쿠키 접근 |

---

### Dev

```
 - ADD: 쿠키 저장 / 로드 / 삭제 기능
 - ADD: 도메인별 쿠키 분리 저장
 - ADD: Popup UI (저장 · 로드 · 초기화 버튼)
```

### Release

```
Version 1.0.0
  - INIT: 프로젝트 초기 설정
```

---

### 주의사항

- 쿠키에는 세션 토큰 등 민감한 정보가 포함될 수 있습니다.
- `chrome.storage.local`에 저장되므로 브라우저 외부로 유출되지 않습니다.
- HttpOnly 쿠키는 `chrome.cookies` API로만 접근 가능하며, JS로는 읽을 수 없습니다.

---

<a href="https://github.com/wonkyungup/1Cookie">GitHub</a>
