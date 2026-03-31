import React from 'react';
import { InlineMath as KaInlineMath, BlockMath as KaBlockMath } from 'react-katex';

type MathProps = {
  math: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
  variant?: 'title' | 'body';
};

const normalizeLatex = (input: string) => {
  // Collapse escaped backslashes so both "\\mathrm" and "\mathrm" work
  const collapsed = input.replace(/\\\\/g, '\\');
  return collapsed;
};

const toPlainText = (latex: string) => {
  const plain = latex
    .replace(/\\mathrm\{Fed\\text\{-\}e\^3\}/g, 'Fed-e3')
    .replace(/\\mathrm\{Fed4Fed\}/g, 'Fed4Fed')
    .replace(/D\^3\\mathrm\{EM\}/g, 'D3EM')
    .replace(/D\^3EM/g, 'D3EM')
    .replace(/\\rho(_\{[A-Za-z]+\})?/g, 'rho')
    .replace(/\\text\{-\}/g, '-')
    .replace(/[\\{}]/g, '');
  return plain || latex;
};

const safeRender = (node: React.ReactElement, latex: string, props: MathProps): React.ReactElement => {
  try {
    return node;
  } catch (err) {
    const fallback = toPlainText(latex);
    return (
      <span className={props.className} aria-label={props.ariaLabel || fallback} title={props.title || fallback}>
        {fallback}
      </span>
    );
  }
};

export const InlineMath: React.FC<MathProps> = (props) => {
  const latex = normalizeLatex(props.math);
  const fallback = toPlainText(latex);
  const combinedClass = `${props.className || ''} ${props.variant === 'title' ? 'math-title' : ''}`.trim();
  return safeRender(
    <KaInlineMath
      math={latex}
      className={combinedClass || undefined}
      renderError={() => (
        <span aria-label={props.ariaLabel || fallback} title={props.title || fallback}>
          {fallback}
        </span>
      )}
    />,
    latex,
    props
  );
};

export const BlockMath: React.FC<MathProps> = (props) => {
  const latex = normalizeLatex(props.math);
  const fallback = toPlainText(latex);
  const combinedClass = `${props.className || ''} ${props.variant === 'title' ? 'math-title' : ''}`.trim();
  return safeRender(
    <KaBlockMath
      math={latex}
      className={combinedClass || undefined}
      renderError={() => (
        <div aria-label={props.ariaLabel || fallback} title={props.title || fallback}>
          {fallback}
        </div>
      )}
    />,
    latex,
    props
  );
};

export default InlineMath;
