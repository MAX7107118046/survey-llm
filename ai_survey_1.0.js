/**
 * AI Survey Plugin v1.0 - Universal jsPsych AI Integration
 * 
 * 通用AI分析插件：与任何jsPsych插件配合，为实验数据提供智能分析
 * 
 * 🎯 兼容插件类型：
 * - Survey类: survey-likert, survey-text, survey-multi-choice, survey-html-form等
 * - 反应时类: html-keyboard-response, image-keyboard-response, image-button-response等  
 * - 认知任务类: stroop, flanker, n-back, working-memory, categorize-image等
 * - 记忆测试类: free-recall, recognition, paired-associate等
 * - 决策任务类: iowa-gambling, risk-taking等
 * - 交互类: mouse-tracking, canvas-keyboard-response, canvas-button-response等
 * - 任何产生结构化数据的jsPsych插件（支持rt, response, stimulus, correct等标准字段）
 * 
 * 🚀 核心特性：
 * - 灵活的数据收集器(data_collector)机制
 * - 高级按钮控制系统 (确认/重新生成/编辑/自定义按钮)
 * - 批量分析和个别分析模式
 * - 分离式输入输出流程
 * - 智能状态管理和响应锁定
 * - 自动生成和自动分析
 * - 多AI服务支持(OpenAI, DeepSeek, 阿里云等)
 * 
 * @author Max
 * @version 1.0.0
 */

class jsPsychAISurvey {
  constructor(jsPsych) {
    this.jsPsych = jsPsych;
  }

  static info = {
    name: "ai-survey",
    parameters: {
      /**
       * Array of question objects. Each question should have a 'prompt' property.
       */
      questions: {
        type: 'COMPLEX',
        array: true,
        pretty_name: "Questions",
        default: [],
        nested: {
          prompt: {
            type: 'HTML_STRING',
            pretty_name: "Prompt",
            default: "",
            description: "Prompt for the question."
          },
          placeholder: {
            type: 'STRING',
            pretty_name: "Placeholder",
            default: "",
            description: "Placeholder text for the input field."
          },
          rows: {
            type: 'INT',
            pretty_name: "Rows",
            default: 1,
            description: "Number of rows for the input textarea."
          },
          columns: {
            type: 'INT',
            pretty_name: "Columns",
            default: 40,
            description: "Number of columns for the input textarea."
          },
          required: {
            type: 'BOOL',
            pretty_name: "Required",
            default: false,
            description: "Whether the question is required."
          },
          name: {
            type: 'STRING',
            pretty_name: "Name",
            default: "",
            description: "Name of the question for data collection."
          }
        }
      },
      
      /**
       * HTML string to display at the top of the page above all questions.
       */
      preamble: {
        type: 'HTML_STRING',
        pretty_name: "Preamble",
        default: null,
        description: "HTML formatted string to display at the top of the page above all questions."
      },
      
      /**
       * Label for the submit button.
       */
      button_label: {
        type: 'STRING',
        pretty_name: "Button label",
        default: "Continue",
        description: "Label of the button to submit responses."
      },
      
      /**
       * Whether to randomize the order of questions.
       */
      randomize_question_order: {
        type: 'BOOL',
        pretty_name: "Randomize Question Order",
        default: false,
        description: "Whether to randomize the order of questions."
      },

      // === AI API 配置 ===
      /**
       * Base URL for the AI API.
       */
      base_url: {
        type: 'STRING',
        pretty_name: "Base URL",
        default: "",
        description: "Base URL for the AI API endpoint."
      },
      
      /**
       * API key for AI service authentication.
       */
      api_key: {
        type: 'STRING',
        pretty_name: "API Key",
        default: "",
        description: "API key for AI service authentication."
      },
      
      /**
       * API endpoint path for AI interaction.
       */
      api: {
        type: 'STRING',
        pretty_name: "API Endpoint",
        default: "/v1/chat/completions",
        description: "API endpoint path for AI interaction."
      },
      
      /**
       * Additional headers to send with the API request.
       */
      api_headers: {
        type: 'OBJECT',
        pretty_name: "API Headers",
        default: {
          "Content-Type": "application/json"
        },
        description: "Additional headers to send with the API request."
      },
      
      /**
       * Timeout for AI API requests in milliseconds.
       */
      api_timeout: {
        type: 'INT',
        pretty_name: "API Timeout",
        default: 30000,
        description: "Timeout for AI API requests in milliseconds."
      },
      
      /**
       * LLM model to use for AI responses.
       */
      llm_model: {
        type: 'STRING',
        pretty_name: "LLM Model",
        default: "deepseek-chat",
        description: "The language model to use for AI responses."
      },
      
      /**
       * System prompt to guide AI behavior.
       */
      system_prompt: {
        type: 'STRING',
        pretty_name: "System Prompt",
        default: "You are a helpful assistant. Provide thoughtful, concise responses.",
        description: "System prompt to guide AI behavior and responses."
      },
      
      /**
       * Maximum tokens for AI responses.
       */
      max_tokens: {
        type: 'INT',
        pretty_name: "Max Tokens",
        default: 500,
        description: "Maximum number of tokens for AI responses."
      },
      
      /**
       * Temperature for AI response generation.
       */
      temperature: {
        type: 'FLOAT',
        pretty_name: "Temperature",
        default: 0.7,
        description: "Temperature parameter for AI response generation (0.0-2.0)."
      },

      // === 分析模式配置 ===
      /**
       * AI analysis mode: individual or batch
       */
      ai_analysis_mode: {
        type: 'STRING',
        pretty_name: "AI Analysis Mode",
        default: "individual",
        description: "AI interaction mode: 'individual' (per question) or 'batch' (analyze all responses together)"
      },
      
      /**
       * Questions to include in AI analysis (by index or name).
       */
      ai_analysis_questions: {
        type: 'ARRAY',
        pretty_name: "AI Analysis Questions",
        default: null,
        description: "Array of question indices/names to include in AI analysis. If null, all questions are included."
      },
      
      /**
       * Custom prompt template for batch analysis.
       */
      batch_analysis_prompt: {
        type: 'STRING',
        pretty_name: "Batch Analysis Prompt",
        default: "Please analyze the following survey responses and provide insights:",
        description: "Template for batch analysis prompt sent to AI."
      },

      // === 显示控制配置 ===
      /**
       * Whether to hide user input fields and only show AI output.
       */
      hide_user_input: {
        type: 'BOOL',
        pretty_name: "Hide User Input",
        default: false,
        description: "If true, hides user input fields and only shows AI responses."
      },
      
      /**
       * Whether to show individual AI response areas for each question.
       */
      show_individual_ai_areas: {
        type: 'BOOL',
        pretty_name: "Show Individual AI Areas",
        default: true,
        description: "Whether to show individual AI response areas for each question. When false, only shows a single unified AI analysis area."
      },
      
      /**
       * Whether to separate input and output phases.
       */
      separate_input_output: {
        type: 'BOOL',
        pretty_name: "Separate Input Output",
        default: false,
        description: "Whether to separate input and output phases. When true, user first enters all responses, then proceeds to a separate page showing AI analysis."
      },
      
      /**
       * Show analysis trigger button.
       */
      show_analysis_button: {
        type: 'BOOL',
        pretty_name: "Show Analysis Button",
        default: true,
        description: "Show a button to trigger AI analysis in batch mode."
      },
      
      /**
       * Analysis button label.
       */
      analysis_button_label: {
        type: 'STRING',
        pretty_name: "Analysis Button Label",
        default: "Generate AI Analysis",
        description: "Label for the AI analysis trigger button."
      },

      // === 自动化配置 ===
      /**
       * Auto-generate AI responses on trial start without user input.
       */
      auto_generate: {
        type: 'BOOL',
        pretty_name: "Auto Generate",
        default: false,
        description: "If true, automatically generates AI responses when trial starts."
      },
      
      /**
       * Auto analyze on output page.
       */
      auto_analyze_on_output: {
        type: 'BOOL',
        pretty_name: "Auto Analyze On Output",
        default: false,
        description: "In separate input/output mode, automatically start AI analysis when showing output page."
      },

      // === 高级按钮控制 ===
      /**
       * Enable multi-button interaction mode.
       */
      enable_advanced_buttons: {
        type: 'BOOL',
        pretty_name: "Enable Advanced Buttons",
        default: false,
        description: "Enables advanced button controls (confirm, regenerate, edit)."
      },
      
      /**
       * Configuration for advanced button controls.
       */
      button_config: {
        type: 'OBJECT',
        pretty_name: "Button Configuration",
        default: {
          show_confirm: true,
          show_regenerate: true,
          show_edit: true,
          confirm_locks: true,
          custom_buttons: []
        },
        description: "Advanced button configuration for interaction control."
      },

      // === 数据收集配置 ===
      /**
       * Function to collect data from previous trials/plugins for AI context.
       * Compatible with any jsPsych plugin type (survey, reaction-time, cognitive tasks, etc.)
       * 
       * Collects both Data Generated (rt, response, stimulus, correct, etc.) and Parameters (prompt, targets, events, etc.)
       * 
       * Example usage:
       * data_collector: function() {
       *   // Get reaction time data
       *   var rt_data = jsPsych.data.get().filter({trial_type: 'image-keyboard-response'});
       *   
       *   // Get survey responses  
       *   var survey_data = jsPsych.data.get().filter({trial_type: 'survey-multi-choice'});
       *   
       *   // Get recent trials with statistics
       *   var recent_trials = jsPsych.data.get().last(5);
       *   var avg_rt = recent_trials.select('rt').mean();
       *   
       *   return {
       *     rt_summary: { mean: avg_rt, trials: rt_data.count() },
       *     recent_responses: recent_trials.values(),
       *     survey_results: survey_data.values(),
       *     performance_stats: {
       *       correct_rate: jsPsych.data.get().filter({correct: true}).count() / jsPsych.data.get().count(),
       *       total_trials: jsPsych.data.get().count()
       *     }
       *   };
       * }
       * 
       * Note: Declared as FUNCTION type to prevent jsPsych v7 from auto-executing.
       */
      data_collector: {
        type: 'FUNCTION',
        pretty_name: "Data Collector",
        default: null,
        description: "Function that returns additional context data to send to AI. Supports all jsPsych plugin types. Can collect Data Generated (rt, response, stimulus, correct, mouse_tracking_data, etc.) and Parameters (prompt, targets, events, minimum_sample_time, question, etc.). Returns object with structured data for AI analysis."
      },

      // === 界面语言配置 ===
      /**
       * Interface language settings.
       */
      interface_language: {
        type: 'STRING',
        pretty_name: "Interface Language",
        default: "en",
        description: "Interface language: 'en' for English, 'zh' for Chinese."
      }
    }
  };

