import { svg } from "lit";

export const clockIcon = svg`
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"></circle>
    <path d="M8 4.6V8l2.3 1.5"></path>
  </svg>
`;

/**
 * The card badge is a clock, not an eye. It keeps the heavy circular weight
 * of the reference's view badge so the top-left corner still reads the same.
 */
export const badgeClockIcon = svg`
  <svg viewBox="0 0 34 34" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="17" cy="17" r="12.4" stroke-width="5.6"></circle>
    <path d="M17 9.8V17l5.7 3.7" stroke-width="5.2"></path>
  </svg>
`;

export const refreshIcon = svg`
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 11a8 8 0 1 0-2.3 5.7"></path>
    <path d="M20 4v7h-7"></path>
  </svg>
`;

export const gearIcon = svg`
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3.2"></circle>
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"></path>
  </svg>
`;

export const chevronDownIcon = svg`
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m4 6 4 4 4-4"></path>
  </svg>
`;

export const heartIcon = svg`
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path d="M8 13.4S2.2 10 2.2 6.3A3.1 3.1 0 0 1 8 4.5a3.1 3.1 0 0 1 5.8 1.8C13.8 10 8 13.4 8 13.4Z"></path>
  </svg>
`;

export const starIcon = svg`
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path d="m8 1.8 1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.3l-3.7 2 .8-4.2L2 6.2l4.2-.5L8 1.8Z"></path>
  </svg>
`;

export const closeIcon = svg`
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
    <path d="M6 6l12 12M18 6 6 18"></path>
  </svg>
`;

export const externalIcon = svg`
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 3H3v10h10V9.5"></path>
    <path d="M9 2.5h4.5V7"></path>
    <path d="M13.5 2.5 7 9"></path>
  </svg>
`;

export const infoIcon = svg`
  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
    <circle cx="10" cy="10" r="7.4"></circle>
    <path d="M10 9v4.4"></path>
    <circle cx="10" cy="6.3" r=".9" fill="currentColor" stroke="none"></circle>
  </svg>
`;

export const expandIcon = svg`
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m4 6 4 4 4-4"></path>
  </svg>
`;
