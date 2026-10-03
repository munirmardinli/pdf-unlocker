'use client';

import { FormEvent, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';

type Article = {
  title: string;
  author: string;
  date: string;
  description: string;
  content: string;
  sourceUrl: string;
};

type ReaderResponse = {
  title?: string;
  content?: string;
  url?: string;
};

const BLOCKED_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'form',
  'nav',
  'footer',
  'header',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  '.cookie',
  '.cookies',
  '.cookie-banner',
  '.cookie-consent',
  '.consent',
  '.gdpr',
  '.newsletter',
  '.advert',
  '.advertisement',
  '.ads',
  '.ad',
  '.social',
  '.share',
  '.comments',
  '.comment',
  '.related',
  '.recommended',
];

const NOISE_WORDS = [
  'cookie',
  'cookies',
  'consent',
  'newsletter',
  'advertisement',
  'advertising',
  'sponsored',
  'share',
  'social',
  'comments',
  'comment',
  'related',
  'recommended',
  'subscribe',
  'sign in',
  'login',
  'navigation',
];

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function formatReadableDate(value: string): string {
  if (!value) return '';

  const trimmed = value.trim();

  if (!trimmed) return '';

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function absoluteUrl(url: string, base: string): string {
  try {
    const parsed = new URL(url, base);
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.href
      : '';
  } catch {
    return '';
  }
}

function isVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      /\.(mp4|m4v|webm|ogv|mov|m3u8)$/i.test(url.pathname) ||
      /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)vimeo\.com$|(^|\.)dailymotion\.com$|(^|\.)tiktok\.com$/i.test(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}

function canonicalMediaUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (
      (host === 'youtube.com' ||
        host === 'www.youtube.com' ||
        host === 'www.youtube-nocookie.com') &&
      url.pathname.startsWith('/embed/')
    ) {
      const videoId = url.pathname.split('/')[2];
      if (videoId) {
        return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      }
    }

    if (host === 'player.vimeo.com' && url.pathname.startsWith('/video/')) {
      const videoId = url.pathname.split('/')[2];
      if (videoId) return `https://vimeo.com/${encodeURIComponent(videoId)}`;
    }

    return url.href;
  } catch {
    return value;
  }
}

function createMediaLink(
  document: Document,
  url: string,
  label: string,
  poster = '',
  caption = ''
): HTMLElement | null {
  const safeUrl = absoluteUrl(
    canonicalMediaUrl(url),
    document.baseURI
  );
  if (!safeUrl) return null;

  const figure = document.createElement('figure');
  const link = document.createElement('a');
  const imageUrl = poster
    ? absoluteUrl(poster, document.baseURI)
    : '';

  link.setAttribute('href', safeUrl);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  link.setAttribute('aria-label', `${label}: ${safeUrl}`);

  if (imageUrl) {
    const image = document.createElement('img');
    image.setAttribute('src', imageUrl);
    image.setAttribute('alt', caption || label);
    link.appendChild(image);
  }

  const linkLabel = document.createElement('strong');
  linkLabel.textContent = `▶ ${label} ansehen`;
  link.appendChild(linkLabel);
  figure.appendChild(link);

  if (caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.textContent = caption;
    figure.appendChild(figcaption);
  }

  return figure;
}

function getMeta(document: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const element = document.querySelector(selector);

    if (!element) continue;

    const value =
      element.getAttribute('content') ||
      element.getAttribute('datetime') ||
      element.textContent ||
      '';

    const cleaned = cleanText(value);

    if (cleaned) return cleaned;
  }

  return '';
}

function looksLikeNoise(element: Element): boolean {
  const text = cleanText(element.textContent || '').toLowerCase();

  if (!text || text.length > 1200) {
    return false;
  }

  const className =
    typeof element.className === 'string'
      ? element.className.toLowerCase()
      : '';

  const id = (element.id || '').toLowerCase();

  const attributes = `${className} ${id} ${text}`;

  return NOISE_WORDS.some((word) => attributes.includes(word));
}