  /**
   * Plugin trial function
   */
  trial(display_element, trial) {
    // 参数验证
    if (!trial.questions || trial.questions.length === 0) {
      console.warn('ai-survey: No questions provided');
      trial.questions = [];
    }
    
    // 验证API配置
    if (trial.base_url && trial.api_key) {
      // API配置完整，可以进行LLM交互
    } else if (trial.base_url || trial.api_key) {
      console.warn('ai-survey: Incomplete API configuration. Both base_url and api_key are required for LLM functionality.');
    }
    
    // Store trial start time
    const trial_start_time = performance.now();
    
    // Create question order
    let question_order = Array.from({length: trial.questions.length}, (_, i) => i);
    if (trial.randomize_question_order) {
      question_order = this.jsPsych.randomization.shuffle(question_order);
    }

    // 获取界面文本
    const ui_text = this.getUIText(trial.interface_language);

    // 在分离输入输出模式下，直接进入输入阶段
    if (trial.separate_input_output) {
      this.showInputPage(display_element, trial, question_order, trial_start_time, ui_text);
    } else {
      // 传统合并模式
      this.showCombinedPage(display_element, trial, question_order, trial_start_time, ui_text);
    }
  }

  /**
   * 获取界面文本
   */
  getUIText(language) {
    const texts = {
      en: {
        your_input: "您的输入:",
        ai_response: "AI回应:",
        ai_analysis: "AI分析:",
        send_to_ai: "Send to AI",
        enter_text_first: "Enter text first",
        processing: "Processing...",
        analyzing: "Analyzing...",
        confirm: "Confirm",
        confirmed: "Confirmed",
        regenerate: "Regenerate",
        edit: "Edit",
        ready: "Ready",
        generating: "Generating",
        generated: "Generated",
        error: "Error",
        confirmed_status: "Confirmed",
        editing: "Editing",
        comprehensive_analysis: "Comprehensive Analysis",
        analysis_results: "Analysis Results:",
        your_responses_review: "Your Responses Review",
        ai_analysis_results: "AI分析结果",
        no_answer: "(No answer)",
        generate_analysis: "Generate Analysis",
        reanalyze: "Re-analyze"
      },
      zh: {
        your_input: "您的回答:",
        ai_response: "AI回复:",
        ai_analysis: "AI分析:",
        send_to_ai: "发送给AI",
        enter_text_first: "请先输入文本",
        processing: "处理中...",
        analyzing: "分析中...",
        confirm: "确认",
        confirmed: "已确认",
        regenerate: "重新生成",
        edit: "编辑",
        ready: "就绪",
        generating: "生成中",
        generated: "已生成",
        error: "错误",
        confirmed_status: "已确认",
        editing: "编辑中",
        comprehensive_analysis: "综合分析",
        analysis_results: "分析结果:",
        your_responses_review: "您的回答回顾",
        ai_analysis_results: "AI分析结果",
        no_answer: "(未回答)",
        generate_analysis: "生成AI分析",
        reanalyze: "重新分析"
      }
    };
    return texts[language] || texts.en;
  }

