// 환경 변수 로드
import 'dotenv/config'

// MCP SDK에서 필요한 모듈들을 import
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod' // 스키마 유효성 검사를 위한 Zod 라이브러리
import { InferenceClient } from '@huggingface/inference' // Hugging Face Inference Client
export default function createServer({ config }) {
/**
 * MCP 서버 인스턴스 생성
 * - name: 서버 이름
 * - version: 서버 버전
 * - capabilities: 서버가 제공하는 기능들 (tools, resources, prompts 기능을 사용)
 */
const server = new McpServer({
    name: 'Greeting-Server',
    version: '1.0.0',
    capabilities: {
        tools: {},
        resources: {},
        prompts: {}
    }
})

/**
 * Greeting 도구 등록
 * 사용자의 이름과 선호하는 언어를 받아서 해당 언어로 인사말을 반환합니다.
 * 
 * @param name - 인사할 사람의 이름
 * @param language - 인사말에 사용할 언어 (korean, english, spanish, japanese, chinese, french 중 선택)
 * @returns 선택한 언어로 된 인사말 텍스트
 */
server.tool(
    'greeting',
    'Greet a user in their preferred language',
    {
        name: z.string().describe('The name of the person to greet'),
        language: z.enum(['korean', 'english', 'spanish', 'japanese', 'chinese', 'french']).describe('The language to use for greeting')
    },
    async ({ name, language }) => {
        // 각 언어별 인사말 템플릿 정의
        const greetings: Record<string, string> = {
            korean: `안녕하세요, ${name}님! 좋은 하루 되세요! 😊`,
            english: `Hello, ${name}! Have a great day! 😊`,
            spanish: `¡Hola, ${name}! ¡Que tengas un gran día! 😊`,
            japanese: `こんにちは、${name}さん！良い一日を！😊`,
            chinese: `你好，${name}！祝你有美好的一天！😊`,
            french: `Bonjour, ${name}! Passez une excellente journée! 😊`
        }

        // 선택된 언어의 인사말을 텍스트 형식으로 반환
        return {
            content: [
                {
                    type: 'text',
                    text: greetings[language]
                }
            ]
        }
    }
)

/**
 * Calculator 도구 등록
 * 두 개의 숫자와 연산 종류를 받아서 사칙연산을 수행하고 결과를 반환합니다.
 * 
 * @param num1 - 첫 번째 숫자
 * @param num2 - 두 번째 숫자
 * @param operation - 수행할 연산 (add: 덧셈, subtract: 뺄셈, multiply: 곱셈, divide: 나눗셈)
 * @returns 계산 결과를 수식 형태로 반환 (예: "10 + 5 = 15")
 */
server.tool(
    'calculator',
    'Perform basic arithmetic operations on two numbers',
    {
        num1: z.number().describe('The first number'),
        num2: z.number().describe('The second number'),
        operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The arithmetic operation to perform')
    },
    async ({ num1, num2, operation }) => {
        let result: number
        let operationSymbol: string

        // 연산 종류에 따라 계산 수행
        switch (operation) {
            case 'add':
                result = num1 + num2
                operationSymbol = '+'
                break
            case 'subtract':
                result = num1 - num2
                operationSymbol = '-'
                break
            case 'multiply':
                result = num1 * num2
                operationSymbol = '×'
                break
            case 'divide':
                // 0으로 나누는 경우 오류 메시지 반환
                if (num2 === 0) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: '❌ 오류: 0으로 나눌 수 없습니다!'
                            }
                        ]
                    }
                }
                result = num1 / num2
                operationSymbol = '÷'
                break
        }

        // 계산 결과를 수식 형태로 반환
        return {
            content: [
                {
                    type: 'text',
                    text: `${num1} ${operationSymbol} ${num2} = ${result}`
                }
            ]
        }
    }
)

/**
 * Current Time 도구 등록
 * 지정한 timezone의 현재 시간을 반환합니다.
 * 
 * @param timezone - 시간을 확인할 timezone (예: Asia/Seoul, America/New_York 등)
 * @returns 현재 날짜와 시간을 포맷팅하여 반환
 */
