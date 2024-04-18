async function getColourFromServer(emailData) {
  try {
    //const response = await fetch('https://europe-west2-lateral-berm-410914.cloudfunctions.net/test', {
      const response = await fetch('http://127.0.0.1:5000/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    const data = await response.json();
    console.log('Response data:', data); // Log the actual response data
    return data;
  } catch (error) {
    console.error('Failed to fetch colour from server:', error);
    return {}; // Return an empty object to prevent TypeError in the calling code
  }
}

function processLinkData(links) {
  // Initialize the variables to keep the sum of all attributes across all links
  const sumData = {
    nb_links: links.length,
    length_url: 0,
    length_hostname: 0,
    nb_dots: 0,
    nb_hyphens: 0,
    nb_at: 0,
    nb_qm: 0,
    nb_and: 0,
    nb_eq: 0,
    nb_tilde: 0,
    nb_percent: 0,
    nb_slash: 0,
    nb_star: 0,
    nb_colon: 0,
    nb_comma: 0,
    nb_semicolon: 0,
    nb_dollar: 0,
    nb_www: 0,
    nb_com: 0,
    nb_dslash: 0,
    ratio_digits_url: 0,
    ratio_digits_host: 0,
    tld_in_path: 0,
  };

  // Calculate the values for each link and add to the cumulative count
  links.forEach(link => {
    const url = new URL(link);
    const hostname = url.hostname;
    const path = url.pathname;

    sumData.length_url += link.length;
    sumData.length_hostname += hostname.length;
    sumData.nb_dots += (link.split(".").length - 1);
    sumData.nb_hyphens += (link.split("-").length - 1);
    sumData.nb_at += (link.split("@").length - 1);
    sumData.nb_qm += (link.split("?").length - 1);
    sumData.nb_and += (link.split("&").length - 1);
    sumData.nb_eq += (link.split("=").length - 1);
    sumData.nb_tilde += (link.split("~").length - 1);
    sumData.nb_percent += (link.split("%").length - 1);
    sumData.nb_slash += (link.split("/").length - 1);
    sumData.nb_star += (link.split("*").length - 1);
    sumData.nb_colon += (link.split(":").length - 1);
    sumData.nb_comma += (link.split(",").length - 1);
    sumData.nb_semicolon += (link.split(";").length - 1);
    sumData.nb_dollar += (link.split("$").length - 1);
    sumData.nb_www += (hostname.startsWith('www.') ? 1 : 0);
    sumData.nb_com += (hostname.endsWith('.com') ? 1 : 0);
    sumData.nb_dslash += (link.split("//").length - 1);
    sumData.ratio_digits_url += (link.replace(/\D/g, '').length) / link.length;
    sumData.ratio_digits_host += (hostname.replace(/\D/g, '').length) / hostname.length;
    sumData.tld_in_path += (path.includes('.com') ? 1 : 0);
  });

  // Convert ratio sums to averages
  sumData.ratio_digits_url /= sumData.nb_links;
  sumData.ratio_digits_host /= sumData.nb_links;

  return sumData;
}

console.log("Email Service Detector is running.");

if (window.location.hostname.includes("yahoo.com")) {
    console.log("Yahoo detected");

    function getIdFromHref(href) {
      // Split the href by slashes
      const parts = href.split('/');
      if (parts.length >= 6) {
        const idPart = parts[5];
        const queryParamIndex = idPart.indexOf('?');
        const id = queryParamIndex !== -1 ? idPart.substring(0, queryParamIndex) : idPart;
        return id;
      } else {
        // If there are not enough parts, return null to indicate no ID was found
        console.log("Email ID was not extracted correctly.")
        console.log("Consider rewriting getIdFromHref to be more robust")
        return null;
      }
    }
    
    function saveClassificationToStorage(id, colour) {
      const emailClassification = {};
      emailClassification[id] = colour;
      chrome.storage.local.set(emailClassification, function() {
        if (chrome.runtime.lastError) {
          console.error('Error setting colour classification:', chrome.runtime.lastError);
        }
      });
    }

    function getExclamationCount(emailContent) {
      return (emailContent.match(/!/g) || []).length;
    }
    
    function getColourBasedOnExclamationCount(count) {
      // Define thresholds for exclamation counts
      const greenThreshold = 1; // Example threshold
      const amberThreshold = 3; // Example threshold
    
      if (count <= greenThreshold) return '#00ff00'; // green
      if (count <= amberThreshold) return '#ffbf00'; // amber
      return '#ff0000'; // red
    }
    
    function updateNotificationBoxColour(notificationBox, emailContent) {
      const exclamationCount = getExclamationCount(emailContent);
      const colour = getColourBasedOnExclamationCount(exclamationCount);
      notificationBox.style.backgroundColour = colour;
    }
    
    async function fetchEmailContentAndAnalyse(href, notificationBox) {
      const id = getIdFromHref(href);
    
      // Attempt to get the stored color classification
      const result = await new Promise(resolve => chrome.storage.local.get([id], resolve));
      if (result.hasOwnProperty(id)) {
        notificationBox.style.backgroundColor = result[id];
        return; // Exit if we already have a color stored
      }
    
      try {
        // Fetch and process the email content
        const response = await fetch(href);
        const htmlContent = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
    
        // Extract the email title
        const titleElement = doc.querySelector('span[data-test-id="message-group-subject-text"]');
        const title = titleElement ? titleElement.textContent : 'No title';
    
        // Extract the email sender
        const senderElement = doc.querySelector('[data-test-id="message-to"]');
        const sender = senderElement ? senderElement.textContent : 'No sender';
    
        // Find and process the content section
        const contentElement = doc.querySelector('div[data-test-id="message-view-body-content"]');
        let contentHtml = contentElement ? contentElement.innerHTML : '';
    
    
        // Find the next occurrence of the "<!DOCTYPE html>" and remove everything before and including it
        const doctypeIndex = contentHtml.indexOf('<!DOCTYPE html>');
        if (doctypeIndex !== -1) {
        contentHtml = contentHtml.substring(contentHtml.indexOf('>', doctypeIndex) + 1);
        }
    
        // Find the first occurrence of the "</html>" and remove everything after and including that string
        const htmlEndIndex = contentHtml.indexOf('</html>');
        if (htmlEndIndex !== -1) {
        contentHtml = contentHtml.substring(0, htmlEndIndex);
        }

        // Further clean up of the contentHtml
        let textContent = contentHtml
        .replace(/<style[^>]*>.*?<\/style>/gs, '') // Remove style content
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/gi, '') // Remove all occurrences of "&nbsp;"
        .replace(/^\s*$(?:\r\n?|\n)/gm, ''); // Remove lines that only contain whitespace

    // Compile the cleaned data into an object for the server
    const emailData = {
      title: title,
      sender: sender,
      links: Array.from(new DOMParser().parseFromString(contentHtml, 'text/html').links).map(link => link.href),
      content: textContent
    };

    console.log(`Email data for ${id}:`, emailData);
    const colourResponse = await getColourFromServer(emailData);
    // console.log(`Colour response for ${id}:`, colourResponse);

    const colour = colourResponse.colour || '#000000'; // Fallback to default colour if undefined
    notificationBox.style.backgroundColor = colour;
    // console.log(`Applied colour for ${id}:`, colour);

    saveClassificationToStorage(id, colour);
  } catch (error) {
    // console.error(`Error in fetchEmailContentAndAnalyse for ${id}:`, error);
    notificationBox.style.backgroundColor = '#000000'; // Default colour in case of error
  }
}

        function insertNotifications() {
          var emailListContainer = document.querySelector("ul[role='list']");
          if (emailListContainer) {
            var listItems = emailListContainer.querySelectorAll("li");
            listItems.forEach(function(item) {
              if (!item.querySelector('.email-safety-notification')) {
                var notificationBox = document.createElement("div");
                notificationBox.className = 'email-safety-notification';
                var isEmailItem = item.querySelector("[data-test-id='message-list-item']");
                var isSeparator = item.querySelector("[data-test-id='time-chunk-separator']");
                if (isEmailItem) {
                  notificationBox.style.position = 'absolute';
                  notificationBox.style.top = '50%';
                  notificationBox.style.left = '0';
                  notificationBox.style.width = '5px';
                  notificationBox.style.height = '22px';
                  notificationBox.style.transform = 'translateY(-50%)';
                  notificationBox.style.zIndex = '0';
                  item.insertBefore(notificationBox, item.firstChild);

                  // Fetch email content
                  let emailHref = item.querySelector('a').getAttribute('href');
                  fetchEmailContentAndAnalyse(emailHref, notificationBox);
              } else if (isSeparator) {
                  notificationBox.style.display = 'none';
              }
            }
        });
      }
    }

    var observer; // Declare observer at a higher scope

    // Function to start observing changes
    function startObserving() {
        var emailListContainer = document.querySelector("ul[role='list']");
        if (emailListContainer && !observer) {
            // Options for the observer (which mutations to observe)
            var config = { childList: true, subtree: true, attributes: true, attributeOldValue: true };

            // Create an observer instance if it doesn't exist
            observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' || mutation.type === 'attributes') {
                        insertNotifications();
                    }
                });
            });
            observer.observe(emailListContainer, config);
        } else if (observer) {
            // If the observer exists, but the container is gone, disconnect it
            observer.disconnect();
            observer = null; // stop observing
            startObserving();
        }
    }

    // Continuously check if the email list container is present and if not, attempt to reattach the observer
    setInterval(startObserving, 1000);
    
    // Call it immediately to attach for the first time
    startObserving();
}