  /**
   * 显示合并页面（传统模式）
   */
  showCombinedPage(display_element, trial, question_order, trial_start_time, ui_text) {
    // Generate HTML
    let html = '<div id="jspsych-ai-survey">';
    
    // Add preamble if provided
    if (trial.preamble !== null) {
      html += '<div id="jspsych-ai-survey-preamble" class="jspsych-ai-survey-preamble">' + 
              trial.preamble + '</div>';
    }

    // Add form
    html += '<form id="jspsych-ai-survey-form">';

    // Add questions in the specified order
    for (let i = 0; i < question_order.length; i++) {
      const question_index = question_order[i];
      const question = trial.questions[question_index];
      const question_id = `Q${question_index}`;
      const name = question.name || question_id;

      html += `<div id="jspsych-ai-survey-${question_index}" class="jspsych-ai-survey-question">`;
      html += `<p class="jspsych-ai-survey-text survey-text">${question.prompt}</p>`;
      
      // Input container
      html += '<div class="jspsych-ai-survey-input-container">';
      
      // User input section (conditionally hidden)
      if (!trial.hide_user_input) {
        html += '<div class="jspsych-ai-survey-input-section">';
        html += `<label class="jspsych-ai-survey-label" for="input-${question_index}">${ui_text.your_input}</label>`;
        if (question.rows == 1) {
          html += `<input type="text" id="input-${question_index}" name="${name}" 
                   placeholder="${question.placeholder || ''}" 
                   class="jspsych-ai-survey-textbox"
                   ${question.required ? 'required' : ''}>`;
        } else {
          html += `<textarea id="input-${question_index}" name="${name}" 
                   placeholder="${question.placeholder || ''}" 
                   rows="${question.rows}" cols="${question.columns}"
                   class="jspsych-ai-survey-textbox"
                   ${question.required ? 'required' : ''}></textarea>`;
        }
        html += '</div>';
      } else {
        // Hidden input for data collection
        html += `<input type="hidden" id="input-${question_index}" name="${name}" value="">`;
      }

      // AI interaction section
      if (trial.base_url && trial.api_key) {
        html += '<div class="jspsych-ai-survey-ai-section">';
        
        // Individual mode or Batch mode with individual areas
        // Also show AI areas in auto-generate mode even if user input is hidden
        if ((trial.ai_analysis_mode === 'individual' && (!trial.hide_user_input || trial.auto_generate) && trial.show_individual_ai_areas) ||
            (trial.ai_analysis_mode === 'batch' && this.shouldIncludeInAnalysis(question_index, name, trial) && trial.show_individual_ai_areas)) {
          
          // Button controls
          if (trial.enable_advanced_buttons) {
            // Advanced button controls
            html += '<div class="jspsych-ai-survey-button-group">';
            
            if (!trial.hide_user_input && trial.ai_analysis_mode === 'individual') {
              html += `<button type="button" id="ai-submit-${question_index}" 
                       class="jspsych-ai-survey-ai-button" disabled>
                       ${ui_text.send_to_ai}</button>`;
            }
            
            if (trial.button_config.show_confirm) {
              html += `<button type="button" id="confirm-${question_index}" 
                       class="jspsych-ai-survey-confirm-button" disabled>
                       ${ui_text.confirm}</button>`;
            }
            
            if (trial.button_config.show_regenerate) {
              html += `<button type="button" id="regenerate-${question_index}" 
                       class="jspsych-ai-survey-regenerate-button" disabled>
                       ${ui_text.regenerate}</button>`;
            }
            
            if (trial.button_config.show_edit) {
              html += `<button type="button" id="edit-${question_index}" 
                       class="jspsych-ai-survey-edit-button" disabled>
                       ${ui_text.edit}</button>`;
            }
            
            // Custom buttons
            if (trial.button_config.custom_buttons) {
              trial.button_config.custom_buttons.forEach((btn, idx) => {
                html += `<button type="button" id="custom-${question_index}-${idx}" 
                         class="jspsych-ai-survey-custom-button" data-action="${btn.action || 'custom'}">
                         ${btn.label || 'Custom'}</button>`;
              });
            }
            
            html += '</div>';
          } else if (!trial.hide_user_input && trial.ai_analysis_mode === 'individual') {
            // Basic button
            html += `<button type="button" id="ai-submit-${question_index}" 
                     class="jspsych-ai-survey-ai-button" disabled>
                     ${ui_text.send_to_ai}</button>`;
          }
          
          html += `<div id="ai-loading-${question_index}" class="jspsych-ai-survey-loading" style="display: none;">
                   <span class="loading-spinner"></span>${ui_text.processing}</div>`;
          
          // Response area label and textarea
          const label_text = trial.ai_analysis_mode === 'batch' ? ui_text.ai_analysis : ui_text.ai_response;
          html += `<label class="jspsych-ai-survey-label" for="ai-response-${question_index}">${label_text}</label>`;
          html += `<textarea id="ai-response-${question_index}" name="ai_${name}" 
                   rows="4" cols="${question.columns}"
                   class="jspsych-ai-survey-ai-response ${trial.enable_advanced_buttons ? 'lockable' : 'readonly'}"
                   ${!trial.enable_advanced_buttons ? 'readonly' : ''}
                   placeholder="AI response will appear here..."></textarea>`;
          
          // Status indicator for advanced mode
          if (trial.enable_advanced_buttons) {
            html += `<div id="status-${question_index}" class="jspsych-ai-survey-status">
                     Status: <span class="status-text">${ui_text.ready}</span></div>`;
          }
        }
        
        html += '</div>';
      }

      html += '</div>'; // Close input-container
      html += '</div>'; // Close question div
    }

    // Unified AI analysis area (for batch mode without individual areas)
    if (trial.ai_analysis_mode === 'batch' && trial.base_url && trial.api_key && !trial.show_individual_ai_areas) {
      html += '<div class="jspsych-ai-survey-unified-analysis">';
      html += `<h3 class="jspsych-ai-survey-analysis-title">${ui_text.comprehensive_analysis}</h3>`;
      if (trial.show_analysis_button) {
        html += `<button type="button" id="jspsych-ai-survey-analysis-btn" 
                 class="jspsych-btn jspsych-ai-survey-analysis-button">
                 ${trial.analysis_button_label || ui_text.generate_analysis}</button>`;
        html += `<div id="jspsych-ai-survey-batch-loading" class="jspsych-ai-survey-loading" style="display: none;">
                 <span class="loading-spinner"></span>${ui_text.analyzing}</div>`;
      }
      html += `<label class="jspsych-ai-survey-label" for="jspsych-ai-survey-unified-result">${ui_text.analysis_results}</label>`;
      html += `<textarea id="jspsych-ai-survey-unified-result" name="unified_ai_analysis" 
               readonly rows="8" cols="80"
               class="jspsych-ai-survey-ai-response jspsych-ai-survey-unified-analysis-result"
               placeholder="Analysis results will appear here..."></textarea>`;
      html += '</div>';
    }

    // Batch analysis button (for batch mode with individual areas)
    if (trial.ai_analysis_mode === 'batch' && trial.base_url && trial.api_key && trial.show_analysis_button && trial.show_individual_ai_areas) {
      html += '<div class="jspsych-ai-survey-batch-analysis">';
      html += `<button type="button" id="jspsych-ai-survey-analysis-btn" 
               class="jspsych-btn jspsych-ai-survey-analysis-button">
               ${trial.analysis_button_label || ui_text.generate_analysis}</button>`;
      html += `<div id="jspsych-ai-survey-batch-loading" class="jspsych-ai-survey-loading" style="display: none;">
               <span class="loading-spinner"></span>${ui_text.analyzing}</div>`;
      html += '</div>';
    }

    // Submit button
    html += `<input type="submit" id="jspsych-ai-survey-next" 
             class="jspsych-btn jspsych-ai-survey" 
             value="${trial.button_label}">`;
    html += '</form>';
    html += '</div>';

    display_element.innerHTML = html;

    // Setup event listeners for combined page
    this.setupCombinedPageListeners(display_element, trial, question_order, trial_start_time, ui_text);
  }

