const getBacktickRunLength = (value: string, start: number): number => {
  let end = start;
  while (value[end] === "`") end++;
  return end - start;
};

const isEscaped = (value: string, index: number): boolean => {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
};

const normalizeLineDelimiters = (line: string): string => {
  let result = "";
  let codeDelimiterLength = 0;

  for (let index = 0; index < line.length; ) {
    if (line[index] === "`") {
      const runLength = getBacktickRunLength(line, index);
      if (codeDelimiterLength === 0) {
        codeDelimiterLength = runLength;
      } else if (codeDelimiterLength === runLength) {
        codeDelimiterLength = 0;
      }
      result += line.slice(index, index + runLength);
      index += runLength;
      continue;
    }

    if (codeDelimiterLength === 0 && line[index] === "\\" && !isEscaped(line, index)) {
      const delimiter = line.slice(index, index + 2);
      if (delimiter === "\\(" || delimiter === "\\)") {
        result += "$";
        index += 2;
        continue;
      }
      if (delimiter === "\\[" || delimiter === "\\]") {
        result += "$$";
        index += 2;
        continue;
      }
    }

    result += line[index];
    index++;
  }
  return result;
};

/**
 * remark-math understands dollar delimiters. Normalize the common LaTeX
 * \(...\) and \[...\] forms while leaving inline and fenced code untouched.
 */
export const normalizeMathDelimiters = (content: string): string => {
  let fence: { character: string; length: number } | undefined;

  return content
    .split("\n")
    .map((line) => {
      const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (fenceMatch && fenceMatch[1][0] === fence.character && fenceMatch[1].length >= fence.length) {
          fence = undefined;
        }
        return line;
      }

      if (fenceMatch) {
        fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
        return line;
      }
      return normalizeLineDelimiters(line);
    })
    .join("\n");
};