function sanitizeArticleHtml(
  html: string,
  sourceUrl: string
): string {
  const parser = new DOMParser();

  const document = parser.parseFromString(
    html,
    'text/html'
  );

  document.querySelectorAll('iframe, video, audio, object, embed').forEach((media) => {
    const isIframe = media.tagName === 'IFRAME';
    const mediaUrl =
      media.getAttribute('src') ||
      media.querySelector('source[src]')?.getAttribute('src') ||
      media.getAttribute('data');
    const poster = media.getAttribute('poster') || '';
    const caption =
      cleanText(
        media.getAttribute('title') ||
          media.getAttribute('aria-label') ||
          media.querySelector('track[label]')?.getAttribute('label') ||
          ''
      );
    const url = mediaUrl
      ? absoluteUrl(mediaUrl, sourceUrl)
      : '';

    if (!url) {
      media.remove();
      return;
    }

    const label =
      media.tagName === 'AUDIO'
        ? 'Audio'
        : isVideoUrl(url) || media.tagName === 'VIDEO'
          ? 'Video'
          : 'Eingebetteten Inhalt';
    const mediaFigure = createMediaLink(
      document,
      url,
      label,
      poster ? absoluteUrl(poster, sourceUrl) : '',
      caption
    );

    if (mediaFigure) {
      media.replaceWith(mediaFigure);
    } else {
      media.remove();
    }
  });

  document
    .querySelectorAll(BLOCKED_SELECTORS.join(','))
    .forEach((element) => {
      element.remove();
    });

  const root = document.body;

  /*
   * Remove obvious noise blocks.
   */
  root.querySelectorAll('*').forEach((element) => {
    if (looksLikeNoise(element)) {
      element.remove();
    }
  });

  /*
   * Normalize images.
   */
  root.querySelectorAll('img').forEach((image) => {
    const source =
      image.getAttribute('src') ||
      image.getAttribute('data-src') ||
      image.getAttribute('data-lazy-src') ||
      image.getAttribute('data-original');

    if (source) {
      const safeSource = absoluteUrl(source, sourceUrl);
      if (safeSource) {
        image.setAttribute('src', safeSource);
      } else {
        image.remove();
        return;
      }
    }

    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.removeAttribute('loading');
    image.removeAttribute('class');
    image.removeAttribute('style');
  });

  /*
   * Remove scripts/events/tracking attributes.
   */
  root.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();

      if (
        name.startsWith('on') ||
        name.startsWith('data-') ||
        name === 'style' ||
        name === 'class' ||
        name === 'id' ||
        (name === 'href' &&
          !absoluteUrl(attribute.value, sourceUrl)) ||
        (name === 'src' &&
          !absoluteUrl(attribute.value, sourceUrl))
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        element.tagName === 'A' &&
        (name === 'href' || name === 'target')
      ) {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    });
  });

  /*
   * Only keep elements useful for an article.
   */
  const allowedTags = new Set([
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'BLOCKQUOTE',
    'UL',
    'OL',
    'LI',
    'STRONG',
    'B',
    'EM',
    'I',
    'A',
    'IMG',
    'FIGURE',
    'FIGCAPTION',
    'SOURCE',
    'BR',
    'PRE',
    'CODE',
    'TABLE',
    'THEAD',
    'TBODY',
    'TR',
    'TH',
    'TD',
    'HR',
  ]);

  root.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(
        ...Array.from(element.childNodes)
      );
    }
  });

  return root.innerHTML.trim();
}