  /**
   * 显示输入页面（分离模式）
   */
  showInputPage(display_element, trial, question_order, trial_start_time, ui_text) {
    // Generate HTML for input page
    let html = '<div id="jspsych-ai-survey-input">';
    
    // Add preamble if provided
    if (trial.preamble !== null) {
      html += '<div id="jspsych-ai-survey-input-preamble" class="jspsych-ai-survey-preamble">' + 
              trial.preamble + '</div>';
    }

    // Add form
    html += '<form id="jspsych-ai-survey-input-form">';

    // Add questions
    for (let i = 0; i < question_order.length; i++) {
      const question_index = question_order[i];
      const question = trial.questions[question_index];
      const question_id = `Q${question_index}`;
      const name = question.name || question_id;

      html += `<div id="jspsych-ai-survey-input-${question_index}" class="jspsych-ai-survey-question">`;
      html += `<p class="jspsych-ai-survey-text survey-text">${question.prompt}</p>`;
      
      if (question.rows == 1) {
        html += `<input type="text" id="input-${question_index}" name="${name}" 
                 placeholder="${question.placeholder || ''}" 
                 class="jspsych-ai-survey-textbox"
                 ${question.required ? 'required' : ''}>`;
      } else {
        html += `<textarea id="input-${question_index}" name="${name}" 
                 placeholder="${question.placeholder || ''}" 
                 rows="${question.rows}" cols="${question.columns}"
                 class="jspsych-ai-survey-textbox"
                 ${question.required ? 'required' : ''}></textarea>`;
      }
      
      html += '</div>';
    }

    // Submit button
    html += `<input type="submit" id="jspsych-ai-survey-input-next" 
             class="jspsych-btn jspsych-ai-survey" 
             value="${trial.button_label}">`;
    html += '</form>';
    html += '</div>';

    display_element.innerHTML = html;

    // Setup input page listeners
    this.setupInputPageListeners(display_element, trial, question_order, trial_start_time, ui_text);
  }

