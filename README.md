# HCI Memory-Fidelity Visual Novel

A complete HTML/CSS/JavaScript implementation of a visual novel game that tests how AI character memory accuracy influences user perception. This research tool now features **dynamic LLM-driven AI characters** with real-time OpenAI API integration for truly personalized conversations.

## Overview

This application implements a controlled experiment comparing user perceptions of two AI characters:
- **Character A**: Perfect memory recall (100% accuracy)
- **Character B**: Impaired memory (~50% accuracy, max 3 errors)

**🆕 LLM Integration**: The application now supports real OpenAI GPT-4 API calls for dynamic, context-aware AI responses while maintaining experimental validity through proper controls and fallback systems.

Users interact with one randomly assigned character through a structured conversation, followed by a memory quiz and rating scales.

## Features

### Core Functionality
- **Dual-mode operation** - LLM-driven responses or offline fallback
- **Target duration**: 10-20 minutes per session
- **Random character assignment** - 50% chance of each character type
- **Blinded experimental design** - Players unaware of character type
- **Comprehensive data logging** - Full interaction tracking for research

### 🤖 LLM Integration Features
- **OpenAI GPT-4 API support** - Real-time dynamic responses
- **Memory fidelity testing** - Character B implements controlled memory errors
- **Structured prompt system** - [THOUGHT] and [RESPONSE] format as specified
- **Context management** - Full dialogue history with fact tracking
- **Fallback system** - Graceful degradation to offline mode
- **Debug mode** - View AI reasoning process for research

### Game Flow
1. **Introduction Phase**: AI collects 6 personal facts from player
2. **Quiz Phase**: AI tests its memory with 4 multiple-choice questions  
3. **Rating Phase**: Player rates AI on human-likeness and desirability scales
4. **Data Export**: Complete session data available for download

### Technical Implementation
- **Memory impairment system** with controlled error generation
- **Parity controls** ensuring length/timing consistency between characters
- **Responsive design** supporting mouse/touch input
- **Cross-browser compatibility** with vanilla HTML/CSS/JavaScript

## 🚀 Setup and Usage

### Quick Start (Offline Mode)
1. Open `index.html` in any modern web browser
2. No server setup required - fully offline capable
3. Session begins automatically with random character assignment