server.tool(
    'current-time',
    'Get the current time in a specific timezone',
    {
        timezone: z.enum([
            'Asia/Seoul',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Asia/Singapore',
            'Asia/Dubai',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'America/New_York',
            'America/Los_Angeles',
            'America/Chicago',
            'America/Toronto',
            'Australia/Sydney',
            'Pacific/Auckland',
            'UTC'
        ]).describe('The timezone to get the current time for')
    },
    async ({ timezone }) => {
        try {
            // 현재 시간을 가져와서 지정된 timezone으로 포맷팅
            const now = new Date()
            
            // 날짜와 시간을 해당 timezone에 맞게 포맷팅
            const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'long'
            })
            
            const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })
            
            const date = dateFormatter.format(now)
            const time = timeFormatter.format(now)
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `🕐 ${timezone}\n📅 ${date}\n⏰ ${time}`
                    }
                ]
            }
        } catch (error) {
            // timezone이 유효하지 않은 경우 오류 메시지 반환
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 오류: 유효하지 않은 timezone입니다. (${timezone})`
                    }
                ]
            }
        }
    }
)

/**
 * Image Generator 도구 등록
 * 텍스트 프롬프트를 받아서 AI로 이미지를 생성합니다.
 * 
 * @param prompt - 생성할 이미지를 설명하는 텍스트 프롬프트
 * @returns base64로 인코딩된 이미지 데이터
 */
server.tool(
    'image-generator',
    'Generate an image from a text prompt using AI',
    {
        prompt: z.string().describe('A text description of the image to generate')
    },
    async ({ prompt }) => {
        try {
            // Hugging Face API 토큰 확인
            if (!process.env.HF_TOKEN) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '❌ 오류: HF_TOKEN 환경 변수가 설정되지 않았습니다.'
                        }
                    ]
                }
            }

            // Inference Client 초기화
            const client = new InferenceClient(process.env.HF_TOKEN)

            // 이미지 생성 (FLUX.1-schnell 모델 사용)
            const imageBlob = await client.textToImage({
                model: 'black-forest-labs/FLUX.1-schnell',
                inputs: prompt,
                parameters: { num_inference_steps: 5 }
            }) as unknown as Blob

            // Blob을 ArrayBuffer로 변환
            const arrayBuffer = await imageBlob.arrayBuffer()
            
            // ArrayBuffer를 Base64로 인코딩
            const buffer = Buffer.from(arrayBuffer)
            const base64Image = buffer.toString('base64')

            // MCP 이미지 형식으로 반환
            return {
                content: [
                    {
                        type: 'image',
                        data: base64Image,
                        mimeType: 'image/png'
                    }
                ]
            }
        } catch (error) {
            // 에러 발생 시 상세 메시지 반환
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 이미지 생성 중 오류가 발생했습니다: ${errorMessage}`
                    }
                ]
            }
        }
    }
)

/**
 * MCP 서버 정보 리소스 등록
 * 서버의 기본 정보와 제공하는 도구 목록을 반환합니다.
 */
server.resource(
    'server-info',
    'mcp://server/info',
    {
        description: 'Information about this MCP server and available tools',
        mimeType: 'application/json'
    },
    async () => {
        const serverInfo = {
            name: 'Greeting-Server',
            version: '1.0.0',
            description: '다양한 기능을 제공하는 MCP 서버',
            capabilities: ['tools', 'resources', 'prompts'],
            availableTools: [
                {
                    name: 'greeting',
                    description: '선택한 언어로 인사말 생성',
                    parameters: ['name', 'language']
                },
                {
                    name: 'calculator',
                    description: '두 숫자의 사칙연산 수행',
                    parameters: ['num1', 'num2', 'operation']
                },
                {
                    name: 'current-time',
                    description: '지정된 timezone의 현재 시간 조회',
                    parameters: ['timezone']
                },
                {
                    name: 'image-generator',
                    description: 'AI를 사용한 텍스트-이미지 생성',
                    parameters: ['prompt']
                }
            ],
            availableResources: [
                {
                    name: 'server-info',
                    uri: 'mcp://server/info',
                    description: 'MCP 서버 정보'
                }
            ],
            availablePrompts: [
                {
                    name: 'code-review',
                    description: '코드 리뷰를 위한 상세한 프롬프트 생성',
                    parameters: ['code', 'language (optional)', 'focus (optional)']
                }
            ]
        }

        return {
            contents: [
                {
                    uri: 'mcp://server/info',
                    mimeType: 'application/json',
                    text: JSON.stringify(serverInfo, null, 2)
                }
            ]
        }
    }
)

