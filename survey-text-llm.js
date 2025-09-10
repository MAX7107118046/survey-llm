/**
 * jsPsych Survey Text with LLM Integration Plugin
 * 
 * This plugin extends the survey-text functionality by adding AI interaction capabilities.
 * Users can input text in the first textbox, send it to an AI model, and receive responses 
 * displayed in a second textbox.
 * 
 * @author Max
 * @version 1.0.0
 */

// jsPsych Survey Text LLM Plugin - Compatible with jsPsych v7
class jsPsychSurveyTextLLM {
  constructor(jsPsych) {
    this.jsPsych = jsPsych;
  }

  static info = {
    name: "survey-text-llm",
    parameters: {
      /**
       * Array of question objects. Each question should have a 'prompt' property.
       * Optional properties: 'placeholder', 'rows', 'columns', 'required', 'name'
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
      /**
       * Function to collect data from previous trials/plugins for AI context.
       */
      data_collector: {
        type: 'FUNCTION',
        pretty_name: "Data Collector",
        default: null,
        description: "Function that returns additional context data to send to AI. Should return an object with previous responses/data."
      },
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
       * Auto-generate AI responses on trial start without user input.
       */
      auto_generate: {
        type: 'BOOL',
        pretty_name: "Auto Generate",
        default: false,
        description: "If true, automatically generates AI responses when trial starts."
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
      /**
       * Enable multi-button interaction mode.
       */
      enable_advanced_buttons: {
        type: 'BOOL',
        pretty_name: "Enable Advanced Buttons",
        default: false,
        description: "Enables advanced button controls (confirm, regenerate, edit)."
      }
    }
  };

  /**
   * Plugin trial function
   */
  trial(display_element, trial) {
    // 参数验证
    if (!trial.questions || trial.questions.length === 0) {
      console.warn('survey-text-llm: No questions provided');
      trial.questions = [];
    }
    
    // 验证API配置
    if (trial.base_url && trial.api_key) {
      // API配置完整，可以进行LLM交互
    } else if (trial.base_url || trial.api_key) {
      console.warn('survey-text-llm: Incomplete API configuration. Both base_url and api_key are required for LLM functionality.');
    }
    
    // Store trial start time
    const trial_start_time = performance.now();
    
    // Create question order
    let question_order = Array.from({length: trial.questions.length}, (_, i) => i);
    if (trial.randomize_question_order) {
      question_order = this.jsPsych.randomization.shuffle(question_order);
    }

    // Generate HTML
    let html = '<div id="jspsych-survey-text-llm">';
    
    // Add preamble if provided
    if (trial.preamble !== null) {
      html += '<div id="jspsych-survey-text-llm-preamble" class="jspsych-survey-text-llm-preamble">' + 
              trial.preamble + '</div>';
    }

    // Add form
    html += '<form id="jspsych-survey-text-llm-form">';

    // Add questions in the specified order
    for (let i = 0; i < question_order.length; i++) {
      const question_index = question_order[i];
      const question = trial.questions[question_index];
      const question_id = `Q${question_index}`;
      const name = question.name || question_id;

      html += `<div id="jspsych-survey-text-llm-${question_index}" class="jspsych-survey-text-llm-question">`;
      html += `<p class="jspsych-survey-text-llm-text survey-text">${question.prompt}</p>`;
      
      // Input container
      html += '<div class="jspsych-survey-text-llm-input-container">';
      
      // User input section (conditionally hidden)
      if (!trial.hide_user_input) {
        html += '<div class="jspsych-survey-text-llm-input-section">';
        html += '<label class="jspsych-survey-text-llm-label">Your Input:</label>';
        if (question.rows == 1) {
          html += `<input type="text" id="input-${question_index}" name="${name}" 
                   placeholder="${question.placeholder || ''}" 
                   class="jspsych-survey-text-llm-textbox"
                   ${question.required ? 'required' : ''}>`;
        } else {
          html += `<textarea id="input-${question_index}" name="${name}" 
                   placeholder="${question.placeholder || ''}" 
                   rows="${question.rows}" cols="${question.columns}"
                   class="jspsych-survey-text-llm-textbox"
                   ${question.required ? 'required' : ''}></textarea>`;
        }
        html += '</div>';
      } else {
        // Hidden input for data collection
        html += `<input type="hidden" id="input-${question_index}" name="${name}" value="">`;
      }

      // AI interaction section (only if API is configured)
      if (trial.base_url && trial.api_key) {
        html += '<div class="jspsych-survey-text-llm-ai-section">';
        
        // Basic or Advanced button controls
        if (trial.enable_advanced_buttons) {
          // Advanced button controls
          html += '<div class="jspsych-survey-text-llm-button-group">';
          
          if (!trial.hide_user_input) {
            html += `<button type="button" id="ai-submit-${question_index}" 
                     class="jspsych-survey-text-llm-ai-button" disabled>
                     Send to AI</button>`;
          }
          
          if (trial.button_config.show_confirm) {
            html += `<button type="button" id="confirm-${question_index}" 
                     class="jspsych-survey-text-llm-confirm-button" disabled>
                     Confirm</button>`;
          }
          
          if (trial.button_config.show_regenerate) {
            html += `<button type="button" id="regenerate-${question_index}" 
                     class="jspsych-survey-text-llm-regenerate-button" disabled>
                     Regenerate</button>`;
          }
          
          if (trial.button_config.show_edit) {
            html += `<button type="button" id="edit-${question_index}" 
                     class="jspsych-survey-text-llm-edit-button" disabled>
                     Edit</button>`;
          }
          
          // Custom buttons
          if (trial.button_config.custom_buttons) {
            trial.button_config.custom_buttons.forEach((btn, idx) => {
              html += `<button type="button" id="custom-${question_index}-${idx}" 
                       class="jspsych-survey-text-llm-custom-button" data-action="${btn.action || 'custom'}">
                       ${btn.label || 'Custom'}</button>`;
            });
          }
          
          html += '</div>';
        } else if (!trial.hide_user_input) {
          // Basic button
          html += `<button type="button" id="ai-submit-${question_index}" 
                   class="jspsych-survey-text-llm-ai-button" disabled>
                   Send to AI</button>`;
        }
        
        html += `<div id="ai-loading-${question_index}" class="jspsych-survey-text-llm-loading" style="display: none;">
                 <span class="loading-spinner"></span>Processing...</div>`;
        html += '<label class="jspsych-survey-text-llm-label">AI Response:</label>';
        html += `<textarea id="ai-response-${question_index}" name="ai_${name}" 
                 rows="4" cols="${question.columns}"
                 class="jspsych-survey-text-llm-ai-response ${trial.enable_advanced_buttons ? 'lockable' : 'readonly'}"
                 ${!trial.enable_advanced_buttons ? 'readonly' : ''}
                 placeholder="AI response will appear here..."></textarea>`;
        
        // Status indicator for advanced mode
        if (trial.enable_advanced_buttons) {
          html += `<div id="status-${question_index}" class="jspsych-survey-text-llm-status">
                   Status: <span class="status-text">Ready</span></div>`;
        }
        
        html += '</div>';
      }

      html += '</div>'; // Close input-container
      html += '</div>'; // Close question div
    }

    // Submit button
    html += `<input type="submit" id="jspsych-survey-text-llm-next" 
             class="jspsych-btn jspsych-survey-text-llm" 
             value="${trial.button_label}">`;
    html += '</form>';
    html += '</div>';

    display_element.innerHTML = html;

    // Track response data with enhanced structure
    const response_data = {
      responses: {},
      ai_responses: {},
      response_times: {},
      ai_response_times: {},
      ai_interactions: {}, // Track number of AI interactions per question
      question_states: {}, // Track question states (locked, confirmed, etc.)
      button_interactions: {}, // Track button click events
      collected_context: null, // Store data from data_collector function
      question_order: question_order,
      trial_start_time: trial_start_time,
      llm_model: trial.llm_model,
      api_config: {
        base_url: trial.base_url,
        endpoint: trial.api,
        has_api: !!(trial.base_url && trial.api_key)
      }
    };

    // Collect additional context data if data_collector function is provided
    if (trial.data_collector && typeof trial.data_collector === 'function') {
      try {
        response_data.collected_context = trial.data_collector();
      } catch (error) {
        console.warn('survey-text-llm: Error in data_collector function:', error);
        response_data.collected_context = null;
      }
    }

    // Add event listeners for input fields and buttons
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

      // Helper function to update status
      const updateStatus = (status) => {
        response_data.question_states[question_index] = status;
        if (status_element) {
          status_element.querySelector('.status-text').textContent = status;
        }
      };

      // Helper function to lock/unlock AI response textarea
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
        setTimeout(() => {
          this.generateAIResponse(question_index, '', trial, response_data, ai_loading, ai_response, updateStatus);
        }, 100);
      }

      // Basic input validation and AI button enabling
      if (input_element && !trial.hide_user_input) {
        input_element.addEventListener('input', () => {
          const hasContent = input_element.value.trim() !== '';
          if (ai_button) {
            ai_button.disabled = !hasContent;
            ai_button.textContent = hasContent ? 'Send to AI' : 'Enter text first';
          }
        });
      }

      // Basic AI submission button
      if (ai_button && trial.base_url && trial.api_key) {
        ai_button.addEventListener('click', async () => {
          const user_input = trial.hide_user_input ? '' : input_element.value.trim();
          if (!trial.hide_user_input && !user_input) return;

          response_data.button_interactions[question_index].push({
            action: 'ai_submit',
            timestamp: Date.now()
          });

          await this.generateAIResponse(question_index, user_input, trial, response_data, ai_loading, ai_response, updateStatus);
          
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
        
        // Confirm button - locks the response
        if (confirm_button) {
          confirm_button.addEventListener('click', () => {
            response_data.button_interactions[question_index].push({
              action: 'confirm',
              timestamp: Date.now()
            });
            
            updateStatus('confirmed');
            setResponseLocked(trial.button_config.confirm_locks);
            
            confirm_button.disabled = true;
            confirm_button.textContent = 'Confirmed';
            
            if (edit_button) edit_button.disabled = false;
          });
        }
        
        // Regenerate button - generates new AI response
        if (regenerate_button) {
          regenerate_button.addEventListener('click', async () => {
            response_data.button_interactions[question_index].push({
              action: 'regenerate',
              timestamp: Date.now()
            });
            
            const user_input = trial.hide_user_input ? '' : input_element.value.trim();
            await this.generateAIResponse(question_index, user_input, trial, response_data, ai_loading, ai_response, updateStatus);
            
            // Reset confirm button if response was locked
            if (confirm_button && trial.button_config.confirm_locks) {
              confirm_button.disabled = false;
              confirm_button.textContent = 'Confirm';
              setResponseLocked(false);
            }
          });
        }
        
        // Edit button - unlocks the response for editing
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
              confirm_button.textContent = 'Confirm';
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

    // Handle form submission with enhanced data collection
    display_element.querySelector('#jspsych-survey-text-llm-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const end_time = performance.now();
      const total_response_time = end_time - trial_start_time;

      // Collect all responses with validation
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

      // Prepare comprehensive trial data
      const trial_data = {
        response: response_data.responses,
        rt: total_response_time,
        question_order: question_order,
        ai_response: response_data.ai_responses,
        ai_rt: response_data.ai_response_times,
        ai_interactions: response_data.ai_interactions,
        question_states: response_data.question_states,
        button_interactions: response_data.button_interactions,
        collected_context: response_data.collected_context,
        llm_model: response_data.llm_model,
        api_config: response_data.api_config,
        trial_type: 'survey-text-llm',
        timestamp: new Date().toISOString(),
        advanced_mode: trial.enable_advanced_buttons,
        hide_user_input: trial.hide_user_input,
        auto_generated: trial.auto_generate
      };

      // Clear display and finish trial
      display_element.innerHTML = '';
      this.jsPsych.finishTrial(trial_data);
    });
  }

  /**
   * Helper method to generate AI response
   */
  async generateAIResponse(question_index, user_input, trial, response_data, ai_loading, ai_response, updateStatus) {
    const ai_start_time = performance.now();
    response_data.ai_interactions[question_index]++;
    
    // Show loading state
    updateStatus('generating');
    if (ai_loading) ai_loading.style.display = 'block';
    if (ai_response) ai_response.value = '';

    try {
      // Build context with collected data and user input
      let context_input = user_input;
      if (response_data.collected_context) {
        context_input = this.buildContextualInput(user_input, response_data.collected_context, question_index);
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
   * Build contextual input combining user input with collected data
   */
  buildContextualInput(user_input, collected_context, question_index) {
    if (!collected_context) return user_input;
    
    let contextual_input = '';
    
    // Add context information
    if (typeof collected_context === 'object') {
      contextual_input += 'Previous experiment data:\n';
      if (collected_context.responses) {
        contextual_input += `Previous responses: ${JSON.stringify(collected_context.responses)}\n`;
      }
      if (collected_context.trials) {
        contextual_input += `Trial history: ${JSON.stringify(collected_context.trials)}\n`;
      }
      if (collected_context.custom) {
        contextual_input += `Additional context: ${JSON.stringify(collected_context.custom)}\n`;
      }
      contextual_input += '\n';
    }
    
    // Add current user input
    if (user_input) {
      contextual_input += `Current response: ${user_input}`;
    } else {
      contextual_input += 'Please provide a response based on the previous experiment data.';
    }
    
    return contextual_input;
  }

  /**
   * Make API request to AI service with enhanced error handling
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
      stream: false // Ensure we get complete responses
    };

    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), trial.api_timeout);

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
      
      // Re-throw with more context
      throw new Error(`AI API Error: ${error.message}`);
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
  module.exports = jsPsychSurveyTextLLM;
} else if (typeof window !== 'undefined') {
  window.jsPsychSurveyTextLLM = jsPsychSurveyTextLLM;
}