  /**
   * 设置合并页面事件监听器
   */
  setupCombinedPageListeners(display_element, trial, question_order, trial_start_time, ui_text) {
    // Track response data with enhanced structure
    const response_data = {
      responses: {},
      ai_responses: {},
      response_times: {},
      ai_response_times: {},
      ai_interactions: {},
      question_states: {},
      button_interactions: {},
      batch_analysis: null,
      batch_analysis_time: null,
      collected_context: null,
      question_order: question_order,
      trial_start_time: trial_start_time,
      llm_model: trial.llm_model,
      analysis_mode: trial.ai_analysis_mode,
      api_config: {
        base_url: trial.base_url,
        endpoint: trial.api,
        has_api: !!(trial.base_url && trial.api_key)
      }
    };

    // Collect additional context data if data_collector function is provided
    // Note: In jsPsych v7, data_collector function may be automatically executed and result stored
    console.log('🔍 AI插件：检查data_collector - 值:', trial.data_collector, '类型:', typeof trial.data_collector);
    
    if (trial.data_collector) {
      if (typeof trial.data_collector === 'function') {
        // Case 1: Still a function, call it
        try {
          console.log('🔍 AI插件：data_collector是函数，正在调用');
          const collected_data = trial.data_collector();
          console.log('🔍 AI插件：函数调用返回值:', collected_data);
          response_data.collected_context = collected_data;
        } catch (error) {
          console.warn('ai-survey: Error in data_collector function:', error);
          response_data.collected_context = null;
        }
      } else if (typeof trial.data_collector === 'object' && trial.data_collector !== null) {
        // Case 2: jsPsych already executed the function, use the result directly
        console.log('🔍 AI插件：data_collector已被jsPsych执行，直接使用结果');
        response_data.collected_context = trial.data_collector;
        console.log('🔍 AI插件：使用的数据:', response_data.collected_context);
      } else {
        console.log('🔍 AI插件：data_collector类型异常:', typeof trial.data_collector);
        response_data.collected_context = null;
      }
    } else {
      console.log('🔍 AI插件：没有data_collector配置');
      response_data.collected_context = null;
    }

    // Add event listeners for each question
    question_order.forEach((question_index) => {
      const input_element = display_element.querySelector(`#input-${question_index}`);
      const ai_button = display_element.querySelector(`#ai-submit-${question_index}`);
      const ai_loading = display_element.querySelector(`#ai-loading-${question_index}`);
      const ai_response = display_element.querySelector(`#ai-response-${question_index}`);
      
      // Advanced button elements
      const confirm_button = display_element.querySelector(`#confirm-${question_index}`);
      const regenerate_button = display_element.querySelector(`#regenerate-${question_index}`);
      const edit_button = display_element.querySelector(`#edit-${question_index}`);
      const status_element = display_element.querySelector(`#status-${question_index}`);

      // Initialize interaction counter and state
      response_data.ai_interactions[question_index] = 0;
      response_data.question_states[question_index] = 'ready';
      response_data.button_interactions[question_index] = [];

      // Helper functions
      const updateStatus = (status) => {
        response_data.question_states[question_index] = status;
        if (status_element) {
          const statusMap = {
            ready: ui_text.ready,
            generating: ui_text.generating,
            generated: ui_text.generated,
            confirmed: ui_text.confirmed_status,
            editing: ui_text.editing,
            error: ui_text.error
          };
          status_element.querySelector('.status-text').textContent = statusMap[status] || status;
        }
      };

      const setResponseLocked = (locked) => {
        if (ai_response) {
          ai_response.readOnly = locked;
          ai_response.classList.toggle('locked', locked);
          if (locked) {
            ai_response.style.backgroundColor = '#f8f9fa';
            ai_response.style.borderColor = '#6c757d';
          } else {
            ai_response.style.backgroundColor = '';
            ai_response.style.borderColor = '#28a745';
          }
        }
      };

      // Auto-generate AI response if enabled
      if (trial.auto_generate && trial.base_url && trial.api_key) {
        console.log('🔍 auto_generate：准备触发AI响应，当前response_data.collected_context =', response_data.collected_context);
        this.jsPsych.pluginAPI.setTimeout(() => {
          console.log('🔍 auto_generate：开始执行AI响应生成，当前response_data.collected_context =', response_data.collected_context);
          this.generateAIResponse(question_index, '', trial, response_data, ai_loading, ai_response, updateStatus, ui_text);
        }, 100);
      }

      // Basic input validation and AI button enabling
      if (input_element && !trial.hide_user_input && ai_button) {
        input_element.addEventListener('input', () => {
          const hasContent = input_element.value.trim() !== '';
          ai_button.disabled = !hasContent;
          ai_button.textContent = hasContent ? ui_text.send_to_ai : ui_text.enter_text_first;
        });

        // Basic AI submission
        ai_button.addEventListener('click', async () => {
          const user_input = input_element.value.trim();
          if (!user_input) return;

          response_data.button_interactions[question_index].push({
            action: 'ai_submit',
            timestamp: Date.now()
          });

          await this.generateAIResponse(question_index, user_input, trial, response_data, ai_loading, ai_response, updateStatus, ui_text);
          
          // Enable advanced buttons after AI response
          if (trial.enable_advanced_buttons) {
            if (confirm_button) confirm_button.disabled = false;
            if (regenerate_button) regenerate_button.disabled = false;
            if (edit_button) edit_button.disabled = false;
          }
        });
      }

      // Advanced button event listeners
      if (trial.enable_advanced_buttons) {
        
        // Confirm button
        if (confirm_button) {
          confirm_button.addEventListener('click', () => {
            response_data.button_interactions[question_index].push({
              action: 'confirm',
              timestamp: Date.now()
            });
            
            updateStatus('confirmed');
            setResponseLocked(trial.button_config.confirm_locks);
            
            confirm_button.disabled = true;
            confirm_button.textContent = ui_text.confirmed;
            
            if (edit_button) edit_button.disabled = false;
          });
        }
        
        // Regenerate button
        if (regenerate_button) {
          regenerate_button.addEventListener('click', async () => {
            response_data.button_interactions[question_index].push({
              action: 'regenerate',
              timestamp: Date.now()
            });
            
            const user_input = trial.hide_user_input ? '' : input_element.value.trim();
            await this.generateAIResponse(question_index, user_input, trial, response_data, ai_loading, ai_response, updateStatus, ui_text);
            
            // Reset confirm button if response was locked
            if (confirm_button && trial.button_config.confirm_locks) {
              confirm_button.disabled = false;
              confirm_button.textContent = ui_text.confirm;
              setResponseLocked(false);
            }
          });
        }
        
        // Edit button
        if (edit_button) {
          edit_button.addEventListener('click', () => {
            response_data.button_interactions[question_index].push({
              action: 'edit',
              timestamp: Date.now()
            });
            
            updateStatus('editing');
            setResponseLocked(false);
            
            if (confirm_button) {
              confirm_button.disabled = false;
              confirm_button.textContent = ui_text.confirm;
            }
            
            if (ai_response) ai_response.focus();
          });
        }
        
        // Custom buttons
        trial.button_config.custom_buttons?.forEach((btn, idx) => {
          const custom_button = display_element.querySelector(`#custom-${question_index}-${idx}`);
          if (custom_button) {
            custom_button.addEventListener('click', () => {
              response_data.button_interactions[question_index].push({
                action: btn.action || 'custom',
                label: btn.label,
                timestamp: Date.now()
              });
              
              // Execute custom callback if provided
              if (btn.callback && typeof btn.callback === 'function') {
                btn.callback(question_index, response_data, ai_response);
              }
            });
          }
        });
      }
    });

    // Batch analysis event listener
    if (trial.ai_analysis_mode === 'batch' && trial.base_url && trial.api_key && trial.show_analysis_button) {
      const analysisButton = display_element.querySelector('#jspsych-ai-survey-analysis-btn');
      const batchLoading = display_element.querySelector('#jspsych-ai-survey-batch-loading');
      
      if (analysisButton) {
        analysisButton.addEventListener('click', async () => {
          // Collect current responses
          const currentResponses = {};
          let hasResponses = false;
          
          question_order.forEach((question_index) => {
            const input_element = display_element.querySelector(`#input-${question_index}`);
            const question = trial.questions[question_index];
            const name = question.name || `Q${question_index}`;
            
            if (input_element) {
              const value = input_element.value.trim();
              currentResponses[name] = value;
              if (value) hasResponses = true;
            }
          });
          
          if (!hasResponses) {
            alert('Please provide some responses before requesting analysis.');
            return;
          }
          
          // Show loading state
          analysisButton.disabled = true;
          analysisButton.textContent = ui_text.analyzing;
          if (batchLoading) batchLoading.style.display = 'block';
          
          try {
            const analysisStartTime = performance.now();
            
            // Perform batch analysis
            const analysisResult = await this.performBatchAnalysis(currentResponses, trial);
            const analysisEndTime = performance.now();
            
            // Store analysis result
            response_data.batch_analysis = analysisResult;
            response_data.batch_analysis_time = analysisEndTime - analysisStartTime;
            
            // Display analysis result
            this.displayBatchAnalysis(analysisResult, trial, display_element, question_order);
            
          } catch (error) {
            console.error('Batch Analysis Error:', error);
            const errorMessage = this.getErrorMessage(error);
            alert(`Analysis failed: ${errorMessage}`);
          } finally {
            // Reset button state
            if (batchLoading) batchLoading.style.display = 'none';
            analysisButton.disabled = false;
            analysisButton.textContent = trial.analysis_button_label || ui_text.generate_analysis;
          }
        });
      }
    }

    // Form submission
    display_element.querySelector('#jspsych-ai-survey-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const end_time = performance.now();
      const total_response_time = end_time - trial_start_time;

      // Collect all responses
      question_order.forEach((question_index) => {
        const input_element = display_element.querySelector(`#input-${question_index}`);
        const question = trial.questions[question_index];
        const name = question.name || `Q${question_index}`;
        
        response_data.responses[name] = input_element ? input_element.value : '';
        
        // Ensure AI response data exists
        if (!(question_index in response_data.ai_responses)) {
          response_data.ai_responses[question_index] = null;
          response_data.ai_response_times[question_index] = null;
          response_data.ai_interactions[question_index] = 0;
        }
      });

      // Prepare trial data
      const trial_data = {
        response: response_data.responses,
        rt: total_response_time,
        question_order: question_order,
        ai_response: response_data.ai_responses,
        ai_rt: response_data.ai_response_times,
        ai_interactions: response_data.ai_interactions,
        question_states: response_data.question_states,
        button_interactions: response_data.button_interactions,
        batch_analysis: response_data.batch_analysis,
        batch_analysis_time: response_data.batch_analysis_time,
        collected_context: response_data.collected_context,
        analysis_mode: response_data.analysis_mode,
        llm_model: response_data.llm_model,
        api_config: response_data.api_config,
        trial_type: 'ai-survey',
        display_mode: 'combined',
        advanced_mode: trial.enable_advanced_buttons,
        timestamp: new Date().toISOString()
      };

      // Clear timeouts and display, then finish trial
      this.jsPsych.pluginAPI.clearAllTimeouts();
      display_element.innerHTML = '';
      this.jsPsych.finishTrial(trial_data);
    });
  }

  /**
   * 设置输入页面事件监听器
   */
  setupInputPageListeners(display_element, trial, question_order, trial_start_time, ui_text) {
    // Handle form submission
    display_element.querySelector('#jspsych-ai-survey-input-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const input_end_time = performance.now();
      const input_response_time = input_end_time - trial_start_time;

      // Collect responses
      const responses = {};
      question_order.forEach((question_index) => {
        const input_element = display_element.querySelector(`#input-${question_index}`);
        const question = trial.questions[question_index];
        const name = question.name || `Q${question_index}`;
        
        responses[name] = input_element ? input_element.value : '';
      });

      // Show output page
      await this.showOutputPage(display_element, trial, responses, question_order, input_response_time, trial_start_time, ui_text);
    });
  }

  /**
   * 显示输出页面
   */
  async showOutputPage(display_element, trial, responses, question_order, input_rt, trial_start_time, ui_text) {
    // Build output page HTML
    let outputHtml = '<div id="jspsych-ai-survey-output">';
    
    // Add preamble
    if (trial.preamble !== null) {
      outputHtml += '<div id="jspsych-ai-survey-output-preamble" class="jspsych-ai-survey-preamble">' + 
                    trial.preamble + '</div>';
    }
    
    // Input review section
    outputHtml += '<div class="jspsych-ai-survey-output-section">';
    outputHtml += `<h3 class="jspsych-ai-survey-section-title">${ui_text.your_responses_review}</h3>`;
    
    // Display user responses
    question_order.forEach((question_index) => {
      const question = trial.questions[question_index];
      const name = question.name || `Q${question_index}`;
      const response = responses[name] || '';
      
      outputHtml += '<div class="jspsych-ai-survey-review-item">';
      outputHtml += `<div class="jspsych-ai-survey-review-question">${question.prompt}</div>`;
      outputHtml += `<div class="jspsych-ai-survey-review-answer">${response || ui_text.no_answer}</div>`;
      outputHtml += '</div>';
    });
    
    outputHtml += '</div>'; // Close output-section
    
    // AI analysis section
    if (trial.base_url && trial.api_key) {
      outputHtml += '<div class="jspsych-ai-survey-ai-analysis-section">';
      outputHtml += `<h3 class="jspsych-ai-survey-section-title">${ui_text.ai_analysis_results}</h3>`;
      
      if (trial.ai_analysis_mode === 'batch') {
        // Batch analysis mode
        outputHtml += '<div class="jspsych-ai-survey-batch-output">';
        
        if (!trial.auto_analyze_on_output) {
          outputHtml += `<button type="button" id="jspsych-ai-survey-output-analysis-btn" 
                         class="jspsych-btn jspsych-ai-survey-analysis-button">
                         ${trial.analysis_button_label || ui_text.generate_analysis}</button>`;
        }
        
        outputHtml += `<div id="jspsych-ai-survey-output-loading" class="jspsych-ai-survey-loading" style="display: ${trial.auto_analyze_on_output ? 'block' : 'none'};">
                       <span class="loading-spinner"></span>${ui_text.analyzing}</div>`;
      outputHtml += `<label class="jspsych-ai-survey-label" for="jspsych-ai-survey-output-result">${ui_text.analysis_results}</label>`;
      outputHtml += `<textarea id="jspsych-ai-survey-output-result" readonly rows="12" cols="80"
                       class="jspsych-ai-survey-ai-response jspsych-ai-survey-unified-analysis-result"
                       placeholder="${trial.auto_analyze_on_output ? 'Generating analysis...' : 'Click the button above to generate AI analysis...'}"></textarea>`;
        outputHtml += '</div>';
      } else {
        // Individual analysis mode
        question_order.forEach((question_index) => {
          const question = trial.questions[question_index];
          const name = question.name || `Q${question_index}`;
          
          if (this.shouldIncludeInAnalysis(question_index, name, trial)) {
            outputHtml += '<div class="jspsych-ai-survey-individual-output">';
            outputHtml += `<h4>${question.prompt}</h4>`;
            outputHtml += `<button type="button" id="ai-output-submit-${question_index}" 
                           class="jspsych-ai-survey-ai-button">
                           Analyze this question</button>`;
            outputHtml += `<div id="ai-output-loading-${question_index}" class="jspsych-ai-survey-loading" style="display: none;">
                           <span class="loading-spinner"></span>${ui_text.analyzing}</div>`;
            outputHtml += `<textarea id="ai-output-response-${question_index}" readonly rows="6"
                           class="jspsych-ai-survey-ai-response"
                           placeholder="Click button to get AI analysis..."></textarea>`;
            outputHtml += '</div>';
          }
        });
      }
      
      outputHtml += '</div>'; // Close ai-analysis-section
    }
    
    // Finish button
    outputHtml += `<button type="button" id="jspsych-ai-survey-output-finish" 
                   class="jspsych-btn jspsych-ai-survey"
                   style="margin-top: 30px;">
                   ${trial.button_label}</button>`;
    
    outputHtml += '</div>'; // Close output container
    
    // Update page content
    display_element.innerHTML = outputHtml;
    
    // Setup output page listeners
    await this.setupOutputPageListeners(display_element, trial, responses, question_order, input_rt, trial_start_time, ui_text);
  }

  /**
   * 设置输出页面事件监听器
   */
  async setupOutputPageListeners(display_element, trial, responses, question_order, input_rt, trial_start_time, ui_text) {
    const response_data = {
      responses: responses,
      ai_responses: {},
      ai_response_times: {},
      ai_interactions: {},
      batch_analysis: null,
      batch_analysis_time: null,
      question_order: question_order,
      trial_start_time: trial_start_time,
      llm_model: trial.llm_model,
      analysis_mode: trial.ai_analysis_mode,
      api_config: {
        base_url: trial.base_url,
        endpoint: trial.api,
        has_api: !!(trial.base_url && trial.api_key)
      }
    };

    // Initialize interaction counters
    question_order.forEach((question_index) => {
      response_data.ai_interactions[question_index] = 0;
    });

    // Batch analysis
    if (trial.ai_analysis_mode === 'batch') {
      const analysisButton = display_element.querySelector('#jspsych-ai-survey-output-analysis-btn');
      const loadingDiv = display_element.querySelector('#jspsych-ai-survey-output-loading');
      const resultTextarea = display_element.querySelector('#jspsych-ai-survey-output-result');
      
      const performAnalysis = async () => {
        const analysisStartTime = performance.now();
        
        // Show loading state
        if (analysisButton) {
          analysisButton.disabled = true;
          analysisButton.textContent = ui_text.analyzing;
        }
        if (loadingDiv) loadingDiv.style.display = 'block';
        
        try {
          // Perform batch analysis
          const analysisResult = await this.performBatchAnalysis(responses, trial);
          
          // Display result
          if (resultTextarea) {
            resultTextarea.value = analysisResult;
            resultTextarea.style.backgroundColor = '#d4edda';
            this.jsPsych.pluginAPI.setTimeout(() => {
              resultTextarea.style.backgroundColor = '#f8f9fa';
            }, 2000);
          }
          
          // Record analysis data
          const analysisEndTime = performance.now();
          response_data.batch_analysis = analysisResult;
          response_data.batch_analysis_time = analysisEndTime - analysisStartTime;
          
        } catch (error) {
          console.error('Batch Analysis Error:', error);
          const errorMessage = this.getErrorMessage(error);
          if (resultTextarea) {
            resultTextarea.value = `Analysis failed: ${errorMessage}`;
            resultTextarea.style.backgroundColor = '#f8d7da';
          }
          alert(`Analysis failed: ${errorMessage}`);
        } finally {
          // Reset button state
          if (loadingDiv) loadingDiv.style.display = 'none';
          if (analysisButton) {
            analysisButton.disabled = false;
            analysisButton.textContent = trial.analysis_button_label || ui_text.reanalyze;
          }
        }
      };
      
      // Auto analysis if enabled
      if (trial.auto_analyze_on_output) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          performAnalysis();
        }, 100);
      }
      
      // Analysis button click
      if (analysisButton) {
        analysisButton.addEventListener('click', performAnalysis);
      }
    } else {
      // Individual analysis buttons
      question_order.forEach((question_index) => {
        const question = trial.questions[question_index];
        const name = question.name || `Q${question_index}`;
        
        if (this.shouldIncludeInAnalysis(question_index, name, trial)) {
          const aiButton = display_element.querySelector(`#ai-output-submit-${question_index}`);
          const aiLoading = display_element.querySelector(`#ai-output-loading-${question_index}`);
          const aiResponse = display_element.querySelector(`#ai-output-response-${question_index}`);
          
          if (aiButton) {
            aiButton.addEventListener('click', async () => {
              const user_input = responses[name];
              if (!user_input || user_input.trim() === '') return;
              
              const ai_start_time = performance.now();
              response_data.ai_interactions[question_index]++;
              
              // Show loading state
              aiButton.disabled = true;
              aiButton.textContent = ui_text.analyzing;
              if (aiLoading) aiLoading.style.display = 'block';
              if (aiResponse) aiResponse.value = '';
              
              try {
                const aiResult = await this.makeAIRequest(user_input, trial, question_index);
                const ai_end_time = performance.now();
                
                // Display AI response
                if (aiResponse) {
                  aiResponse.value = aiResult;
                  aiResponse.style.borderColor = '#28a745';
                }
                
                // Record data
                response_data.ai_responses[question_index] = aiResult;
                response_data.ai_response_times[question_index] = ai_end_time - ai_start_time;
                
              } catch (error) {
                console.error('AI Request Error:', error);
                const errorMessage = this.getErrorMessage(error);
                if (aiResponse) {
                  aiResponse.value = `AI response failed: ${errorMessage}`;
                  aiResponse.style.borderColor = '#dc3545';
                }
              } finally {
                // Reset button state
                if (aiLoading) aiLoading.style.display = 'none';
                aiButton.disabled = false;
                aiButton.textContent = 'Re-analyze';
              }
            });
          }
        }
      });
    }
    
    // Finish button
    const finishButton = display_element.querySelector('#jspsych-ai-survey-output-finish');
    if (finishButton) {
      finishButton.addEventListener('click', () => {
        const end_time = performance.now();
        const total_rt = end_time - trial_start_time;
        
        // Prepare complete trial data
        const trial_data = {
          response: response_data.responses,
          rt: total_rt,
          input_rt: input_rt,
          analysis_rt: total_rt - input_rt,
          question_order: question_order,
          ai_response: response_data.ai_responses,
          ai_rt: response_data.ai_response_times,
          ai_interactions: response_data.ai_interactions,
          batch_analysis: response_data.batch_analysis,
          batch_analysis_time: response_data.batch_analysis_time,
          analysis_mode: response_data.analysis_mode,
          llm_model: response_data.llm_model,
          api_config: response_data.api_config,
          trial_type: 'ai-survey',
          display_mode: 'separate_input_output',
          timestamp: new Date().toISOString()
        };
        
        // Clear timeouts and display, then finish trial
        this.jsPsych.pluginAPI.clearAllTimeouts();
        display_element.innerHTML = '';
        this.jsPsych.finishTrial(trial_data);
      });
    }
  }

  /**
   * Helper method to generate AI response
   */
  async generateAIResponse(question_index, user_input, trial, response_data, ai_loading, ai_response, updateStatus, ui_text) {
    const ai_start_time = performance.now();
    response_data.ai_interactions[question_index]++;
    
    // Show loading state
    updateStatus('generating');
    if (ai_loading) ai_loading.style.display = 'block';
    if (ai_response) ai_response.value = '';

    try {
      // Build context with collected data and user input
      console.log('🔍 generateAIResponse：response_data.collected_context =', response_data.collected_context);
      let context_input = user_input;
      if (response_data.collected_context) {
        console.log('🔍 generateAIResponse：开始构建上下文输入');
        context_input = this.buildContextualInput(user_input, response_data.collected_context, question_index);
        console.log('🔍 generateAIResponse：构建的上下文输入 =', context_input);
      } else {
        console.log('🔍 generateAIResponse：没有collected_context，使用原始用户输入');
      }
      
      // Make API request with context
      const response = await this.makeAIRequest(context_input, trial, question_index);
      const ai_end_time = performance.now();
      
      // Store AI response data
      response_data.ai_responses[question_index] = response;
      response_data.ai_response_times[question_index] = ai_end_time - ai_start_time;
      
      // Display AI response
      if (ai_response) {
        ai_response.value = response;
        ai_response.style.borderColor = '#28a745';
      }
      
      updateStatus('generated');
      
    } catch (error) {
      console.error('AI API Error:', error);
      const errorMessage = this.getErrorMessage(error);
      if (ai_response) {
        ai_response.value = errorMessage;
        ai_response.style.borderColor = '#dc3545';
      }
      response_data.ai_responses[question_index] = null;
      response_data.ai_response_times[question_index] = null;
      updateStatus('error');
    } finally {
      // Hide loading state
      if (ai_loading) ai_loading.style.display = 'none';
    }
  }

  /**
   * Static utility functions for data collection
   */
  static DataCollectorUtils = {
    /**
     * Get data from specific plugin types with common filtering options
     */
    getPluginData: function(plugin_type, options = {}) {
      let data = jsPsych.data.get().filter({trial_type: plugin_type});
      
      // Apply common filters
      if (options.correct !== undefined) {
        data = data.filter({correct: options.correct});
      }
      if (options.last) {
        data = data.last(options.last);
      }
      if (options.first) {
        data = data.first(options.first);
      }
      if (options.rt_range) {
        data = data.filterCustom(function(x) { 
          return x.rt >= options.rt_range[0] && x.rt <= options.rt_range[1]; 
        });
      }
      
      return data;
    },

    /**
     * Get comprehensive statistics from data
     */
    getDataStats: function(data, field = 'rt') {
      if (!data || data.count() === 0) return null;
      
      const values = data.select(field);
      return {
        count: values.count(),
        mean: values.mean(),
        median: values.median(),
        min: values.min(),
        max: values.max(),
        sum: values.sum(),
        variance: values.variance(),
        sd: values.sd()
      };
    },

    /**
     * Get performance summary across all trials
     */
    getPerformanceSummary: function() {
      const all_data = jsPsych.data.get();
      const correct_data = all_data.filter({correct: true});
      
      return {
        total_trials: all_data.count(),
        correct_trials: correct_data.count(),
        accuracy: correct_data.count() / all_data.count(),
        rt_stats: this.getDataStats(all_data, 'rt'),
        correct_rt_stats: this.getDataStats(correct_data, 'rt')
      };
    },

    /**
     * Extract survey responses in structured format
     */
    getSurveyResponses: function(plugin_types = ['survey-multi-choice', 'survey-likert', 'survey-text', 'survey-html-form']) {
      const responses = {};
      
      plugin_types.forEach(plugin_type => {
        const data = jsPsych.data.get().filter({trial_type: plugin_type});
        if (data.count() > 0) {
          responses[plugin_type] = data.values();
        }
      });
      
      return responses;
    },

    /**
     * Get reaction time data from common RT plugins
     */
    getReactionTimeData: function() {
      const rt_plugins = [
        'html-keyboard-response', 
        'image-keyboard-response', 
        'image-button-response',
        'canvas-keyboard-response',
        'canvas-button-response'
      ];
      
      const rt_data = {};
      rt_plugins.forEach(plugin => {
        const data = this.getPluginData(plugin);
        if (data.count() > 0) {
          rt_data[plugin] = {
            trials: data.values(),
            stats: this.getDataStats(data, 'rt'),
            responses: data.select('response').values()
          };
        }
      });
      
      return rt_data;
    },

    /**
     * Build formatted context string for AI
     */
    formatContextForAI: function(context_data) {
      let formatted = '';
      
      // Performance summary
      if (context_data.performance) {
        formatted += `Performance Summary:\n`;
        formatted += `- Total trials: ${context_data.performance.total_trials}\n`;
        formatted += `- Accuracy: ${(context_data.performance.accuracy * 100).toFixed(1)}%\n`;
        if (context_data.performance.rt_stats) {
          formatted += `- Average RT: ${context_data.performance.rt_stats.mean.toFixed(0)}ms\n`;
        }
        formatted += '\n';
      }

      // Survey responses
      if (context_data.surveys) {
        formatted += `Survey Responses:\n`;
        Object.keys(context_data.surveys).forEach(plugin => {
          context_data.surveys[plugin].forEach((trial, idx) => {
            if (trial.response) {
              formatted += `- ${plugin} #${idx + 1}: ${JSON.stringify(trial.response)}\n`;
            }
          });
        });
        formatted += '\n';
      }

      // Reaction time data
      if (context_data.reaction_times) {
        formatted += `Reaction Time Data:\n`;
        Object.keys(context_data.reaction_times).forEach(plugin => {
          const data = context_data.reaction_times[plugin];
          formatted += `- ${plugin}: ${data.trials.length} trials, avg RT: ${data.stats.mean.toFixed(0)}ms\n`;
        });
        formatted += '\n';
      }

      // Recent trials
      if (context_data.recent_trials) {
        formatted += `Recent Trials:\n`;
        context_data.recent_trials.forEach((trial, idx) => {
          formatted += `- Trial ${idx + 1}: ${trial.trial_type}`;
          if (trial.response) formatted += `, response: ${trial.response}`;
          if (trial.rt) formatted += `, RT: ${trial.rt}ms`;
          if (trial.correct !== undefined) formatted += `, correct: ${trial.correct}`;
          formatted += '\n';
        });
        formatted += '\n';
      }

      return formatted;
    }
  };

  /**
   * Build contextual input combining user input with collected data
   */
  buildContextualInput(user_input, collected_context, question_index) {
    if (!collected_context) return user_input;
    
    let contextual_input = '';
    
    // Add context information
    if (typeof collected_context === 'object') {
      // Handle new enhanced data format
      if (collected_context.performance || collected_context.surveys || collected_context.reaction_times || collected_context.recent_trials) {
        contextual_input += jsPsychAISurvey.DataCollectorUtils.formatContextForAI(collected_context) + '\n';
      }
      
      // Handle questionnaire data format (for personality tests, etc.)
      if (collected_context.questionnaire_data) {
        contextual_input += collected_context.questionnaire_data + '\n\n';
      }
      
      // Handle survey results format (for integration demos, etc.)
      if (collected_context.survey_results) {
        contextual_input += collected_context.survey_results + '\n\n';
      }
      
      // Handle legacy format
      if (collected_context.responses) {
        contextual_input += `Previous responses: ${JSON.stringify(collected_context.responses)}\n`;
      }
      if (collected_context.trials) {
        contextual_input += `Trial history: ${JSON.stringify(collected_context.trials)}\n`;
      }
      if (collected_context.custom) {
        contextual_input += `Additional context: ${JSON.stringify(collected_context.custom)}\n`;
      }
    }
    
    // Add current user input
    if (user_input) {
      contextual_input += `Current response: ${user_input}`;
    } else {
      contextual_input += 'Please provide analysis based on the provided data.';
    }
    
    return contextual_input;
  }

  /**
   * Make API request to AI service
   */
  async makeAIRequest(input_text, trial, question_index = null) {
    const url = trial.base_url + trial.api;
    
    // Prepare headers with API key
    const headers = {
      ...trial.api_headers,
      'Authorization': `Bearer ${trial.api_key}`
    };

    // Build messages array with system prompt if provided
    const messages = [];
    if (trial.system_prompt) {
      messages.push({
        role: "system",
        content: trial.system_prompt
      });
    }
    messages.push({
      role: "user",
      content: input_text
    });

    // Format request body for OpenAI-compatible API
    const request_body = {
      model: trial.llm_model || "deepseek-chat",
      messages: messages,
      max_tokens: trial.max_tokens || 500,
      temperature: trial.temperature || 0.7,
      stream: false
    };

    const controller = new AbortController();
    const timeout_id = this.jsPsych.pluginAPI.setTimeout(() => controller.abort(), trial.api_timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(request_body),
        signal: controller.signal
      });

      clearTimeout(timeout_id);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Extract response text from various API formats
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      } else if (data.output) {
        return data.output.trim();
      } else if (data.response) {
        return data.response.trim();
      } else if (data.text) {
        return data.text.trim();
      } else {
        throw new Error('Unexpected API response format');
      }
      
    } catch (error) {
      clearTimeout(timeout_id);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      
      throw new Error(`AI API Error: ${error.message}`);
    }
  }

  /**
   * Check if question should be included in AI analysis
   */
  shouldIncludeInAnalysis(question_index, question_name, trial) {
    if (!trial.ai_analysis_questions) {
      return true; // Include all if not specified
    }
    
    return trial.ai_analysis_questions.includes(question_index) || 
           trial.ai_analysis_questions.includes(question_name);
  }

  /**
   * Perform batch analysis of all responses
   */
  async performBatchAnalysis(responses, trial) {
    // Filter questions for analysis
    const analysisData = {};
    const questions = trial.questions;
    
    // Find corresponding question index for each response
    questions.forEach((question, index) => {
      const question_name = question.name || `Q${index}`;
      const question_index = index;
      
      if (responses[question_name] !== undefined && this.shouldIncludeInAnalysis(question_index, question_name, trial)) {
        analysisData[question_name] = {
          question: question.prompt || question_name,
          response: responses[question_name]
        };
      }
    });

    // Build analysis prompt
    let analysisPrompt = trial.batch_analysis_prompt + '\n\n';
    
    Object.keys(analysisData).forEach((key) => {
      const item = analysisData[key];
      analysisPrompt += `Question: ${item.question}\n`;
      analysisPrompt += `Response: ${item.response}\n\n`;
    });
    
    analysisPrompt += 'Please provide a comprehensive analysis and insights based on these responses.';

    // Call AI API for analysis
    return await this.makeAIRequest(analysisPrompt, trial, 'batch_analysis');
  }

  /**
   * Display batch analysis results
   */
  displayBatchAnalysis(analysisResult, trial, display_element, question_order) {
    if (trial.show_individual_ai_areas) {
      // Individual areas mode: display in all selected analysis questions
      question_order.forEach((question_index) => {
        const question = trial.questions[question_index];
        const name = question.name || `Q${question_index}`;
        
        if (this.shouldIncludeInAnalysis(question_index, name, trial)) {
          const analysisElement = display_element.querySelector(`#ai-response-${question_index}`);
          if (analysisElement) {
            analysisElement.value = analysisResult;
            analysisElement.style.borderColor = '#6f42c1'; // Purple for analysis
          }
        }
      });
    } else {
      // Unified mode: display in unified analysis area
      const unifiedElement = display_element.querySelector('#jspsych-ai-survey-unified-result');
      if (unifiedElement) {
        unifiedElement.value = analysisResult;
        unifiedElement.style.borderColor = '#28a745'; // Green for unified analysis
        unifiedElement.style.borderWidth = '2px';
        
        // Add success animation effect
        unifiedElement.style.backgroundColor = '#d4edda';
        this.jsPsych.pluginAPI.setTimeout(() => {
          unifiedElement.style.backgroundColor = '#f8f9fa';
        }, 2000);
      }
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    } else if (error.message.includes('HTTP 401')) {
      return 'Authentication failed. Please check your API key.';
    } else if (error.message.includes('HTTP 429')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message.includes('HTTP 500')) {
      return 'Server error. Please try again later.';
    } else {
      return `Error: ${error.message}. Please try again.`;
    }
  }
}

// Export for jsPsych v7
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jsPsychAISurvey;
} else if (typeof window !== 'undefined') {
  window.jsPsychAISurvey = jsPsychAISurvey;
}