/**
 * Code Review 프롬프트 등록
 * 사용자로부터 코드를 입력받아 상세한 코드 리뷰를 수행하는 프롬프트를 생성합니다.
 * 
 * @param code - 리뷰할 코드
 * @param language - 코드의 프로그래밍 언어 (선택사항)
 * @param focus - 리뷰 중점 사항 (선택사항: security, performance, readability, best-practices, all)
 * @returns 코드 리뷰를 위한 상세한 프롬프트
 */
server.prompt(
    'code-review',
    {
        code: z.string().describe('The code to review'),
        language: z.string().optional().describe('The programming language of the code (e.g., JavaScript, Python, TypeScript)'),
        focus: z.enum(['security', 'performance', 'readability', 'best-practices', 'all']).optional().describe('Specific focus area for the review')
    },
    async ({ code, language, focus }) => {
        // 리뷰 중점 사항에 따른 프롬프트 구성
        const focusAreas = {
            security: '보안 취약점 및 보안 베스트 프랙티스',
            performance: '성능 최적화 및 효율성',
            readability: '코드 가독성 및 유지보수성',
            'best-practices': '코딩 컨벤션 및 베스트 프랙티스',
            all: '모든 측면 (보안, 성능, 가독성, 베스트 프랙티스)'
        }

        const reviewFocus = focus ? focusAreas[focus] : focusAreas.all
        const langInfo = language ? `(${language})` : ''

        const prompt = `# 코드 리뷰 요청 ${langInfo}

다음 코드에 대해 상세한 리뷰를 수행해주세요.

## 리뷰 중점 사항
${reviewFocus}

## 검토할 코드
\`\`\`${language || ''}
${code}
\`\`\`

## 리뷰 가이드라인

다음 항목들을 중심으로 상세히 분석해주세요:

### 1. 코드 품질 (Code Quality)
- 코드의 전반적인 구조와 설계
- 명확성과 간결성
- 중복 코드 및 리팩토링 가능성

### 2. 보안 (Security)
- 잠재적 보안 취약점
- 입력 검증 및 데이터 검증
- 민감 정보 처리 방식

### 3. 성능 (Performance)
- 성능 병목 지점
- 불필요한 연산이나 메모리 사용
- 최적화 가능한 부분

### 4. 가독성 (Readability)
- 변수/함수 네이밍의 적절성
- 코드 주석의 충분성
- 코드 구조의 명확성

### 5. 베스트 프랙티스 (Best Practices)
- 언어별 코딩 컨벤션 준수
- 디자인 패턴 적용
- 에러 처리 방식

### 6. 버그 및 잠재적 이슈
- 논리적 오류
- 엣지 케이스 처리
- 타입 안정성

### 7. 개선 제안
- 구체적인 개선 방법
- 리팩토링 제안
- 대안적 구현 방법

## 출력 형식
각 항목별로 다음과 같은 형식으로 작성해주세요:
- ✅ 잘된 점
- ⚠️ 개선이 필요한 점
- 💡 구체적인 개선 제안 (코드 예시 포함)
- 🔍 추가 검토 사항

리뷰를 시작해주세요.`

        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: prompt
                    }
                }
            ]
        }
    }
)

/**
 * 서버를 stdio 트랜스포트에 연결하고 시작
 * - StdioServerTransport: 표준 입출력을 통한 통신 설정
 * - server.connect(): 서버를 트랜스포트에 연결하여 실행
 */
const transport = new StdioServerTransport()
await server.connect(transport)

// 서버가 성공적으로 시작되었음을 표준 에러 출력으로 알림
console.error('Greeting MCP Server running on stdio')
return server.server
}

