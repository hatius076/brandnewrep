# HCI Memory-Fidelity Visual Novel

A complete HTML/CSS/JavaScript implementation of a visual novel game that tests how AI character memory accuracy influences user perception. This is a research tool designed for human-computer interaction studies.

## Overview

This application implements a controlled experiment comparing user perceptions of two AI characters:
- **Character A**: Perfect memory recall (100% accuracy)
- **Character B**: Impaired memory (~50% accuracy, max 3 errors)

Users interact with one randomly assigned character through a structured conversation, followed by a memory quiz and rating scales.

## Features

### Core Functionality
- **Single-page offline application** - No network dependencies required
- **Target duration**: 10-20 minutes per session
- **Random character assignment** - 50% chance of each character type
- **Blinded experimental design** - Players unaware of character type
- **Comprehensive data logging** - Full interaction tracking for research

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

## Usage

### Running the Application
1. Open `index.html` in any modern web browser
2. No server setup required - fully offline capable
3. Session begins automatically with random character assignment

### For Researchers
- Session data exported as structured JSON
- Includes all dialogue, timing, accuracy metrics, and ratings
- Template available in `data/log_template.json`

## File Structure

```
├── index.html          # Main application interface
├── style.css           # Responsive styling and layout
├── script.js           # Game engine and logic
├── config/
│   └── flags.js        # Configuration and randomization
├── data/
│   └── log_template.json # Data export template
├── scenes/
│   ├── scene_intro.txt  # Introduction phase documentation
│   ├── scene_quiz.txt   # Quiz phase documentation
│   └── scene_outro.txt  # Rating phase documentation
└── prompts/
    ├── companion_A.txt  # Perfect memory character profile
    └── companion_B.txt  # Impaired memory character profile
```

## Experimental Design

### Character Differentiation
- **Character A**: Perfect recall, artificial latency for parity
- **Character B**: Memory errors via fact dropout/masking, natural timing

### Controls
- Identical personality and helpfulness across characters
- Response length parity (±5 tokens)
- Blinded participant experience
- Randomized character assignment per session

### Data Collection
- Complete dialogue transcripts with timestamps
- Memory accuracy metrics (correct/incorrect responses)
- User ratings on 7-point Likert scales
- Session duration and interaction patterns

## Research Applications

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

## License

This implementation is provided for research and educational purposes.

## Screenshots

![Introduction Phase](https://github.com/user-attachments/assets/23205f18-33ed-4338-8838-ee198b48cd2f)
*Introduction phase - AI collecting personal facts from user*

![Rating Phase](https://github.com/user-attachments/assets/72f797df-968c-486c-bbcb-d93cc943ca54)
*Rating phase - 7-point Likert scales for human-likeness assessment*

![Completion](https://github.com/user-attachments/assets/569c3cbb-ba81-4630-853b-5d141628abe8)
*Session completion with comprehensive data export functionality*