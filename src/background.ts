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

function drawImageMaps(previousSrcKey: string) {
  // Let's find images that have an usemap attribute
  const images = document.querySelectorAll<HTMLImageElement>(
    "img[usemap]:not([usemap=''])"
  );

  // For all of them, get the related map
  for (const image of Array.from(images)) {
    const mapName = image.useMap.replace("#", "");

    if (mapName === "") {
      // This should not happen with the selector used to query the images
      console.error("Got and image with empty usemap");
      break;
    }

    const map = document.querySelector<HTMLMapElement>(
      `map[name='${mapName}']`
    );

    if (map === null) {
      // A map was specified but we can't find it so we skip this image
      console.error("Could not find the map with name", mapName);
      break;
    }

    // Then, create a canvas and a context that has the same dimensions than the image
    const context = getContextFromImage(image);
    context.lineWidth = 2; // TODO: this could be an option to the extension

    // Now, get all the areas within the map
    const areas = map.querySelectorAll<HTMLAreaElement>("area");
    const alpha = 20; // TODO: this could be an option to the extension
    const color = "#FF0000"; // TODO: this could be an option to the extension

    context.fillStyle = color + alpha;
    context.strokeStyle = color;

    // And draw the corresponding shape
    for (const area of Array.from(areas)) {
      switch (area.shape) {
        case "rect":
          drawRect(area, context);
          break;

        case "circle":
          drawCircle(area, context);
          break;

        case "poly":
          drawPoly(area, context);
          break;

        default:
          console.error("Unsupported shape", area.shape);
      }

      context.stroke();
      context.fill();
    }

    // Save the previous image source
    image.dataset[previousSrcKey] = image.src;

    // Transform our canvas to a base64 string that can be displayed instead
    const quality = 1.0; // TODO: this could be an option to the extension
    image.src = context.canvas.toDataURL(undefined, quality);
  }

  function drawPoly(area: HTMLAreaElement, context: CanvasRenderingContext2D) {
    const matches = area.coords.matchAll(/(?<x>\d+),(?<y>\d+)/g);
    const [first, ...rest] = Array.from(matches);

    context.beginPath();
    context.moveTo(...extractCoords(first));

    for (const next of rest) {
      context.lineTo(...extractCoords(next));
    }

    context.closePath();
  }

  function extractCoords(match: RegExpMatchArray): [number, number] {
    if (match.groups === undefined) {
      throw new Error("Matched expression without groups");
    }

    return [asInt(match.groups["x"]), asInt(match.groups["y"])];
  }

  function drawCircle(
    area: HTMLAreaElement,
    context: CanvasRenderingContext2D
  ) {
    const [x, y, radius] = area.coords.split(",").map(asInt);

    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
  }

  function drawRect(area: HTMLAreaElement, context: CanvasRenderingContext2D) {
    const [x1, y1, x2, y2] = area.coords.split(",").map(asInt);
    const w = x2 - x1;
    const h = y2 - y1;

    context.rect(x1, y1, w, h);
  }

  function asInt(value: string): number {
    const result = parseInt(value, 10);

    if (isNaN(result)) {
      throw new Error("Value is not a string representation of a number");
    }

    return result;
  }

  function getContextFromImage(
    image: HTMLImageElement
  ): CanvasRenderingContext2D {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext("2d");

    if (context === null) {
      // Whoops, if this occurs we can't continue further
      throw new Error("Could not get a 2d context from canvas");
    }

    // Draw the image using the current size of the canvas
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return context;
  }
}

function restoreImage(previousSrcKey: string) {
  // Let's find images that have an usemap attribute
  const images = document.querySelectorAll<HTMLImageElement>(
    "img:not([usemap=''])"
  );

  // For all of them, get the related map
  for (const image of Array.from(images)) {
    const src = image.dataset[previousSrcKey];

    if (src !== undefined) {
      image.src = src;
      delete image.dataset[previousSrcKey];
    }
  }
}

const PREVIOUS_SRC_KEY = "__previous"; // TODO: this could be an option to the extension

chrome.action.onClicked.addListener(async (tab) => {
  if (
    tab.url === undefined ||
    tab.url.includes("chrome://") ||
    tab.id === undefined
  ) {
    return;
  }

  const target = { tabId: tab.id };
  const prevState = await chrome.action.getBadgeText(target);
  const nextState = isBadgeState(prevState)
    ? cycleState(prevState)
    : DEFAULT_BADGE_STATE;

  if (nextState === "ON") {
    await chrome.scripting.executeScript({
      target,
      func: drawImageMaps,
      args: [PREVIOUS_SRC_KEY],
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "ON" });
  } else if (nextState === "OFF") {
    await chrome.scripting.executeScript({
      target,
      func: restoreImage,
      args: [PREVIOUS_SRC_KEY],
    });
  }

  await chrome.action.setBadgeText({
    ...target,
    text: nextState,
  });
});