### 🔑 API Setup (LLM Mode)
1. **Get OpenAI API Key**:
   - Visit [OpenAI API](https://platform.openai.com/api-keys)
   - Create an account and generate an API key
   - Ensure you have available credits/usage quota

2. **Configure API Access**:
   
   **API Key Setup**:
   - Create an `api-key.txt` file in the project root
   - Add your OpenAI API key directly to this file (no formatting needed)
   - The application will automatically load it on startup
   
   **Settings UI (Limited)**:
   - Open the application in your browser
   - Click the **⚙️ Settings** button in the header
   - API key entry is disabled - managed through api-key.txt file
   - View API key status and validation results
   - Select your preferred model (GPT-4 recommended)
   - Settings are limited when using api-key.txt file
   
   **API Key Management**: api-key.txt file is the only supported method.

3. **Security Notice**: 
   - ⚠️ API key is stored in api-key.txt file and sent directly to OpenAI (client-side only)
   - Manual API key entry is disabled for security
   - api-key.txt file method provides better security and deployment control
   - Never share your API key or use on untrusted devices
   - Consider using a separate API key for research purposes

### Configuration Options

**API Settings**:
- **Model Selection**: GPT-4, GPT-4 Turbo, or GPT-3.5 Turbo
- **Online/Offline Toggle**: Switch between LLM and static responses
- **Debug Mode**: Show AI [THOUGHT] processes for research analysis
- **Usage Tracking**: Monitor API requests and estimated costs

**Research Controls**:
- **Character Type**: Automatically randomized (A or B)
- **Memory Errors**: Max 3 controlled errors for Character B
- **Response Parity**: ±5 token length consistency maintained
- **Context Management**: Full dialogue history with fact extraction

### For Researchers
- Session data exported as structured JSON
- Includes all dialogue, timing, accuracy metrics, and ratings
- **NEW**: LLM metadata including reasoning traces and API usage
- Template available in `data/log_template.json`

## File Structure

```
├── index.html          # Main application interface
├── style.css           # Responsive styling and layout
├── script.js           # Enhanced game engine with LLM integration
├── config/
│   ├── flags.js         # Configuration and randomization
│   ├── env-loader.js    # 🆕 API key loader for api-key.txt support
│   └── api.js           # 🆕 LLM API client and management
├── prompts/
│   ├── templates.js    # 🆕 LLM prompt templates and parsing
│   ├── companion_A.txt # Perfect memory character profile
│   └── companion_B.txt # Impaired memory character profile  
├── data/
│   └── log_template.json # Data export template
└── scenes/
    ├── scene_intro.txt  # Introduction phase documentation
    ├── scene_quiz.txt   # Quiz phase documentation
    └── scene_outro.txt  # Rating phase documentation
```

## Experimental Design

### Character Differentiation
- **Character A**: Perfect recall, artificial latency for parity
- **Character B**: Memory errors via fact dropout/masking, natural timing

### 🧠 LLM Memory Implementation
- **Context Filtering**: Character B receives masked/dropped facts
- **Error Types**: Confident-wrong vs hedged responses  
- **Randomization**: 3 random facts selected for forgetting
- **Consistency**: Character personalities identical across types

### Controls
- Identical personality and helpfulness across characters
- Response length parity (±5 tokens)
- Blinded participant experience  
- Randomized character assignment per session
- **NEW**: Token-level response monitoring and adjustment

### Data Collection
- Complete dialogue transcripts with timestamps
- Memory accuracy metrics (correct/incorrect responses)
- User ratings on 7-point Likert scales
- Session duration and interaction patterns
- **NEW**: LLM reasoning traces and API usage statistics

## 🔬 Research Applications

This tool is designed for HCI research investigating:
- Impact of AI memory accuracy on user trust
- Perception of AI human-likeness  
- Factors affecting willingness to interact with AI systems
- Memory as a component of AI believability
- **NEW**: LLM reasoning transparency and user perception
- **NEW**: Dynamic vs static response effectiveness

## API Cost Estimation

**Approximate costs per session**:
- **GPT-4**: $0.10 - $0.30 per complete session
- **GPT-3.5 Turbo**: $0.02 - $0.05 per complete session
- **Session length**: 10-20 turns, ~1000-3000 tokens total

**Cost optimization**:
- Use GPT-3.5 Turbo for preliminary testing
- Enable offline mode to avoid API costs during development
- Monitor usage through the built-in tracking system

## Browser Compatibility

Tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

**API Issues**:
- ❌ **Connection Failed**: Check API key and internet connection
- ❌ **Rate Limits**: Built-in rate limiting prevents most issues
- ❌ **Quota Exceeded**: Check OpenAI account billing and usage
- ✅ **Automatic Fallback**: Application continues offline if API fails

**Debug Mode**:
- Enable in Settings to see AI reasoning processes
- Use for understanding character behavior differences
- Helpful for research validation and analysis

## License

This implementation is provided for research and educational purposes.

## Screenshots

![Initial Application](https://github.com/user-attachments/assets/e366ca1c-fd75-4e8a-bc59-d58cd04c6c96)
*Enhanced interface with LLM integration - conversation flows naturally*

![LLM Settings Interface](https://github.com/user-attachments/assets/80860681-f11e-4d45-adf9-badbbc3f8cae)
*Comprehensive API configuration with security warnings and usage tracking*

![Rating Phase](https://github.com/user-attachments/assets/72f797df-968c-486c-bbcb-d93cc943ca54)
*Rating phase - 7-point Likert scales for human-likeness assessment*

![Completion](https://github.com/user-attachments/assets/569c3cbb-ba81-4630-853b-5d141628abe8)
*Session completion with comprehensive data export functionality*