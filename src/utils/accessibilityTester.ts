import axe, { AxeResults, Result, RunOptions } from 'axe-core';
import { parse } from 'node-html-parser';
import type { TestResult, AccessibilityIssue } from '../types';
import { addLegislationRefs } from './legislationMapper';
import { getWCAGInfo } from './wcagHelper';
import Color from 'color';

// Configure axe-core rules based on selected region
function getAxeConfig(region: string): RunOptions {
  const baseConfig: RunOptions = {
    rules: {
      // Core WCAG 2.1 Rules
      'color-contrast': { enabled: true },
      'image-alt': { enabled: true },
      'link-name': { enabled: true },
      'list': { enabled: true },
      'listitem': { enabled: true },
      'heading-order': { enabled: true },
      'label': { enabled: true },
      // Language Rules
      'frame-title': { enabled: true },
      'html-lang-valid': { enabled: true },
      'html-has-lang': { enabled: true },
      'valid-lang': { enabled: true },
      'region': { enabled: true },
      'page-has-heading-one': { enabled: true },
      'landmark-one-main': { enabled: true },
      'landmark-banner-is-top-level': { enabled: true },
      'landmark-complementary-is-top-level': { enabled: true },
      'landmark-no-duplicate-banner': { enabled: true },
      'button-name': { enabled: true },
      'aria-roles': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'aria-hidden-body': { enabled: true },
      'document-title': { enabled: true }
    },
    resultTypes: ['violations', 'passes', 'incomplete'],
    reporter: 'v2',
    iframes: true,
    elementRef: true,
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
    }
  };

  return baseConfig;
}

// Color contrast utilities
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(value => {
    value /= 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return rs * 0.2126 + gs * 0.7152 + bs * 0.0722;
}

function getContrastRatio(color1: string, color2: string): number {
  // Convert hex/rgb colors to RGB values
  const getRGB = (color: string) => {
    const hex = color.startsWith('#') ? color : '#000000';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const c1 = getRGB(color1);
  const c2 = getRGB(color2);

  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Get effective background color considering opacity and parent elements
function getEffectiveBackground(element: HTMLElement): string {
  let background = getComputedStyle(element).backgroundColor;
  let currentElement: HTMLElement | null = element;
  let opacity = 1;

  while ((background === 'transparent' || background === 'rgba(0, 0, 0, 0)') && currentElement.parentElement) {
    currentElement = currentElement.parentElement;
    const style = getComputedStyle(currentElement);
    background = style.backgroundColor;
    opacity *= parseFloat(style.opacity) || 1;
  }

  // If no background color is found, default to white
  if (background === 'transparent' || background === 'rgba(0, 0, 0, 0)') {
    return '#FFFFFF';
  }

  // Apply opacity to background color
  if (opacity < 1) {
    const color = Color(background);
    return color.alpha(opacity).toString();
  }

  return background;
}

function mapAxeImpactLevel(impact: string | undefined): 'critical' | 'serious' | 'moderate' | 'minor' {
  switch (impact) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'serious';
    case 'moderate':
      return 'moderate';
    default:
      return 'minor';
  }
}

function convertAxeResultToIssue(result: Result): AccessibilityIssue {
  const nodes = result.nodes.map(node => {
    let html = node.html;
    
    // Add color information for contrast issues
    if (result.id === 'color-contrast' && node.target && node.target[0]) {
      const target = node.target[0];
      const failureSummary = node.failureSummary || '';
      const contrastInfo = failureSummary.match(/contrast ratio is (\d+(\.\d+)?):1/);
      const ratio = contrastInfo ? contrastInfo[1] : 'unknown';
      
      html = `${html}\nContrast Ratio: ${ratio}:1\nElement: ${target}`;
    }
    
    return html;
  });

  // Get WCAG criteria from the result
  const wcagCriteria = result.tags
    .filter(tag => /wcag\d{3}/.test(tag))
    .map(tag => tag.toUpperCase());

  // Get WCAG info for the issue
  const wcagInfo = getWCAGInfo(result.id);

  return {
    id: result.id,
    impact: mapAxeImpactLevel(result.impact),
    description: result.help,
    helpUrl: result.helpUrl,
    nodes,
    wcagCriteria,
    autoFixable: result.id === 'color-contrast' || result.id === 'image-alt' || result.id === 'button-name',
    fixSuggestion: wcagInfo?.suggestedFix || result.help,
    codeExample: wcagInfo?.codeExample,
    legislationRefs: wcagInfo?.legislationRefs
  };
}

async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 AccessibilityChecker/1.0'
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  const corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://proxy.cors.sh/',
    'https://cors-anywhere.herokuapp.com/'
  ];

  // Try direct fetch first
  try {
    const response = await fetchWithTimeout(url);
    if (response.ok) return response;
  } catch (error) {
    console.warn('Direct fetch failed, trying proxies:', error);
  }

  // Try each proxy with retries
  for (const proxy of corsProxies) {
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await fetchWithTimeout(proxyUrl);
        if (response.ok) return response;
      } catch (error) {
        console.warn(`Proxy ${proxy} attempt ${retry + 1} failed:`, error);
        if (retry < maxRetries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
        }
      }
    }
  }

  throw new Error(
    'Failed to access the website. This could be due to:\n' +
    '• The website blocking automated access\n' +
    '• Invalid URL format\n' +
    '• Website is currently offline\n' +
    '• CORS restrictions\n\n' +
    'Please verify the URL and try again. If the problem persists, you may need to test the site locally.'
  );
}

