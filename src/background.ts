const BADGE_STATES = ["ON", "OFF"] as const;
type BadgeState = typeof BADGE_STATES[number];
const DEFAULT_BADGE_STATE: BadgeState = "OFF";

function isBadgeState(value: unknown): value is BadgeState {
  return BADGE_STATES.includes(value as BadgeState);
}

function cycleState(current: BadgeState): BadgeState {
  const index = BADGE_STATES.indexOf(current);
  const next = (index + 1 + BADGE_STATES.length) % BADGE_STATES.length;

  return BADGE_STATES[next];
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: DEFAULT_BADGE_STATE,
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  const prevState = await chrome.action.getBadgeText({ tabId });
  const nextState = isBadgeState(prevState)
    ? cycleState(prevState)
    : DEFAULT_BADGE_STATE;

  await chrome.action.setBadgeText({
    tabId,
    text: nextState,
  });
});
