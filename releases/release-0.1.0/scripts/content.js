/**
 * there's a div in which there will be the title "News feed posts"
 * inside that is a list of divs
 * each of those has nested content that might contain "Suggested for you"
 * we can hide any of those
 */

window.posthog.init("phc_mqsINP8dwuAugY5uXTVwcTEGxQgr3djkryng2Z94MsS", {
  api_host: "https://app.posthog.com",
  persistence: "localStorage",
});

function getTextWithoutChildren(el) {
  return Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join("");
}

const candidateAdWatchers = [];

setInterval(() => {
  candidateAdWatchers.forEach((candidate) => {
    if (candidate.getAttribute("href") !== "#") {
      candidateAdWatchers.splice(candidateAdWatchers.indexOf(candidate), 1);
      onElementAddedToDOM(candidate);
    }
  });
}, 1000);

function searchDOMForNonsense(element, level = 0) {
  const matches = {
    suggestedForYouMatched: [],
    sponsereds: [],
  };

  let elementMatched = false;

  if (
    element.getAttribute("data-seen") !== "tested" ||
    element.getAttribute("data-seen") === "#"
  ) {
    element.setAttribute("data-seen", "tested");

    const localText = getTextWithoutChildren(element);
    if (localText.includes("Suggested for you")) {
      elementMatched = true;
      matches.suggestedForYouMatched.push(element);
    } else if (element.tagName === "A") {
      element.setAttribute("data-seen", element.getAttribute("href"));
      if (
        // ads start out with no link and the link is added without
        // triggering the mutation observer... sneaky facebook
        element.getAttribute("href") === "#"
      ) {
        candidateAdWatchers.push(element);
      }
    }
  }

  if (!elementMatched) {
    for (let child of Array.from(element.children || [])) {
      const childMatches = searchDOMForNonsense(child, level + 1);
      matches.suggestedForYouMatched = matches.suggestedForYouMatched.concat(
        childMatches.suggestedForYouMatched,
      );
      matches.sponsereds = matches.sponsereds.concat(childMatches.sponsereds);
    }
  }

  return matches;
}

function hideSuggested(element) {
  let parentElement = element.parentElement;

  let divsWithNoClass = 0;

  // suggested now has three divs with no class at the top level.
  while (divsWithNoClass < 2 && parentElement !== document.body) {
    while (
      parentElement.hasAttribute("class") &&
      parentElement !== document.body
    ) {
      divsWithNoClass = 0;
      parentElement = parentElement.parentElement;
    }
    divsWithNoClass++;

    parentElement = parentElement.parentElement;
  }

  parentElement.innerHTML = `
  <div style="background-color:#d1d1e0;padding-left: 8px;padding: 4px 8px;text-align: center;font-weight: 700;">
    Hidden suggested nonsense
  </div>
  `;
  parentElement.setAttribute("data-enlessenated", true);
}

function hideSponsored(element) {
  let candidate = element;

  // find a parent with no class and then match the next parent with no class
  let seekingFirst = true;
  let seekingSecond = true;

  do {
    candidate = candidate.parentElement;
    if (candidate.tagName === "DIV" && !candidate.hasAttribute("class")) {
      seekingFirst ? (seekingFirst = false) : (seekingSecond = false);
    }
  } while (seekingFirst && seekingSecond && candidate !== document.body);

  candidate.innerHTML = `
    <div style="background-color:#d1d1e0;padding-left: 8px;padding: 4px 8px;text-align: center;font-weight: 700;">
      Hidden ads nonsense
    </div>
    `;
  candidate.setAttribute("data-enlessenated", true);
}

let hidden = { suggestedForYou: 0, sponsereds: 0 };

const seekUpToClasslessParent = function (element) {
  let candidate = element;

  while (
    candidate.hasAttribute &&
    typeof candidate.hasAttribute === "function" &&
    candidate.hasAttribute("class") &&
    candidate !== document.body
  ) {
    candidate = candidate.parentElement;
  }

  return candidate;
};

const onElementAddedToDOM = function (element) {
  const candidate = seekUpToClasslessParent(element);
  const matches = searchDOMForNonsense(candidate);

  matches.suggestedForYouMatched.forEach((suggested) => {
    hideSuggested(suggested);
    hidden.suggestedForYou++;
    window.posthog.capture("hidden_suggested");
  });

  matches.sponsereds.forEach((sponsored) => {
    hideSponsored(sponsored);
    hidden.sponsereds++;
    window.posthog.capture("hidden_sponsored");
  });
};

// listen to the entire body, since the content classes and ids are dynamic
const targetNode = document.body;

const config = { attributes: true, childList: true, subtree: true };

const callback = (mutationList) => {
  const attributeChangeIgnoreList = ["data-seen"];
  const attributeChangeTagAllowList = ["A", "DIV", "SPAN"];

  for (const mutation of mutationList) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        onElementAddedToDOM(node);
      });
    } else if (mutation.type === "attributes") {
      if (
        attributeChangeTagAllowList.includes(mutation.target.tagName) &&
        !attributeChangeIgnoreList.includes(mutation.attributeName)
      ) {
        onElementAddedToDOM(mutation.target);
      }
    } else {
      //console.log("wa", mutation);
    }
  }
};

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);
