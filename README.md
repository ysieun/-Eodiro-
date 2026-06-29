# 어디로 — Vercel로 배포하기 (서버 없이, 클릭으로)

이 버전은 "서버를 계속 켜놓고 관리"하지 않아도 돼요. 코드를 Vercel이라는 곳에 올려두면,
누가 사이트에 접속할 때만 자동으로 필요한 만큼 실행되고 사라져요. 본인 컴퓨터를 켜놓을 필요도 없어요.

전체 과정은 **터미널 없이, 웹사이트 클릭만으로** 가능해요.

---

## 1단계. GitHub에 코드 올리기

Vercel은 GitHub에 있는 코드를 가져와서 배포하는 방식이에요. 그래서 먼저 이 폴더를 GitHub에 올려야 해요.

1. https://github.com 접속해서 계정이 없으면 가입
2. 오른쪽 위 **"+"** 버튼 → **"New repository"** 클릭
3. 이름을 `eodiro` 정도로 입력하고 **"Create repository"** 클릭
4. 다음 화면에서 **"uploading an existing file"** 같은 링크를 찾아 클릭
   (또는 repository 페이지에서 "Add file" → "Upload files")
5. 압축 풀어둔 `eodiro-vercel` 폴더 안의 **모든 파일과 폴더**(api, public, package.json, vercel.json)를 통째로 끌어다 놓기
   - 주의: `eodiro-vercel` 폴더 자체가 아니라, **그 안의 내용물**을 올려야 해요.
6. 아래 "Commit changes" 버튼 클릭

---

## 2단계. Vercel 계정 만들고 연결하기

1. https://vercel.com 접속
2. **"Sign Up"** → **"Continue with GitHub"** 선택해서 방금 만든 GitHub 계정으로 가입
3. 로그인되면 **"Add New..." → "Project"** 클릭
4. 방금 만든 `eodiro` 저장소(repository)가 목록에 보일 거예요. 옆의 **"Import"** 클릭

---

## 3단계. API 키 등록하기

Import 화면에서 바로 진행하지 말고, **"Environment Variables"** 라고 써있는 부분을 펼쳐주세요.

- **Name(이름)**: `ANTHROPIC_API_KEY`
- **Value(값)**: console.anthropic.com에서 발급받은 키 (`sk-ant-...`로 시작)

입력하고 **"Add"** 누른 다음, 화면 아래 **"Deploy"** 버튼을 클릭하세요.

---

## 4단계. 완성된 링크 받기

1~2분 정도 기다리면 배포가 끝나요. "Congratulations!" 같은 화면이 뜨면서
`eodiro-something.vercel.app` 같은 주소가 나와요.

**이 주소가 바로 친구들에게 공유할 수 있는 진짜 서비스 링크예요.**
브라우저로 들어가서 출발지/목적지/날짜를 입력하고 "일정 만들기"를 눌러보세요.

---

## 나중에 코드를 수정하고 싶을 때

GitHub에 올린 파일을 수정하고 저장(commit)하면, Vercel이 자동으로 감지해서 몇 초~몇십 초 안에
새 버전으로 다시 배포해줘요. 따로 "배포하기" 버튼을 또 누를 필요 없어요.

---

## 비용/사용량 체크하기

- **Anthropic 사용량**: console.anthropic.com → "Usage" 메뉴에서 지금까지 얼마 썼는지 확인 가능해요.
- **하루 사용 제한**: `api/generate-itinerary.js` 안의 `DAILY_LIMIT` 숫자를 바꾸면 하루 최대 호출 횟수를 조절할 수 있어요. (지금은 50으로 되어 있어요.) 단, 서버리스 환경 특성상 이 제한이 100% 정확하게 지켜지지는 않아요 — 정확한 제한이 필요해지면 그때 별도 저장소(Vercel KV 등)를 추가하는 걸 알려드릴게요.
- **Vercel 자체 비용**: 개인/소규모 프로젝트는 무료 플랜(Hobby) 범위 안에서 충분히 돌아가요.

---

## 문제가 생겼을 때

- **사이트는 뜨는데 "일정 만들기"가 안 됨** → Vercel 프로젝트 → "Settings" → "Environment Variables"에 `ANTHROPIC_API_KEY`가 제대로 들어갔는지 확인하세요. 키를 새로 추가했다면 "Deployments" 탭에서 한 번 더 "Redeploy"를 눌러야 적용돼요.
- **GitHub 업로드가 안 됨** → 한 번에 너무 많은 파일을 올리면 가끔 실패해요. 폴더별로 나눠서 올려보세요.
- **에러 메시지가 나옴** → Vercel 프로젝트 페이지의 "Deployments" → 해당 배포 클릭 → "Functions" 로그에서 실제 에러 내용을 볼 수 있어요. 그 내용을 캡처해서 가져오시면 같이 봐드릴게요.