// Check color contrast for all text elements
async function checkColorContrast(container: HTMLElement): Promise<AccessibilityIssue[]> {
  const issues: AccessibilityIssue[] = [];
  const textElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li, td, th, label, button');

  textElements.forEach(element => {
    const style = getComputedStyle(element as HTMLElement);
    const color = style.color;
    const backgroundColor = getEffectiveBackground(element as HTMLElement);

    // Check if text is "large" according to WCAG
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight);
    const isLargeText = fontSize >= 18.66 || (fontSize >= 14 && fontWeight >= 700);

    const ratio = getContrastRatio(color, backgroundColor);
    const requiredRatio = isLargeText ? 3 : 4.5;

    if (ratio < requiredRatio) {
      issues.push({
        id: 'color-contrast',
        impact: 'serious',
        description: `Insufficient color contrast ratio. Element "${(element as HTMLElement).innerText}" has a contrast ratio of ${ratio}:1 (required: ${requiredRatio}:1)`,
        nodes: [(element as HTMLElement).outerHTML],
        wcagCriteria: ['1.4.3']
      });
    }
  });

  return issues;
}

export async function testAccessibility(url: string, region: string = 'global'): Promise<TestResult> {
  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('Please enter a valid URL (e.g., https://example.com)');
  }

  // Create container for testing
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '1024px';
  container.style.height = '768px';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  try {
    // Fetch and parse HTML
    const response = await fetchWithRetry(url);
    const html = await response.text();
    
    if (!html.trim()) {
      throw new Error('The website returned an empty response');
    }

    // Parse and inject HTML
    const root = parse(html);
    container.innerHTML = root.toString();

    // Run accessibility tests
    const axeResults = await axe.run(container, getAxeConfig(region));
    console.log('Axe Results:', axeResults);

    // Process axe results
    const issues = axeResults.violations.map(convertAxeResultToIssue);
    const passes = axeResults.passes.map(convertAxeResultToIssue);
    const warnings = axeResults.incomplete.map(convertAxeResultToIssue);

    // Add color contrast issues
    const contrastIssues = axeResults.violations
      .filter(v => v.id === 'color-contrast')
      .map(v => v.nodes)
      .flat()
      .map(node => ({
        id: 'color-contrast',
        impact: 'serious' as const,
        description: `Insufficient color contrast ratio. Element "${node.html}" has a contrast ratio less than 4.5:1 for normal text or 3:1 for large text.`,
        nodes: [node.html],
        wcagCriteria: ['1.4.3']
      }));

    const summary = {
      critical: issues.filter(i => i.impact === 'critical').length,
      serious: issues.filter(i => i.impact === 'serious').length,
      moderate: issues.filter(i => i.impact === 'moderate').length,
      minor: issues.filter(i => i.impact === 'minor').length,
      passes: passes.length,
      warnings: warnings.length
    };

    const testResults: TestResult = {
      url,
      timestamp: new Date().toISOString(),
      issues,
      passes,
      warnings,
      summary
    };

    return addLegislationRefs(testResults);

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('The request timed out. Please try again.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred while testing the website.');
  } finally {
    // Clean up
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}