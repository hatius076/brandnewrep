# HCI Memory-Fidelity Visual Novel

A complete HTML/CSS/JavaScript implementation of a visual novel game that tests how AI character memory accuracy influences user perception. This research tool features **simple .env file API key management** for easy setup and deployment.

## Overview

This application implements a controlled experiment comparing user perceptions of two AI characters:
- **Character A**: Perfect memory recall (100% accuracy)
- **Character B**: Impaired memory (~50% accuracy, max 3 errors)

Users interact with one randomly assigned character through a structured conversation, followed by a memory quiz and rating scales.

## 🚀 Quick Setup

### 1. Get OpenAI API Key
- Visit [OpenAI API](https://platform.openai.com/api-keys)
- Create an account and generate an API key
- Ensure you have available credits/usage quota

### 2. Create .env File
1. Copy the template: `cp .env.template .env`
2. Edit the `.env` file and add your API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Run the Application
- **Development**: Use any local server (Python, Node.js, etc.)
  ```bash
  python3 -m http.server 8000
  # or
  npx serve .
  ```
- **Production**: Deploy to any static hosting service

### 4. Start Session
- Open the application in your browser
- The conversation will start automatically if the API key is found
- No manual configuration or settings required!

## Features

### Core Functionality
- **Target duration**: 10-20 minutes per session
- **Random character assignment** - 50% chance of each character type
- **Blinded experimental design** - Players unaware of character type
- **Comprehensive data logging** - Full interaction tracking for research
- **Simple .env file setup** - No complex encryption or UI needed

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
- **Environment variable support** for API key management

## Error Handling

### Without .env File:
![Error State](https://github.com/user-attachments/assets/84913112-6624-46cc-89a6-45e87a398d23)

Clear instructions guide users to create the .env file with their API key.

### With .env File:
- System loads key automatically
- Conversation starts immediately
- No prompts or setup screens needed

## For Sharing

When sharing the application:
1. Share the code without the .env file (automatically excluded by .gitignore)
2. Recipients create their own .env file with their API key
3. No encryption or complex setup needed
4. Each user manages their own API costs

## File Structure

```
├── index.html          # Main application interface
├── style.css           # Responsive styling and layout
├── script.js           # Simplified game engine with .env API key loading
├── config/
│   └── flags.js        # Configuration and randomization
├── .env.template       # Template for API key setup
├── .env               # Your API key (excluded from git)
├── .gitignore         # Excludes .env files from version control
└── data/
    └── log_template.json # Data export template
```

## API Cost Estimation

**Approximate costs per session**:
- **GPT-3.5 Turbo**: $0.02 - $0.05 per complete session
- **Session length**: 10-20 turns, ~1000-3000 tokens total

## Experimental Design

### Character Differentiation
- **Character A**: Perfect recall, artificial latency for parity
- **Character B**: Memory errors via fact dropout/masking, natural timing

### Controls
- Identical personality and helpfulness across characters
- Response length parity maintained
- Blinded participant experience  
- Randomized character assignment per session

### Data Collection
- Complete dialogue transcripts with timestamps
- Memory accuracy metrics (correct/incorrect responses)
- User ratings on 7-point Likert scales
- Session duration and interaction patterns

## 🔬 Research Applications

This tool is designed for HCI research investigating:
- Impact of AI memory accuracy on user trust
- Perception of AI human-likeness  
- Factors affecting willingness to interact with AI systems
- Memory as a component of AI believability

## Browser Compatibility

Tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

**API Issues**:
- ❌ **No API Key**: Create .env file with OPENAI_API_KEY=your_key
- ❌ **Invalid Key**: Check your API key format and OpenAI account status
- ❌ **Quota Exceeded**: Check OpenAI account billing and usage
- ✅ **Automatic Error Messages**: Clear instructions guide users to solutions

## License

This implementation is provided for research and educational purposes.