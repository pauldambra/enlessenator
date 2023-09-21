/**
 * there's a div in which there will be the title "News feed posts"
 * inside that is a list of divs
 * each of those has nested content that might contain "Suggested for you"
 * we can hide any of those
 */

posthog.init('phc_mqsINP8dwuAugY5uXTVwcTEGxQgr3djkryng2Z94MsS',{api_host:'https://app.posthog.com',persistence:'localStorage'})

function getTextWithoutChildren(el) {
  const t = Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join("");

  return t;
}

const seenElements = new Set();

function findAllDivsWithText(element, targetText) {
  const matches = {
    suggestedForYouMatched: [],
    sponsereds: [],
  };

  let elementMatched = false;

  if (!seenElements.has(element)) {
    seenElements.add(element);

    if (
      element.tagName === "SPAN" &&
      getTextWithoutChildren(element).includes(targetText)
    ) {
      elementMatched = true;
      matches.suggestedForYouMatched.push(element);
    } else if (element.tagName === "A") {
      element.setAttribute("data-seen", element.getAttribute("href"));
      if (element.getAttribute("href").startsWith("/ads")) {
        elementMatched = true;
        matches.sponsereds.push(element);
      }
    }
  }

  if (!elementMatched) {
    for (let child of element.children) {
      childMatches = findAllDivsWithText(child, targetText);
      matches.suggestedForYouMatched = matches.suggestedForYouMatched.concat(
        childMatches.suggestedForYouMatched
      );
      matches.sponsereds = matches.sponsereds.concat(childMatches.sponsereds);
    }
  }

  return matches;
}

function hideSuggested(element) {
  let parentElement = element.parentElement;

  while (
    parentElement.hasAttribute("class") &&
    parentElement !== document.body
  ) {
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
    console.log("candidate", {
      tn: candidate.tagName,
      hasC: candidate.hasAttribute("class"),
      seekingFirst,
      seekingSecond,
    });
    if (candidate.tagName === "DIV" && !candidate.hasAttribute("class")) {
      seekingFirst ? (seekingFirst = false) : (seekingSecond = false);
    }
  } while (seekingFirst && seekingSecond && candidate !== document.body);

  candidate.style.backgroundColor = "red";
//   parentElement.innerHTML = `
//   <div style="background-color:#d1d1e0;padding-left: 8px;padding: 4px 8px;text-align: center;font-weight: 700;">
//     Hidden sponsored nonsense
//   </div>
//   `;
  candidate.setAttribute("data-enlessenated", true);
}

let hidden = {suggestedForYou: 0, sponsereds: 0};

function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const onScroll = debounce(function () {
  const matches = findAllDivsWithText(document.body, "Suggested for you");

  matches.suggestedForYouMatched.forEach((suggested) => {
    hideSuggested(suggested);
    hidden.suggestedForYou++;
    posthog.capture('hidden_suggested')
  });

  matches.sponsereds.forEach((sponsored) => {
    hideSponsored(sponsored);
    hidden.sponsereds++;
    posthog.capture('hidden_sponsored')
  });

  console.log("total hidden", hidden);
}, 150);

window.addEventListener("scroll", onScroll);
