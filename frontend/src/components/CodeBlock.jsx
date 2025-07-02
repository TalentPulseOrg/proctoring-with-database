import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ code, language = 'javascript' }) => {
  if (!code) return null;

  // Parse language and code from the code string if it contains language info
  let actualLanguage = language;
  let actualCode = code;

  if (typeof code === 'string' && code.includes('\n')) {
    const lines = code.split('\n');
    const firstLine = lines[0].trim().toLowerCase();
    
    // Check if first line contains a language identifier
    const supportedLanguages = [
      'javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 
      'ruby', 'go', 'rust', 'typescript', 'html', 'css', 'sql', 
      'bash', 'shell', 'json', 'xml', 'yaml'
    ];
    
    if (supportedLanguages.includes(firstLine)) {
      actualLanguage = firstLine;
      actualCode = lines.slice(1).join('\n');
    }
  }

  // Map some common language aliases
  const languageMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'cpp': 'cpp',
    'c++': 'cpp',
    'cs': 'csharp',
    'c#': 'csharp',
    'sh': 'bash',
    'yml': 'yaml'
  };

  const mappedLanguage = languageMap[actualLanguage] || actualLanguage;

  return (
    <div className="code-block-container my-4">
      <div className="bg-gray-800 text-gray-200 px-3 py-1 text-sm font-mono rounded-t-md border-b border-gray-600">
        <span className="text-blue-400">{mappedLanguage.toUpperCase()}</span>
      </div>
      <div className="rounded-b-md overflow-hidden border border-gray-300">
        <SyntaxHighlighter
          language={mappedLanguage}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
        >
          {actualCode.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
