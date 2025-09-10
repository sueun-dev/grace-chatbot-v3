# Grace Chatbot Projects

3개의 독립적인 챗봇 프로젝트입니다.

## 프로젝트 구조

```
chatbots/
├── general-ai/     # 일반 AI 챗봇 (포트: 3001)
├── doctor-ai/      # 의사 AI 챗봇 (포트: 3002)
└── friend-ai/      # 친구 AI 챗봇 (포트: 3003)
```

## 각 챗봇 실행 방법

### 1. General AI 챗봇
```bash
cd chatbots/general-ai
npm install
npm run dev
```
- 접속 URL: http://localhost:3001
- AI 역할: 일반적인 AI 어시스턴트

### 2. Doctor AI 챗봇
```bash
cd chatbots/doctor-ai
npm install
npm run dev
```
- 접속 URL: http://localhost:3002
- AI 역할: 의료 전문가 (Medical Professional)

### 3. Friend AI 챗봇
```bash
cd chatbots/friend-ai
npm install
npm run dev
```
- 접속 URL: http://localhost:3003
- AI 역할: 친구/학생 (Student)

## 특징

- 각 챗봇은 독립적으로 실행됩니다
- 랜덤 선택 로직이 제거되어 각각 고정된 역할로 동작합니다
- 다른 포트에서 실행되므로 동시에 여러 챗봇을 실행할 수 있습니다

## 인증 코드
- 이제 모든 문자/숫자를 인증 코드로 사용 가능합니다
- 입력한 코드가 사용자 식별자(identifier)가 됩니다
- 이 식별자로 각 사용자의 모든 행동이 추적됩니다

## CSV 로깅 시스템

### 로그 파일 위치
각 챗봇 폴더에 `user_logs/user_interactions.csv` 파일이 생성됩니다.

### 추적되는 정보
- **timestamp**: 각 행동의 시간
- **user_identifier**: 사용자가 입력한 인증 코드
- **session_id**: 세션 식별자
- **action_type**: 행동 유형 (예: 페이지 방문, 버튼 클릭, 옵션 선택 등)
- **action_details**: 행동에 대한 상세 설명
- **question_id**: 질문 ID (설문조사)
- **response**: 사용자 응답
- **score**: 점수 (해당되는 경우)
- **scenario_type**: 시나리오 유형
- **message_content**: 메시지 내용
- **option_selected**: 선택한 옵션
- **page_visited**: 방문한 페이지
- **chatbot_type**: 챗봇 유형 (general-ai, doctor-ai, friend-ai)

### 추적되는 모든 행동
- 페이지 방문
- 버튼 클릭
- 인증 코드 입력
- 채팅 시작
- 설문조사 응답
- 시나리오 진행
- 메시지 전송
- 옵션 선택
- 세션 종료

### 로그 확인 방법
각 챗봇 폴더의 `user_logs/user_interactions.csv` 파일을 Excel이나 CSV 뷰어로 열어볼 수 있습니다.

## OpenAI API 통합

### 설정
- API 키: 각 챗봇의 `.env.local` 파일에 설정됨
- 모델: `gpt-4o-mini-2024-07-18` 사용

### 시나리오 평가 시스템
1. **적절/부적절 판정**: AI가 사용자 응답을 평가
2. **재시도 메커니즘**: 부적절한 응답시 최대 3회 재시도 가능
3. **개선 제안**: 부적절한 응답에 대해 AI가 개선 제안 제공
4. **점수 시스템**: 각 응답에 0-100점 점수 부여

### 자유 대화 모드
- 시나리오 완료 후 AI와 자유롭게 대화 가능
- 의료 관련 질문이나 시나리오 복습 가능
- 실시간 OpenAI API 연동

### 실행 전 필요사항
각 챗봇 폴더에서 다음 명령어를 먼저 실행하세요:
```bash
npm install
```

## 주요 기능

1. **완벽한 CSV 로깅**: 모든 사용자 행동과 선택 기록
2. **시나리오 평가**: AI가 응답의 적절성 평가
3. **재시도 루프**: 최대 3회까지 응답 개선 기회
4. **자유 대화**: 시나리오 후 AI와 자유 대화
5. **종합 결과**: 모든 시나리오 결과 CSV 출력
6. **관리자 CSV 다운로드**: `/downloadit` 페이지에서 모든 CSV 파일 다운로드

## CSV 다운로드 (관리자용)

### 접속 방법
각 챗봇 URL 뒤에 `/downloadit`을 입력:
- http://localhost:3001/downloadit (General AI)
- http://localhost:3002/downloadit (Doctor AI)
- http://localhost:3003/downloadit (Friend AI)

### 관리자 인증 정보
- **Username**: `admin`
- **Password**: `grace2024!@#`

### 다운로드 기능
1. **현재 세션 CSV**: 현재 챗봇의 사용자 상호작용 CSV 다운로드
2. **모든 CSV 파일 (ZIP)**: 3개 챗봇의 모든 CSV 파일을 ZIP으로 다운로드
   - General_AI_interactions.csv
   - Doctor_AI_interactions.csv
   - Friend_AI_interactions.csv
   - Current_Session_interactions.csv

### CSV 파일 내용
- 사용자 식별자 (입력한 암호)
- 세션 ID
- 모든 행동 타입과 상세 내용
- 설문조사 응답
- 시나리오 평가 결과 (적절/부적절)
- 점수 및 재시도 횟수
- 자유 대화 내용
- 타임스탬프