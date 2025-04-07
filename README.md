# NL2Page - Natural Language to Web Page

NL2Page is a web application that transforms natural language commands into working web pages using HTML, CSS, and vanilla JavaScript. It allows users to describe the web page they want to create in plain English, and the application generates the corresponding code.

## Features

- **Natural Language Input**: Describe the web page you want to create in plain English
- **Real-time Preview**: See the generated web page in real-time
- **Chat History**: Keep track of your conversation with the AI to make iterative changes
- **Code Viewing**: View the generated HTML, CSS, and JavaScript code
- **Modification Support**: Modify your existing web page by describing the changes you want to make

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **API**: OpenAI GPT-4o for natural language processing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies for both the client and server:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

1. Start the server:

```bash
cd server
npm start
```

2. In a separate terminal, start the client:

```bash
cd client
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter a description of the web page you want to create in the text area on the right side
2. Click "Generate Page" to create your web page
3. View the generated web page in the preview area on the left
4. To make changes, enter a description of the modifications you want and click "Modify Page"
5. To view the generated code, click "Show Code"
6. To start a new session, click "New Session" in the header

## Examples

Here are some example prompts you can try:

- "Create a landing page for a coffee shop with a hero section, menu, and contact form"
- "Build a personal portfolio with a header, about me section, skills, and projects"
- "Make a product page for a smartphone with an image gallery, specifications, and buy now button"

## License

This project is licensed under the MIT License - see the LICENSE file for details. 