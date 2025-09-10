# jsPsych Survey Text LLM Plugin

一个结合了大型语言模型（LLM）交互功能的 jsPsych 插件，扩展了标准 survey-text 插件的功能。

## 功能特性

- 📝 **文本输入与AI回复**：用户在文本框中输入内容，点击按钮发送给AI，AI的回复显示在第二个文本框中
- 🔄 **多问题支持**：支持多个问题，每个问题都可以独立与AI交互
- 🎲 **问题随机化**：可选的问题顺序随机化
- ⏱️ **响应时间追踪**：记录用户响应时间和AI响应时间
- 🔧 **灵活配置**：支持自定义API端点、请求头和超时设置
- 🎨 **现代UI**：美观的界面设计，包含加载状态和错误处理

## 文件结构

```
├── survey-text-llm.js          # 主插件文件
├── survey-text-llm.css         # 插件样式文件
├── example-usage.html          # 使用示例
└── README.md                   # 说明文档
```

## 快速开始

### 1. 引入文件

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/jspsych@7.3.4"></script>
    <script src="survey-text-llm.js"></script>
    <link href="https://unpkg.com/jspsych@7.3.4/css/jspsych.css" rel="stylesheet" />
    <link href="survey-text-llm.css" rel="stylesheet" />
</head>
```

### 2. 基本使用

```javascript
const survey = {
    type: jsPsychSurveyTextLLM,
    questions: [
        {
            prompt: "请描述您对人工智能的看法",
            placeholder: "在此输入您的想法...",
            rows: 3,
            required: true,
            name: "ai_opinion"
        }
    ],
    base_url: "https://api.deepseek.com",
    api: "/v1/chat/completions",
    api_key: "your-api-key-here",
    button_label: "完成调查"
};
```

## 参数说明

### 基础参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `questions` | Array | `[]` | 问题数组，每个问题包含以下属性 |
| `preamble` | String | `null` | 显示在问题前的说明文字 |
| `button_label` | String | `"Continue"` | 提交按钮文字 |
| `randomize_question_order` | Boolean | `false` | 是否随机化问题顺序 |

### Question 对象属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `prompt` | String | - | 问题文本（必填） |
| `placeholder` | String | `""` | 输入框占位符文字 |
| `rows` | Number | `1` | 文本框行数 |
| `columns` | Number | `40` | 文本框列数 |
| `required` | Boolean | `false` | 是否为必填项 |
| `name` | String | `""` | 问题名称，用于数据收集 |

### API 配置参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `base_url` | String | `""` | AI API 基础URL |
| `api` | String | `"/v1/chat/completions"` | API 端点路径 |
| `api_key` | String | `""` | API 密钥 |
| `api_headers` | Object | `{"Content-Type": "application/json"}` | 额外的请求头 |
| `api_timeout` | Number | `30000` | 请求超时时间（毫秒） |

## 支持的 AI 服务

### DeepSeek API

```javascript
{
    base_url: "https://api.deepseek.com",
    api: "/v1/chat/completions",
    api_key: "sk-your-api-key-here"
}
```

### OpenAI API

```javascript
{
    base_url: "https://api.openai.com",
    api: "/v1/chat/completions",
    api_key: "sk-your-api-key-here"
}
```

### 其他兼容 OpenAI 格式的 API

只需修改 `base_url` 即可支持其他兼容 OpenAI 聊天完成格式的 API 服务。

## 数据收集

插件会收集以下数据：

```javascript
{
    response: {           // 用户输入的回答
        "question_name": "用户的回答内容"
    },
    rt: 12345,           // 总响应时间（毫秒）
    question_order: [0, 1, 2],  // 问题显示顺序
    ai_response: {       // AI 的回复
        0: "AI对第一个问题的回复",
        1: "AI对第二个问题的回复"
    },
    ai_rt: {            // AI 响应时间（毫秒）
        0: 2341,
        1: 1987
    }
}
```

## 完整示例

```javascript
const timeline = [];

// 欢迎页面
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h1>欢迎参与调查</h1><p>按任意键开始</p>'
});

// 带AI交互的调查
timeline.push({
    type: jsPsychSurveyTextLLM,
    preamble: '<h2>请回答以下问题并与AI助手互动</h2>',
    questions: [
        {
            prompt: "您认为学习中最重要的因素是什么？",
            placeholder: "请分享您的想法...",
            rows: 3,
            required: true,
            name: "learning_factors"
        },
        {
            prompt: "描述一个您克服的挑战以及从中学到的东西",
            placeholder: "告诉我们您面临的挑战...",
            rows: 4,
            required: true,
            name: "challenge_experience"
        }
    ],
    base_url: "https://api.deepseek.com",
    api: "/v1/chat/completions",
    api_key: "sk-your-api-key-here",
    api_timeout: 30000,
    button_label: "完成调查"
});

// 运行实验
const jsPsych = initJsPsych({
    on_finish: function(data) {
        jsPsych.data.displayData();
    }
});

jsPsych.run(timeline);
```

## 错误处理

插件包含完善的错误处理机制：

- **网络超时**：如果API请求超时，会显示相应错误信息
- **API错误**：如果API返回错误，会在AI回复框中显示错误信息
- **加载状态**：发送请求时显示加载指示器
- **输入验证**：确保必填字段已填写后才能提交

## 样式自定义

可以通过修改 `survey-text-llm.css` 文件来自定义插件外观，或在您的CSS中覆盖相应的类：

```css
.jspsych-survey-text-llm-textbox {
    border: 2px solid #your-color;
}

.jspsych-survey-text-llm-ai-button {
    background: linear-gradient(135deg, #your-color1, #your-color2);
}
```

## 注意事项

1. **API密钥安全**：请确保API密钥的安全
2. **CORS配置**：确保您的API服务支持跨域请求
3. **网络环境**：插件需要网络连接才能与AI服务通信
4. **响应格式**：插件支持OpenAI兼容的API响应格式


## 贡献

欢迎提交问题和改进建议！
