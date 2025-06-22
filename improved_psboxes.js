javascript:(async () => {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const MAX_CONCURRENT_REQUESTS = 10;
  const DELAY_BETWEEN_BATCHES = 2000;
  const baseUrl = "https://inbound-api-inbound.noon.team/reports/";
  const pendingUrl = `${baseUrl}pending_asn?warehouse_code=W00000004A&format=html`;

  // Create status div
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px;z-index:1000;border-radius:5px;';
  statusDiv.textContent = "Code initiated... Processing requests.";
  document.body.appendChild(statusDiv);

  // Create progress bar
  const progressBar = document.createElement('progress');
  progressBar.max = 100;
  progressBar.value = 0;
  progressBar.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:999;';
  document.body.appendChild(progressBar);

  const errorLog = [];
  let csvContent = "";
  let headersExtracted = false;

  const logError = (url, status, statusText) => {
    console.error(`Error fetching URL: ${url} (${status} ${statusText})`);
    errorLog.push({ url, status, statusText });
  };

  const fetchWithRetry = async (url, retries = 3, backoff = 500) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
        logError(url, res.status, res.statusText);
      } catch (e) {
        logError(url, 0, e.message);
      }
      await delay(backoff * (i + 1));
    }
    return null;
  };

  try {
    const pendingRes = await fetchWithRetry(pendingUrl);
    if (!pendingRes) {
      console.error("Failed to fetch pending ASNs.");
      statusDiv.textContent += " Error fetching pending ASNs.";
      return;
    }

    const pendingHtml = await pendingRes.text();
    const parser = new DOMParser();
    const pendingDoc = parser.parseFromString(pendingHtml, 'text/html');
    const table = pendingDoc.querySelector('table');

    if (!table) {
      console.error("No table found in pending ASN response.");
      statusDiv.textContent += " No table found in pending ASN response.";
      return;
    }

    const asnNumbers = Array.from(table.querySelectorAll('tr:nth-child(n+2) td:first-child')).map(td => td.textContent.trim());
    if (asnNumbers.length === 0) {
      console.error("No ASN numbers found.");
      statusDiv.textContent += " No ASN numbers found.";
      return;
    }

    const urls = [];
    for (const asnNr of asnNumbers) {
      const boxesUrl = `${baseUrl}asn_boxes?asn_nr=${asnNr}&format=html`;
      const boxesRes = await fetchWithRetry(boxesUrl);
      if (!boxesRes) continue;

      const boxesHtml = await boxesRes.text();
      const boxesDoc = parser.parseFromString(boxesHtml, 'text/html');
      const boxTable = boxesDoc.querySelector('table');

      if (!boxTable) {
        logError(boxesUrl, 404, "No table found");
        continue;
      }

      const awbNumbers = Array.from(boxTable.querySelectorAll('tr:nth-child(n+2) td:nth-child(2)')).map(td => td.textContent.trim());
      urls.push(...awbNumbers.map(awb => `${baseUrl}box_status?awb_nr=${awb}&format=html`));
    }

    const totalRequests = urls.length;
    if (totalRequests === 0) {
      console.error("No URLs generated for box status.");
      statusDiv.textContent += " No URLs generated for box status.";
      return;
    }
    progressBar.max = totalRequests;

    const processBatch = async batch => {
      const results = await Promise.all(
        batch.map(async url => {
          const res = await fetchWithRetry(url);
          if (res) {
            const html = await res.text();
            const doc = parser.parseFromString(html, 'text/html');
            const tbl = doc.querySelector('table');

            if (tbl) {
              const rows = tbl.querySelectorAll('tr');
              if (!headersExtracted && rows.length > 0) {
                const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
                csvContent += headers.join('\t') + '\n';
                headersExtracted = true;
              }
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                csvContent += Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim()).join('\t') + '\n';
              }
            }
          }
          progressBar.value++;
        })
      );
      await delay(DELAY_BETWEEN_BATCHES);
    };

    for (let i = 0; i < urls.length; i += MAX_CONCURRENT_REQUESTS) {
      const batch = urls.slice(i, i + MAX_CONCURRENT_REQUESTS);
      await processBatch(batch);
    }

    console.log("All requests completed.");
    console.log("Error Log:", errorLog);
    console.log("CSV Content:", csvContent);

    if (csvContent) {
      const csvFile = new Blob([csvContent], { type: "text/tab-separated-values" });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(csvFile);
      downloadLink.download = "box_status_data.tsv";
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      statusDiv.textContent += " Download completed successfully.";
    } else {
      statusDiv.textContent += " No data to download.";
    }
  } catch (error) {
    console.error("An unexpected error occurred:", error.message);
    statusDiv.textContent += ` Error: ${error.message}`;
  } finally {
    setTimeout(() => {
      progressBar.remove();
      statusDiv.remove();
    }, 10000); // Keep the message for 10 seconds before removing
  }
})();