function extractArticleFromHtml(
  html: string,
  sourceUrl: string
): Article {
  const parser = new DOMParser();

  const document = parser.parseFromString(
    html,
    'text/html'
  );

  document
    .querySelectorAll(BLOCKED_SELECTORS.join(','))
    .forEach((element) => {
      element.remove();
    });

  const candidates = Array.from(
    document.querySelectorAll(
      [
        'article',
        'main',
        '[role="main"]',
        '.article',
        '.post',
        '.entry-content',
        '.article-body',
        '.post-content',
        '.article-content',
        '.story-body',
      ].join(',')
    )
  );

  let bestCandidate: Element | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (looksLikeNoise(candidate)) {
      continue;
    }

    const paragraphs =
      candidate.querySelectorAll('p').length;

    const textLength =
      cleanText(candidate.textContent || '').length;

    const score =
      textLength +
      paragraphs * 500 +
      (candidate.tagName.toLowerCase() === 'article'
        ? 1500
        : 0);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  /*
   * Fallback: container with most paragraphs.
   */
  if (!bestCandidate) {
    const all = Array.from(
      document.querySelectorAll(
        'div, section'
      )
    );

    for (const candidate of all) {
      if (looksLikeNoise(candidate)) {
        continue;
      }

      const paragraphs =
        candidate.querySelectorAll('p').length;

      const textLength =
        cleanText(candidate.textContent || '').length;

      if (paragraphs < 2) {
        continue;
      }

      const score =
        textLength + paragraphs * 450;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }
  }

  const root =
    bestCandidate || document.body;

  root.querySelectorAll('*').forEach((element) => {
    if (looksLikeNoise(element)) {
      element.remove();
    }
  });

  const title =
    getMeta(document, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]) ||
    cleanText(
      document.querySelector('h1')?.textContent || ''
    ) ||
    cleanText(document.title) ||
    'Artikel';

  const author =
    getMeta(document, [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '[rel="author"]',
      '.author',
      '.byline',
    ]) || '';

  const date =
    getMeta(document, [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[name="publish-date"]',
      'time[datetime]',
      'time',
    ]) || '';

  const description =
    getMeta(document, [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) || '';

  const contentRoot =
    root.cloneNode(true) as HTMLElement;

  /*
   * Remove duplicate H1.
   */
  contentRoot
    .querySelectorAll('h1')
    .forEach((heading) => {
      if (
        cleanText(heading.textContent || '') ===
        title
      ) {
        heading.remove();
      }
    });

  const content = sanitizeArticleHtml(
    contentRoot.innerHTML,
    sourceUrl
  );

  return {
    title,
    author,
    date,
    description,
    content,
    sourceUrl,
  };
}

/*
 * First attempt:
 * direct browser request.
 *
 * This is completely local and does not
 * send the URL through another service.
 */
async function fetchDirect(
  url: string
): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    headers: {
      Accept:
        'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  return response.text();
}

/*
 * CORS fallback.
 *
 * Jina Reader fetches the website server-side
 * and returns cleaned article content.
 *
 * No API key is required for basic Reader usage.
 */
