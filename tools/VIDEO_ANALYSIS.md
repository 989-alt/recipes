# 영상 분석으로 레시피 채우기 (로컬 PC에서 실행)

클라우드 세션은 유튜브 봇 차단 때문에 자막·영상을 받을 수 없어서, 이 작업은 사용자 PC(Mac Studio)에서 한다.

## 준비
```bash
brew install yt-dlp ffmpeg node
export RECIPE_PW=...            # 레시피북 비밀번호는 사용자에게 물어볼 것 (커밋 금지)
python3 tools/book.py unpack    # .work/data.json
python3 tools/book.py todo      # .work/todo.json (만드는 법이 없거나 챕터로 대신한 레시피)
```

## 대상
1. `.work/todo.json`의 레시피 (약 995개): 만드는 법이 비었거나 "영상 챕터 순서로 대신함" / "만드는 과정은 영상 참고" 노트가 붙은 것.
2. 새 채널 두 개를 샌드위치 탭에 통째로 추가 (설명란에 레시피가 없어 영상 분석이 필요):
   - Sandwiches of History — https://www.youtube.com/channel/UCBrC-rXudnuQuh3G5V5WNMg (영상+쇼츠 약 2,000개, 영어 → 한국어 번역)
   - 샌드위치잘파는남자_샌코치 — https://www.youtube.com/channel/UC2eOjA0FfHQg_zk3hRtjxOQ (약 230개, 창업 홍보 영상은 제외)
   `ui.tabs`의 sandwich 탭 `channels`에 `{"id":"soh","name":"Sandwiches of History"}`, `{"id":"sancoach","name":"샌코치"}` 를 추가한다.

## 소스 우선순위 (기존 자취요리신 레시피와 같은 근거 표시)
1. 설명란 (`basis.type = "description"`)
2. 제작자 자막 (`manual_cc`) — `yt-dlp --skip-download --write-subs --sub-langs "ko,en" --sub-format json3`
3. 화면 자막 (`onscreen`, `basis.at` = 초) — 프레임을 뽑아(`ffmpeg -vf fps=1/2`) 화면의 재료·분량 텍스트를 읽는다
4. 음성 / 자동 자막 (`speech` / `auto_cc`) — `--write-auto-subs`, 없으면 whisper로 받아쓰기
- 영상에서 확인 못 한 값은 `basis.type = "estimate"` + `quote`(근거)로 표시. 지어내지 않는다.
- 단계(`steps`)는 영상 순서대로 한국어 문장으로. 온도·시간·크기 포함. 근거를 찾으면 레시피의 `note`에서 "챕터 순서로 대신함" / "영상 참고" 문구를 지우고, `source`를 실제로 쓴 가장 강한 근거로 바꾼다.

## 레시피 형식
`tools/book.py` 상단 docstring 참고. 새 레시피는 `tab`, `channel`, `category`(해당 탭의 `ui.tabs[].categories` 중 하나), `thumb = https://i.ytimg.com/vi/<id>/hqdefault.jpg`, `date = YYYY-MM-DD`(업로드일)을 채운다. `tag`는 띄어쓰기 없는 한국어 기본 재료명(예: "실온 크림치즈"→"크림치즈"), `pantry`는 탭의 `pantry` 목록에 있으면 true.

## 마무리
```bash
python3 tools/book.py pack      # 재암호화 + 검증
```
브라우저에서 index.html을 열어 비밀번호로 열리는지, 세 탭이 보이는지 확인한 뒤 커밋·푸시.
