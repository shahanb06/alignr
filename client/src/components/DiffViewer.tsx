import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface Props {
  original: string;
  tailored: string;
}

// PDF-extracted resumes often contain pure-divider lines ("_______" / "-------")
// and 3+ space runs from two-column layouts. The tailor model strips or
// reformats these, leaving orphans on the original side that render as large
// empty rose blocks. Normalize both sides identically so the diff stays aligned.
function normalizeForDiff(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .split('\n')
    .filter((line) => !/^\s*[_\-=*]{5,}\s*$/.test(line))
    .map((line) => line.replace(/ {3,}/g, ' '))
    .join('\n');
}

// Quiet, GitHub-ish palette. We do not use the library's "dark" theme.
const styles = {
  variables: {
    light: {
      diffViewerBackground: '#ffffff',
      diffViewerColor: '#18181b',
      addedBackground: '#ecfdf5',
      addedColor: '#0a3622',
      removedBackground: '#fff1f2',
      removedColor: '#67060c',
      wordAddedBackground: '#d1fae5',
      wordRemovedBackground: '#ffe4e6',
      addedGutterBackground: '#d1fae5',
      removedGutterBackground: '#ffe4e6',
      gutterBackground: '#fafafa',
      gutterBackgroundDark: '#f4f4f5',
      highlightBackground: '#fff8c5',
      highlightGutterBackground: '#ffe680',
      codeFoldGutterBackground: '#fafafa',
      codeFoldBackground: '#f4f4f5',
      emptyLineBackground: '#fafafa',
      gutterColor: '#71717a',
      addedGutterColor: '#0a3622',
      removedGutterColor: '#67060c',
      codeFoldContentColor: '#52525b',
      diffViewerTitleBackground: '#fafafa',
      diffViewerTitleColor: '#3f3f46',
      diffViewerTitleBorderColor: '#e4e4e7',
    },
  },
  contentText: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
};

export default function DiffViewer({ original, tailored }: Props) {
  return (
    <div className="diff-shell overflow-hidden rounded-lg border border-ink-200">
      <ReactDiffViewer
        oldValue={normalizeForDiff(original)}
        newValue={normalizeForDiff(tailored)}
        splitView
        useDarkTheme={false}
        compareMethod={DiffMethod.WORDS}
        leftTitle="Original resume"
        rightTitle="Tailored resume"
        styles={styles}
      />
    </div>
  );
}