function markdownToHtml(rawText: string): string {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n');

  const htmlParts: string[] = [];
  let paragraphBuffer: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;

    const paragraphText = paragraphBuffer.join(' ');
    if (paragraphText.trim()) {
      htmlParts.push(
        `<p>${formatInlineMarkdown(paragraphText)}</p>`
      );
    }

    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listItems.length) return;

    htmlParts.push(
      `<ul>${listItems
        .map(
          (item) =>
            `<li>${formatInlineMarkdown(item)}</li>`
        )
        .join('')}</ul>`
    );
    listItems = [];
  };

  const flushEverything = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushEverything();
      continue;
    }

    if (line.startsWith('# ')) {
      flushEverything();
      htmlParts.push(
        `<h1>${formatInlineMarkdown(line.slice(2))}</h1>`
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushEverything();
      htmlParts.push(
        `<h2>${formatInlineMarkdown(line.slice(3))}</h2>`
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushEverything();
      htmlParts.push(
        `<h3>${formatInlineMarkdown(line.slice(4))}</h3>`
      );
      continue;
    }

    if (line === '---' || line === '***') {
      flushEverything();
      htmlParts.push('<hr>');
      continue;
    }

    if (line.startsWith('> ')) {
      flushEverything();
      htmlParts.push(
        `<blockquote>${formatInlineMarkdown(line.slice(2))}</blockquote>`
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      flushParagraph();
      listItems.push(`${line.replace(/^\d+\.\s+/, '')}`);
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushEverything();

  return htmlParts.join('');
}

function formatInlineMarkdown(value: string): string {
  let formatted = escapeHtml(value);

  formatted = formatted.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+["'][^)]*["'])?\)/g,
    '<img src="$2" alt="$1">'
  );

  formatted = formatted.replace(
    /\[\[([^\]]+)\]\]\((https?:\/\/[^)]+)\)/g,
    '<sup><a href="$2" target="_blank" rel="noopener noreferrer">[$1]</a></sup>'
  );

  formatted = formatted.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_match, label: string, url: string) =>
      isVideoUrl(url)
        ? `<figure><a href="${url}" target="_blank" rel="noopener noreferrer">▶ Video ansehen: ${label}</a></figure>`
        : `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );

  formatted = formatted.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );

  formatted = formatted.replace(
    /\*([^*]+)\*/g,
    '<em>$1</em>'
  );

  formatted = formatted.replace(
    /_([^_]+)_/g,
    '<em>$1</em>'
  );

  return formatted;
}

async function fetchViaReader(
  url: string
): Promise<Article> {
  const readerUrl =
    `https://r.jina.ai/${url}`;

  const response = await fetch(
    readerUrl,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'text/plain',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Reader HTTP ${response.status}`
    );
  }

  const text =
    await response.text();

  if (!text.trim()) {
    throw new Error(
      'Reader returned empty content.'
    );
  }

  const lines = text.split(/\r?\n/);
  const titleMatch = lines.find((line) =>
    line.startsWith('Title:')
  );
  const urlMatch = lines.find((line) =>
    line.startsWith('URL Source:')
  );
  const publishedMatch = lines.find((line) =>
    line.startsWith('Published Time:')
  );
  const markdownStart = lines.findIndex((line) =>
    line.trim().startsWith('Markdown Content:')
  );

  const contentText =
    markdownStart >= 0
      ? lines
          .slice(markdownStart + 1)
          .join('\n')
          .trim()
      : text.trim();

  const htmlContent = markdownToHtml(contentText);

  const title = titleMatch
    ? cleanText(titleMatch.replace(/^Title:\s*/, ''))
    : 'Artikel';

  const sourceUrl = urlMatch
    ? cleanText(urlMatch.replace(/^URL Source:\s*/, ''))
    : url;

  const date = publishedMatch
    ? formatReadableDate(
        cleanText(publishedMatch.replace(/^Published Time:\s*/, ''))
      )
    : '';

  return {
    title,
    author: '',
    date,
    description: '',
    content: htmlContent,
    sourceUrl,
  };
}

function escapeHtml(
  value: string
): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/*
 * Direct first, Reader fallback second.
 */
async function loadArticleFromUrl(
  url: string
): Promise<Article> {
  /*
   * Attempt 1:
   * direct browser fetch.
   */
  try {
    const html =
      await fetchDirect(url);

    const article =
      extractArticleFromHtml(
        html,
        url
      );

    if (
      article.content &&
      previewLength(article.content) >= 150
    ) {
      return article;
    }
  } catch {
    /*
     * Expected for many websites because
     * of CORS.
     */
  }

  /*
   * Attempt 2:
   * server-side Reader.
   */
  return fetchViaReader(url);
}

function waitForImage(
  image: HTMLImageElement
): Promise<void> {
  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
}

async function createPdf(
  article: Article
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth =
    pageWidth - margin * 2;

  let y = margin;

  const addPageIfNeeded = (
    height: number
  ) => {
    if (
      y + height >
      pageHeight - margin
    ) {
      pdf.addPage();
      y = margin;
    }
  };

  /*
   * Title
   */
  pdf.setTextColor(
    20,
    20,
    20
  );

  pdf.setFont(
    'helvetica',
    'bold'
  );

  pdf.setFontSize(21);

  const titleLines =
    pdf.splitTextToSize(
      article.title,
      contentWidth
    );

  titleLines.forEach(
    (line: string) => {
      addPageIfNeeded(10);

      pdf.text(
        line,
        margin,
        y
      );

      y += 9;
    }
  );

  y += 3;

  /*
   * Metadata
   */
  const metadata = [
    article.author,
    article.date,
  ]
    .filter(Boolean)
    .join(' · ');

  if (metadata) {
    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      100,
      100,
      100
    );

    pdf.text(
      metadata,
      margin,
      y
    );

    y += 7;
  }

  pdf.setDrawColor(
    210,
    210,
    210
  );

  pdf.line(
    margin,
    y,
    pageWidth - margin,
    y
  );

  y += 8;

  /*
   * Description
   */
  if (article.description) {
    pdf.setFont(
      'helvetica',
      'italic'
    );

    pdf.setFontSize(10.5);

    pdf.setTextColor(
      70,
      70,
      70
    );

    const lines =
      pdf.splitTextToSize(
        article.description,
        contentWidth
      );

    lines.forEach(
      (line: string) => {
        addPageIfNeeded(5);

        pdf.text(
          line,
          margin,
          y
        );

        y += 5;
      }
    );

    y += 5;
  }

  /*
   * Article content.
   */
  const parser =
    new DOMParser();

  const document =
    parser.parseFromString(
      `<div>${article.content}</div>`,
      'text/html'
    );

  const root =
    document.body
      .firstElementChild;

  if (!root) {
    throw new Error(
      'Artikel enthält keinen Inhalt.'
    );
  }

  const images =
    Array.from(
      root.querySelectorAll('img')
    );

  for (const image of images) {
    await waitForImage(
      image as HTMLImageElement
    );
  }

  const renderInlineText = (
    element: Element,
    options: {
      x?: number;
      width?: number;
      lineHeight: number;
      prefix?: string;
      color: [number, number, number];
    }
  ) => {
    const runs: Array<{ text: string; url?: string }> = [];

    const collectRuns = (node: Node, linkUrl?: string) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          runs.push({ text: node.textContent, url: linkUrl });
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const childElement = node as Element;
      const childUrl =
        childElement.tagName === 'A'
          ? absoluteUrl(
              childElement.getAttribute('href') || '',
              article.sourceUrl
            )
          : linkUrl;

      childElement.childNodes.forEach((child) =>
        collectRuns(child, childUrl || undefined)
      );
    };

    collectRuns(element);

    const x = options.x ?? margin;
    const maxX = x + (options.width ?? contentWidth);
    let currentX = x;
    const prefix = options.prefix || '';

    if (prefix) {
      pdf.setTextColor(...options.color);
      pdf.text(prefix, currentX, y);
      currentX += pdf.getTextWidth(prefix);
    }

    for (const run of runs) {
      const tokens = run.text.match(/\S+\s*|\s+/g) || [];

      for (const token of tokens) {
        if (currentX === x && /^\s+$/.test(token)) continue;

        const tokenWidth = pdf.getTextWidth(token);
        if (
          currentX > x &&
          currentX + tokenWidth > maxX &&
          !/^\s+$/.test(token)
        ) {
          y += options.lineHeight;
          addPageIfNeeded(options.lineHeight);
          currentX = x;
        }

        if (/^\s+$/.test(token) && currentX === x) continue;

        const href = run.url
          ? absoluteUrl(run.url, article.sourceUrl)
          : '';
        if (href) {
          pdf.setTextColor(30, 90, 170);
        } else {
          pdf.setTextColor(...options.color);
        }
        pdf.text(token, currentX, y);
        if (href && token.trim()) {
          pdf.link(currentX, y - 3.5, tokenWidth, 4.5, { url: href });
        }
        currentX += tokenWidth;
      }
    }

    y += options.lineHeight;
    pdf.setTextColor(...options.color);
  };

  const renderElement = (
    element: Element
  ) => {
    const tag =
      element.tagName;

    if (tag === 'BR') {
      y += 4;
      return;
    }

    if (
      tag === 'H1' ||
      tag === 'H2' ||
      tag === 'H3' ||
      tag === 'H4'
    ) {
      const text =
        cleanText(
          element.textContent ||
          ''
        );

      if (!text) return;

      const fontSize =
        tag === 'H1'
          ? 18
          : tag === 'H2'
            ? 16
            : tag === 'H3'
              ? 13
              : 11.5;

      y += 4;

      addPageIfNeeded(
        10
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(
        fontSize
      );

      pdf.setTextColor(
        25,
        25,
        25
      );

      const lines =
        pdf.splitTextToSize(
          text,
          contentWidth
        );

      lines.forEach(
        (line: string) => {
          addPageIfNeeded(7);

          pdf.text(
            line,
            margin,
            y
          );

          y +=
            tag === 'H2'
              ? 7
              : 6;
        }
      );

      y += 3;
      return;
    }

    if (tag === 'IMG') {
      const image =
        element as HTMLImageElement;

      if (
        !image.src ||
        !image.complete ||
        !image.naturalWidth
      ) {
        return;
      }

      try {
        const maxWidth =
          contentWidth;

        const maxHeight =
          90;

        let width =
          maxWidth;

        let height =
          (image.naturalHeight /
            image.naturalWidth) *
          width;

        if (
          height >
          maxHeight
        ) {
          height =
            maxHeight;

          width =
            (image.naturalWidth /
              image.naturalHeight) *
            height;
        }

        addPageIfNeeded(
          height + 8
        );

        const x =
          margin +
          (contentWidth -
            width) /
          2;

        pdf.addImage(
          image,
          'JPEG',
          x,
          y,
          width,
          height,
          undefined,
          'FAST'
        );

        y +=
          height + 6;
      } catch {
        /*
         * Image may be blocked by CORS.
         * The text article remains intact.
         */
      }

      return;
    }

    if (tag === 'A') {
      const image = element.querySelector('img');
      if (image) {
        renderElement(image);
      }

      const text = cleanText(element.textContent || '');
      const href = absoluteUrl(
        element.getAttribute('href') || '',
        article.sourceUrl
      );

      if (text && href) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(30, 90, 170);

        const lines = pdf.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          addPageIfNeeded(6);
          const linkWidth = pdf.getTextWidth(line);
          pdf.text(line, margin, y);
          pdf.link(margin, y - 3.5, linkWidth, 4.5, { url: href });
          y += 6;
        });

        y += 2;
        pdf.setTextColor(35, 35, 35);
      } else {
        Array.from(element.children).forEach(renderElement);
      }

      return;
    }

    if (
      tag === 'BLOCKQUOTE'
    ) {
      const text =
        cleanText(
          element.textContent ||
          ''
        );

      if (!text) return;

      const lines =
        pdf.splitTextToSize(
          text,
          contentWidth - 8
        );

      addPageIfNeeded(
        Math.max(
          15,
          lines.length * 5
        )
      );

      pdf.setDrawColor(
        150,
        150,
        150
      );

      pdf.setLineWidth(1);

      pdf.line(
        margin,
        y,
        margin,
        y +
        Math.max(
          12,
          lines.length * 5
        )
      );

      pdf.setFont(
        'helvetica',
        'italic'
      );

      pdf.setFontSize(
        10.5
      );

      pdf.setTextColor(
        80,
        80,
        80
      );

      lines.forEach(
        (line: string) => {
          addPageIfNeeded(5);

          pdf.text(
            line,
            margin + 5,
            y
          );

          y += 5;
        }
      );

      y += 5;
      return;
    }

    if (
      tag === 'UL' ||
      tag === 'OL'
    ) {
      Array.from(
        element.children
      ).forEach(
        (child, index) => {
          if (
            child.tagName !==
            'LI'
          ) {
            return;
          }

          if (!cleanText(child.textContent || '')) return;

          pdf.setFont(
            'helvetica',
            'normal'
          );

          pdf.setFontSize(
            10.5
          );

          pdf.setTextColor(
            35,
            35,
            35
          );

          const prefix =
            tag === 'OL'
              ? `${index + 1}. `
              : '• ';

          renderInlineText(child, {
            x: margin + 2,
            width: contentWidth - 5,
            lineHeight: 5,
            prefix,
            color: [35, 35, 35],
          });

          y += 1;
        }
      );

      y += 3;
      return;
    }

    if (
      tag === 'P' ||
      tag === 'PRE' ||
      tag === 'TD' ||
      tag === 'TH'
    ) {
      const text = cleanText(element.textContent || '');

      if (!text) return;

      const isBold =
        tag === 'TH';

      const isCode =
        tag === 'PRE';

      pdf.setFont(
        isBold
          ? 'helvetica'
          : isCode
            ? 'courier'
            : 'helvetica',
        isBold
          ? 'bold'
          : 'normal'
      );

      pdf.setFontSize(
        isCode
          ? 9
          : 10.5
      );

      pdf.setTextColor(
        35,
        35,
        35
      );

      renderInlineText(element, {
        lineHeight: isCode ? 4.5 : 5.2,
        color: [35, 35, 35],
      });

      y += 3;
      return;
    }

    if (
      tag === 'FIGCAPTION'
    ) {
      const text =
        cleanText(
          element.textContent ||
          ''
        );

      if (!text) return;

      pdf.setFont(
        'helvetica',
        'italic'
      );

      pdf.setFontSize(
        8.5
      );

      pdf.setTextColor(
        110,
        110,
        110
      );

      const lines =
        pdf.splitTextToSize(
          text,
          contentWidth
        );

      lines.forEach(
        (line: string) => {
          addPageIfNeeded(
            4.5
          );

          pdf.text(
            line,
            margin,
            y
          );

          y += 4.5;
        }
      );

      y += 4;
      return;
    }

    Array.from(
      element.children
    ).forEach(
      renderElement
    );
  };

  Array.from(
    root.children
  ).forEach(
    renderElement
  );

  /*
   * Footer.
   */
  const pageCount =
    pdf.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page++
  ) {
    pdf.setPage(page);

    pdf.setFont(
      'helvetica',
      'normal'
    );

    pdf.setFontSize(
      7.5
    );

    pdf.setTextColor(
      140,
      140,
      140
    );

    pdf.text(
      article.sourceUrl,
      margin,
      pageHeight - 9,
      {
        maxWidth:
          contentWidth - 20,
      }
    );
    pdf.link(
      margin,
      pageHeight - 12.5,
      contentWidth - 25,
      4.5,
      { url: article.sourceUrl }
    );

    pdf.text(
      `${page} / ${pageCount}`,
      pageWidth - margin,
      pageHeight - 9,
      {
        align: 'right',
      }
    );
  }

  const safeTitle =
    article.title
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim()
      .slice(0, 100) ||
    'artikel';

  pdf.save(
    `${safeTitle}.pdf`
  );
}

export default function ArticlePage() {
  const [url, setUrl] =
    useState('');

  const [article, setArticle] =
    useState<Article | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [creatingPdf, setCreatingPdf] =
    useState(false);

  const [error, setError] =
    useState('');

  const [usedFallback, setUsedFallback] =
    useState(false);

  const previewText =
    useMemo(() => {
      if (!article) {
        return '';
      }

      const parser =
        new DOMParser();

      const document =
        parser.parseFromString(
          article.content,
          'text/html'
        );

      return cleanText(
        document.body.textContent ||
        ''
      );
    }, [article]);

  const loadArticle = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setArticle(null);
    setUsedFallback(false);

    const normalizedUrl =
      url.trim();

    if (!normalizedUrl) {
      setError(
        'Bitte gib eine Artikel-URL ein.'
      );

      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(
          normalizedUrl
        );
    } catch {
      setError(
        'Bitte gib eine gültige URL ein.'
      );

      return;
    }

    if (
      ![
        'http:',
        'https:',
      ].includes(
        parsedUrl.protocol
      )
    ) {
      setError(
        'Nur HTTP- und HTTPS-URLs werden unterstützt.'
      );

      return;
    }

    setLoading(true);

    try {
      let directWorked =
        false;

      /*
       * First try local/direct processing.
       */
      try {
        const html =
          await fetchDirect(
            parsedUrl.href
          );

        const extracted =
          extractArticleFromHtml(
            html,
            parsedUrl.href
          );

        if (
          extracted.content &&
          previewLength(
            extracted.content
          ) >= 150
        ) {
          setArticle(
            extracted
          );

          directWorked = true;
        }
      } catch {
        directWorked = false;
      }

      /*
       * CORS fallback.
       */
      if (!directWorked) {
        const extracted =
          await fetchViaReader(
            parsedUrl.href
          );

        setArticle(
          extracted
        );

        setUsedFallback(
          true
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        'Der Artikel konnte nicht geladen werden. Die Zielseite konnte weder direkt noch über den Reader abgerufen werden. Prüfe die URL oder versuche es später erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf =
    async () => {
      if (!article) {
        return;
      }

      setCreatingPdf(true);
      setError('');

      try {
        await createPdf(
          article
        );
      } catch (err) {
        console.error(err);

        setError(
          'Das PDF konnte nicht erstellt werden.'
        );
      } finally {
        setCreatingPdf(false);
      }
    };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-10 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            PDF Unlocker
          </a>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              Artikel → PDF
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              Browser-basiert • Werbefrei • Privat
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Artikel sauber in ein PDF verwandeln
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
            Lade einen öffentlichen Artikel und exportiere ihn als lesbares, schlankes PDF –
            ohne Werbung, Navigation, Cookie-Banner und andere Ablenkungen.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)] backdrop-blur-sm sm:p-6">
          <form onSubmit={loadArticle} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="article-url" className="text-sm font-semibold text-slate-200">
                Artikel-URL
              </label>
              <span className="hidden text-xs text-slate-400 sm:inline-block">
                Direkt im Browser • Fallback optional
              </span>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                id="article-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/artikel"
                className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3.5 text-base text-white outline-none placeholder:text-slate-500 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || creatingPdf}
              />

              <button
                type="submit"
                disabled={loading || creatingPdf}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Artikel wird geladen…' : 'Artikel laden'}
              </button>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              Wenn die Seite CORS erlaubt, wird sie direkt im Browser verarbeitet. Andernfalls
              übernimmt automatisch der Reader-Fallback.
            </p>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          {usedFallback && (
            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              Diese Website erlaubt keinen direkten Browser-Abruf. Der Artikel wurde deshalb über
              den Reader-Fallback geladen. Die eingegebene URL wird dafür an den Reader-Dienst
              übertragen.
            </div>
          )}
        </section>

        {article && (
          <section className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <article className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
              <div className="mb-8 border-b border-slate-200 pb-6">
                <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
                  {article.title}
                </h2>

                <div className="mt-5 flex flex-col gap-2 text-sm text-slate-600 sm:text-base">
                  {article.sourceUrl && (
                    <p>
                      <span className="mr-2 font-semibold text-slate-800">Quelle:</span>
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="break-all text-blue-700 underline decoration-blue-300 underline-offset-2"
                      >
                        {article.sourceUrl}
                      </a>
                    </p>
                  )}

                  {(article.author || article.date) && (
                    <p>
                      <span className="mr-2 font-semibold text-slate-800">Veröffentlicht:</span>
                      <span>{[article.author, article.date].filter(Boolean).join(' · ')}</span>
                    </p>
                  )}
                </div>

                {article.description && (
                  <p className="mt-5 text-lg leading-8 text-slate-600">
                    {article.description}
                  </p>
                )}
              </div>

              <div
                className="prose prose-neutral max-w-none
                  prose-headings:font-black prose-headings:tracking-tight
                  prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl prose-h2:text-slate-900
                  prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl prose-h3:text-slate-900
                  prose-p:mb-6 prose-p:leading-8 prose-p:text-slate-700
                  prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline
                  prose-blockquote:my-7 prose-blockquote:border-l-4 prose-blockquote:border-sky-300 prose-blockquote:bg-slate-50 prose-blockquote:pl-5 prose-blockquote:py-1 prose-blockquote:text-slate-700 prose-blockquote:italic
                  prose-ul:my-6 prose-ul:space-y-2 prose-ul:text-slate-700
                  prose-ol:my-6 prose-ol:space-y-2 prose-ol:text-slate-700
                  prose-img:mx-auto prose-img:my-8 prose-img:max-h-[620px] prose-img:rounded-2xl prose-img:shadow-lg
                  prose-figcaption:mt-[-1.5rem] prose-figcaption:mb-6 prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-slate-500"
                dangerouslySetInnerHTML={{
                  __html: article.content,
                }}
              />

              {!previewText && (
                <p className="text-slate-500">Kein Artikeltext gefunden.</p>
              )}
            </article>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-8 lg:px-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-xs text-slate-500">
                  <div className="mb-1 font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Quelle
                  </div>

                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block max-w-xl truncate text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  >
                    {article.sourceUrl}
                  </a>
                </div>

                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={creatingPdf}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingPdf ? 'PDF wird erstellt…' : '↓ Sauberes PDF herunterladen'}
                </button>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">
          Die PDF-Erstellung erfolgt vollständig im Browser. Für blockierte Seiten kann der
          optionale Reader-Fallback verwendet werden.
        </footer>
      </div>
    </main>
  );
}

function previewLength(
  html: string
): number {
  const parser =
    new DOMParser();

  const document =
    parser.parseFromString(
      html,
      'text/html'
    );

  return cleanText(
    document.body.textContent ||
    ''
  ).length;
}
